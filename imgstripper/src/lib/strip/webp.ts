/**
 * WebP metadata stripper.
 *
 * WebP files use the RIFF container format:
 *
 *   [4 bytes: "RIFF"]
 *   [4 bytes: file size (little-endian, NOT including the first 8 bytes)]
 *   [4 bytes: "WEBP"]
 *   [... RIFF chunks ...]
 *
 * There are three WebP bitstream formats:
 *
 *   Simple Lossy  – single "VP8 " chunk, no metadata possible
 *   Simple Lossless – single "VP8L" chunk, no metadata possible
 *   Extended      – "VP8X" chunk followed by optional chunks including
 *                   metadata. Only the extended format can carry metadata.
 *
 * In the extended format, chunks can include:
 *   VP8X  – feature flags + canvas dimensions   → KEEP (update flags)
 *   ICCP  – ICC colour profile                  → KEEP
 *   VP8   – lossy bitstream                     → KEEP
 *   VP8L  – lossless bitstream                  → KEEP
 *   ANIM  – animation parameters                → KEEP
 *   ANMF  – animation frame                     → KEEP
 *   ALPH  – alpha channel                       → KEEP
 *   EXIF  – EXIF metadata                       → DROP
 *   XMP   – XMP metadata                        → DROP
 *
 * After dropping EXIF/XMP we must:
 *   1. Clear the E (EXIF) and X (XMP) bits in the VP8X flags field
 *   2. Rewrite the RIFF file-size field to reflect the new total size
 *
 * RIFF chunk layout:
 *   [4 bytes: FourCC]
 *   [4 bytes: chunk data size, little-endian, NOT including FourCC or size field]
 *   [N bytes: chunk data]
 *   [0 or 1 padding byte if N is odd — not counted in the size field]
 */

// FourCCs as 32-bit little-endian integers for fast comparison
function fourCC(s: string): number {
  return (
    s.charCodeAt(0) |
    (s.charCodeAt(1) << 8) |
    (s.charCodeAt(2) << 16) |
    (s.charCodeAt(3) << 24)
  );
}

const CC_RIFF = fourCC("RIFF");
const CC_WEBP = fourCC("WEBP");
const CC_VP8X = fourCC("VP8X");
const CC_EXIF = fourCC("EXIF");
const CC_XMP_ = fourCC("XMP "); // note trailing space

// VP8X flags byte (byte 0 of VP8X chunk data, 10 bytes total)
// Bit positions (LSB = bit 0):
//   bit 1 – ICC colour profile present
//   bit 2 – Animation
//   bit 3 – Exif metadata
//   bit 4 – XMP metadata
//   bit 5 – Alpha
const VP8X_FLAG_EXIF = 1 << 3;
const VP8X_FLAG_XMP  = 1 << 4;

/**
 * Strip all metadata from a WebP file buffer.
 *
 * Simple (non-extended) WebP files contain no metadata and are returned
 * unchanged.
 *
 * @param input  Raw WebP bytes
 * @returns      Clean WebP bytes with no EXIF / XMP metadata
 */
