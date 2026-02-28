/**
 * PNG metadata stripper.
 *
 * PNG files are structured as an 8-byte signature followed by a sequence of
 * chunks. Each chunk has the format:
 *
 *   [4 bytes: data length (big-endian, NOT including type or CRC)]
 *   [4 bytes: chunk type (ASCII)]
 *   [N bytes: chunk data]
 *   [4 bytes: CRC32 of type + data]
 *
 * Metadata chunks we DROP:
 *   tEXt  – uncompressed text metadata
 *   iTXt  – international (UTF-8) text metadata
 *   zTXt  – compressed text metadata
 *   eXIf  – EXIF data
 *   tIME  – last-modification timestamp
 *   bKGD  – background colour hint
 *   hIST  – histogram
 *   pHYs  – physical pixel dimensions (DPI) — contains device info
 *   sPLT  – suggested palette
 *   oFFs  – image offset (used by scanners)
 *   sCAL  – physical scale
 *   gIFg  – GIF control extension
 *   gIFt  – GIF plain text extension (deprecated)
 *   gIFx  – GIF application extension
 *   fRAc  – fractal image parameters
 *   caTl  – MNG-style chunk (rarely seen in PNG)
 *   mkBF  – Corel-specific
 *   mkBS  – Corel-specific
 *   mkTS  – Corel-specific
 *   prVW  – Fireworks preview
 *
 * Chunks we KEEP (essential for a valid, renderable image):
 *   IHDR  – image header         (must be first)
 *   PLTE  – palette              (required for indexed-colour images)
 *   IDAT  – image data
 *   IEND  – image trailer        (must be last)
 *   tRNS  – transparency         (affects rendering)
 *   cHRM  – chromaticities       (colour accuracy)
 *   gAMA  – gamma                (colour accuracy)
 *   iCCP  – ICC colour profile   (colour accuracy)
 *   sRGB  – sRGB intent          (colour accuracy)
 *   sBIT  – significant bits     (rendering accuracy)
 *   acTL  – APNG animation control
 *   fcTL  – APNG frame control
 *   fdAT  – APNG frame data
 */

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

/** Four-character chunk type string → 32-bit big-endian integer. */
function typeToInt(type: string): number {
  return (
    (type.charCodeAt(0) << 24) |
    (type.charCodeAt(1) << 16) |
    (type.charCodeAt(2) << 8) |
    type.charCodeAt(3)
  );
}

// Pre-compute the set of chunk type integers to DROP for O(1) lookup.
const DROP_TYPES = new Set<number>(
  [
    "tEXt",
    "iTXt",
    "zTXt",
    "eXIf",
    "tIME",
    "bKGD",
    "hIST",
    "pHYs",
    "sPLT",
    "oFFs",
    "sCAL",
    "gIFg",
    "gIFt",
    "gIFx",
    "fRAc",
    "caTl",
    "mkBF",
    "mkBS",
    "mkTS",
    "prVW",
  ].map(typeToInt)
);

/**
 * Strip all metadata from a PNG file buffer.
 *
 * @param input  Raw PNG bytes
 * @returns      Clean PNG bytes with no EXIF / text / timestamp metadata
 */
export function stripPng(input: Uint8Array): Uint8Array {
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const len = input.byteLength;

  // Validate PNG signature (8 bytes)
  if (len < 8) {
    throw new Error("Not a valid PNG file (too short)");
  }
  for (let i = 0; i < 8; i++) {
    if (input[i] !== PNG_SIGNATURE[i]) {
      throw new Error("Not a valid PNG file (invalid signature)");
    }
  }

  // Collect byte ranges [start, end) to keep
  const keepRanges: Array<[number, number]> = [];

  // Always keep the 8-byte signature
  keepRanges.push([0, 8]);

  let offset = 8;

  while (offset < len) {
    // Each chunk: 4-byte length + 4-byte type + <length> bytes data + 4-byte CRC
    if (offset + 8 > len) {
      throw new Error(`Truncated PNG: not enough bytes for chunk header at offset ${offset}`);
    }

    const dataLength = view.getUint32(offset, false /* big-endian */);
    const chunkType = view.getUint32(offset + 4, false);
    const chunkTotalSize = 4 + 4 + dataLength + 4; // len field + type + data + CRC
    const chunkEnd = offset + chunkTotalSize;

    if (chunkEnd > len) {
      throw new Error(
        `Truncated PNG: chunk at offset ${offset} claims data length ${dataLength} but file ends at ${len}`
      );
    }

    if (!DROP_TYPES.has(chunkType)) {
      keepRanges.push([offset, chunkEnd]);
    }

    offset = chunkEnd;
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
