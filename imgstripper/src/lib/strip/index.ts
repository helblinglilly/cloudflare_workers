/**
 * Main metadata-stripping dispatcher.
 *
 * Detects the image format from the file's magic bytes and routes to the
 * appropriate format-specific stripper.
 *
 * Supported formats:
 *   JPEG  – strips EXIF, XMP, IPTC, comments; keeps APP0 (JFIF) and ICC
 *   PNG   – strips tEXt, iTXt, zTXt, eXIf, tIME, pHYs, and other metadata
 *   WebP  – strips EXIF and XMP chunks from extended (VP8X) files
 */

import { stripJpeg } from "./jpeg.js";
import { stripPng } from "./png.js";
import { stripWebp } from "./webp.js";

export type SupportedMimeType = "image/jpeg" | "image/png" | "image/webp";

export interface StripResult {
  data: Uint8Array;
  mimeType: SupportedMimeType;
}

/** JPEG magic: 0xFF 0xD8 */
function isJpeg(buf: Uint8Array): boolean {
  return buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8;
}

/** PNG magic: 8-byte signature 89 50 4E 47 0D 0A 1A 0A */
function isPng(buf: Uint8Array): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 && // P
    buf[2] === 0x4e && // N
    buf[3] === 0x47 && // G
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  );
}

/** WebP magic: "RIFF" at 0, "WEBP" at 8 */
function isWebp(buf: Uint8Array): boolean {
  return (
    buf.length >= 12 &&
    buf[0] === 0x52 && // R
    buf[1] === 0x49 && // I
    buf[2] === 0x46 && // F
    buf[3] === 0x46 && // F
    buf[8] === 0x57 && // W
    buf[9] === 0x45 && // E
    buf[10] === 0x42 && // B
    buf[11] === 0x50    // P
  );
}

/**
 * Detect the image format from raw bytes.
 * Returns null if the format is not supported.
 */
export function detectFormat(buf: Uint8Array): SupportedMimeType | null {
  if (isJpeg(buf)) return "image/jpeg";
  if (isPng(buf)) return "image/png";
  if (isWebp(buf)) return "image/webp";
  return null;
}

/**
 * Strip all metadata from an image buffer.
 *
 * The format is detected automatically from the file's magic bytes — the
 * original filename or Content-Type header is not used, so spoofed extensions
 * won't cause incorrect processing.
 *
 * @param input  Raw image bytes (any supported format)
 * @returns      Stripped image bytes and the detected MIME type
 * @throws       If the format is unsupported or the file is malformed
 */
export function stripMetadata(input: Uint8Array): StripResult {
  const mimeType = detectFormat(input);

  if (mimeType === null) {
    throw new Error(
      "Unsupported image format. Please upload a JPEG, PNG, or WebP file."
    );
  }

  let data: Uint8Array;

  switch (mimeType) {
    case "image/jpeg":
      data = stripJpeg(input);
      break;
    case "image/png":
      data = stripPng(input);
      break;
    case "image/webp":
      data = stripWebp(input);
      break;
  }

  return { data, mimeType };
}
