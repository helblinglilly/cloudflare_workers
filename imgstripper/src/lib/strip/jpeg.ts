/**
 * JPEG metadata stripper.
 *
 * JPEG files are a sequence of markers. Each marker is 0xFF followed by a
 * one-byte marker type. Most markers (except stand-alone ones like SOI, EOI,
 * RST*) are followed by a two-byte big-endian length that includes the two
 * length bytes themselves but NOT the two marker bytes.
 *
 * Metadata lives almost exclusively in APPn segments (0xFF 0xE0–0xFF 0xEF):
 *   APP0  (0xE0) – JFIF / JFXX thumbnail header  → KEEP (display compat)
 *   APP1  (0xE1) – EXIF / XMP                    → DROP
 *   APP2  (0xE2) – ICC colour profile / FlashPix  → KEEP ICC, DROP rest
 *   APP3–APP15   – various vendor metadata        → DROP
 *   COM   (0xFE) – JPEG comment                   → DROP
 *
 * Everything else (SOF*, DHT, DQT, SOS + entropy data, DRI, RST*, EOI) is
 * image data and is copied verbatim.
 */

const MARKER_SOI = 0xd8; // Start Of Image  (stand-alone)
const MARKER_EOI = 0xd9; // End Of Image     (stand-alone)
const MARKER_SOS = 0xda; // Start Of Scan   (followed by entropy-coded data)
const MARKER_COM = 0xfe; // Comment          → drop

// APP0–APP15 span 0xE0–0xEF
const MARKER_APP0 = 0xe0;
const MARKER_APP1 = 0xe1;
const MARKER_APP2 = 0xe2;
const MARKER_APP15 = 0xef;

// Magic bytes that identify an ICC_PROFILE chunk inside APP2
const ICC_PROFILE_MAGIC = "ICC_PROFILE\0";

/** Return true if this APP2 segment carries an ICC colour profile. */
function isIccApp2(data: Uint8Array, segStart: number, segLength: number): boolean {
  // segStart points to the byte after the 0xFF 0xE2 marker bytes.
  // The segment length field is at segStart, value = segLength (incl. the 2 len bytes).
  // Payload starts at segStart + 2.
  const payloadOffset = segStart + 2; // skip the 2-byte length field
  const payloadLen = segLength - 2;
  if (payloadLen < ICC_PROFILE_MAGIC.length) return false;

  for (let i = 0; i < ICC_PROFILE_MAGIC.length; i++) {
    if (data[payloadOffset + i] !== ICC_PROFILE_MAGIC.charCodeAt(i)) return false;
  }
  return true;
}

/**
 * Strip all metadata from a JPEG file buffer.
 *
 * @param input  Raw JPEG bytes
 * @returns      Clean JPEG bytes with no EXIF / XMP / IPTC / comments
 */
export function stripJpeg(input: Uint8Array): Uint8Array {
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const len = input.byteLength;

  // Validate SOI
  if (len < 2 || input[0] !== 0xff || input[1] !== MARKER_SOI) {
    throw new Error("Not a valid JPEG file (missing SOI marker)");
  }

  // Collect segments we want to keep as [start, end) byte ranges of the
  // original buffer.
  const keepRanges: Array<[number, number]> = [];

  // Always keep the SOI marker (bytes 0–1)
  keepRanges.push([0, 2]);

  let offset = 2; // current read position, just after SOI

  while (offset < len) {
    // Every marker starts with 0xFF. Skip any fill bytes (0xFF padding).
    if (input[offset] !== 0xff) {
      throw new Error(`Expected 0xFF marker byte at offset ${offset}, got 0x${input[offset].toString(16)}`);
    }

    // Skip consecutive 0xFF fill bytes
    while (offset < len && input[offset] === 0xff) {
      offset++;
    }
    if (offset >= len) break;

    const markerType = input[offset];
    offset++; // advance past the marker type byte

    // --- Stand-alone markers (no length, no payload) ---
    if (
      markerType === MARKER_EOI ||
      (markerType >= 0xd0 && markerType <= 0xd7) // RST0–RST7
    ) {
      // These are 2 bytes total (0xFF + type). The RST markers appear inside
      // entropy-coded data and we'll never actually encounter them here
      // because SOS gobbles everything up to EOI below. EOI ends the file.
      keepRanges.push([offset - 2, offset]);
      if (markerType === MARKER_EOI) break;
      continue;
    }

    // All other markers have a 2-byte length field
    if (offset + 2 > len) {
      throw new Error(`Truncated JPEG: not enough bytes for segment length at offset ${offset}`);
    }
    const segLength = view.getUint16(offset, false /* big-endian */);
    // segLength includes itself (2 bytes) but not the 2 marker bytes.
    const segEnd = offset + segLength; // exclusive end of this segment
    const markerStart = offset - 2; // inclusive start (the 0xFF byte)

    if (segEnd > len) {
      throw new Error(`Segment at offset ${markerStart} claims length ${segLength} but file is only ${len} bytes`);
    }

    if (markerType === MARKER_SOS) {
      // SOS is followed by the entropy-coded bitstream which runs until EOI
      // (possibly interrupted by RST markers, all of which are 2 bytes with
      // no length field). We copy everything from the SOS marker to the end
      // of the file in one chunk — EOI is included.
      keepRanges.push([markerStart, len]);
      break;
    }

    // --- Decide whether to keep or drop this segment ---
    let keep = true;

    if (markerType === MARKER_COM) {
      // JPEG comment — drop
      keep = false;
    } else if (markerType >= MARKER_APP0 && markerType <= MARKER_APP15) {
      if (markerType === MARKER_APP0) {
        // JFIF / JFXX — keep for compatibility
        keep = true;
      } else if (markerType === MARKER_APP2) {
        // Keep only if it's an ICC_PROFILE chunk; drop Flashpix / other APP2
        keep = isIccApp2(input, offset, segLength);
      } else {
        // APP1 (EXIF/XMP), APP3–APP15 — drop all
        keep = false;
      }
    }

    if (keep) {
      keepRanges.push([markerStart, segEnd]);
    }

    offset = segEnd;
  }

  // Calculate total output size
  let totalSize = 0;
  for (const [start, end] of keepRanges) {
    totalSize += end - start;
  }

  // Assemble output buffer
  const output = new Uint8Array(totalSize);
  let writePos = 0;
  for (const [start, end] of keepRanges) {
    output.set(input.subarray(start, end), writePos);
    writePos += end - start;
  }

  return output;
}