export function stripWebp(input: Uint8Array): Uint8Array {
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const len = input.byteLength;

  // Minimum valid WebP: RIFF(4) + fileSize(4) + WEBP(4) = 12 bytes
  if (len < 12) {
    throw new Error("Not a valid WebP file (too short)");
  }

  if (view.getUint32(0, true) !== CC_RIFF) {
    throw new Error("Not a valid WebP file (missing RIFF header)");
  }
  if (view.getUint32(8, true) !== CC_WEBP) {
    throw new Error("Not a valid WebP file (missing WEBP FourCC)");
  }

  // Check the first chunk type — if it's not VP8X this is a simple bitstream
  // with no room for metadata; return a copy unchanged.
  if (len < 20) {
    // Too short to have a VP8X chunk
    return input.slice();
  }

  const firstChunkType = view.getUint32(12, true);
  if (firstChunkType !== CC_VP8X) {
    // Simple lossy (VP8 ) or simple lossless (VP8L) — no metadata possible
    return input.slice();
  }

  // --- Extended WebP ---
  // VP8X chunk layout (always 10 bytes of payload):
  //   offset 16: 4-byte flags (only low 8 bits used, rest reserved/zero)
  //   offset 20: 3-byte canvas width minus 1  (24-bit little-endian)
  //   offset 23: 3-byte canvas height minus 1 (24-bit little-endian)
  const vp8xChunkDataSize = view.getUint32(16, true); // should be 10
  if (vp8xChunkDataSize < 10) {
    throw new Error("Malformed VP8X chunk (data size < 10)");
  }

  // Collect chunk ranges [offset, end) to keep, starting after the 12-byte
  // RIFF/WEBP header. We will handle VP8X separately.
  // Layout in output:
  //   bytes 0–11:  RIFF header (updated file size)
  //   bytes 12–...: VP8X chunk (updated flags)
  //   bytes ...:   remaining kept chunks

  // The VP8X chunk occupies bytes 12 .. 12 + 8 + paddedSize
  const vp8xPaddedSize = vp8xChunkDataSize + (vp8xChunkDataSize & 1); // pad to even
  const vp8xChunkEnd = 12 + 8 + vp8xPaddedSize; // 8 = FourCC(4) + size(4)

  // Parse remaining chunks after VP8X
  const keepRanges: Array<[number, number]> = []; // [start, end) in original buffer
  let offset = vp8xChunkEnd;

  while (offset < len) {
    if (offset + 8 > len) {
      // Malformed trailing data — ignore
      break;
    }

    const chunkType = view.getUint32(offset, true);
    const chunkDataSize = view.getUint32(offset + 4, true);
    const paddedDataSize = chunkDataSize + (chunkDataSize & 1);
    const chunkEnd = offset + 8 + paddedDataSize;

    if (chunkEnd > len) {
      throw new Error(
        `Truncated WebP: chunk at offset ${offset} claims data size ${chunkDataSize} but file ends at ${len}`
      );
    }

    const isDrop = chunkType === CC_EXIF || chunkType === CC_XMP_;

    if (!isDrop) {
      keepRanges.push([offset, chunkEnd]);
    }

    offset = chunkEnd;
  }

  // Calculate new total file size:
  //   12 (RIFF header) + vp8xChunkEnd - 12 (VP8X chunk) + kept chunks
  // RIFF file-size field = total file bytes - 8 (excludes the RIFF+size fields)
  let payloadSize = vp8xPaddedSize + 8; // VP8X chunk (FourCC + size + data)
  for (const [start, end] of keepRanges) {
    payloadSize += end - start;
  }
  // Total file = 12 (RIFF header) + payloadSize
  const newFileSize = 12 + payloadSize;
  // RIFF "file size" field = total - 8
  const newRiffSize = newFileSize - 8;

  // Build output
  const output = new Uint8Array(newFileSize);
  const outView = new DataView(output.buffer);

  // Copy RIFF header + WEBP FourCC (bytes 0–11) and update the file size
  output.set(input.subarray(0, 12), 0);
  outView.setUint32(4, newRiffSize, true); // update RIFF size

  // Copy VP8X chunk (bytes 12..vp8xChunkEnd) and clear EXIF/XMP flags
  output.set(input.subarray(12, vp8xChunkEnd), 12);
  // VP8X flags are at offset 16 (after the FourCC and size fields) in the file,
  // which maps to output byte 16.
  const currentFlags = outView.getUint32(16, true);
  const newFlags = currentFlags & ~(VP8X_FLAG_EXIF | VP8X_FLAG_XMP);
  outView.setUint32(16, newFlags, true);

  // Copy remaining kept chunks
  let writePos = vp8xChunkEnd;
  for (const [start, end] of keepRanges) {
    output.set(input.subarray(start, end), writePos);
    writePos += end - start;
  }

  return output;
}
