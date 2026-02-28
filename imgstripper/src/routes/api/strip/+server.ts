/**
 * POST /api/strip
 *
 * Accepts a multipart/form-data request with an `image` field containing
 * an image file. Strips all metadata from the image in-memory and returns
 * the clean image bytes as the response body.
 *
 * Also handles POST requests to / directly (i.e. when no path is specified),
 * for API consumers that just POST to the root domain.
 *
 * Response headers:
 *   Content-Type: image/jpeg | image/png | image/webp
 *   Content-Disposition: attachment; filename="stripped.<ext>"
 *   X-Original-Size: <bytes>
 *   X-Stripped-Size: <bytes>
 */

import { stripMetadata } from "$lib/strip/index.js";
import { error, type RequestHandler } from "@sveltejs/kit";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const POST: RequestHandler = async ({ request }) => {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    throw error(400, "Request must be multipart/form-data");
  }

  const file = formData.get("image");

  if (!file) {
    throw error(400, 'Missing required field "image"');
  }

  if (!(file instanceof File)) {
    throw error(400, '"image" field must be a file, not a text value');
  }

  if (file.size === 0) {
    throw error(400, "Uploaded file is empty");
  }

  // 50 MB hard limit — well within the Worker request body cap
  const MAX_BYTES = 50 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    throw error(413, "File too large. Maximum size is 50 MB.");
  }

  let inputBytes: Uint8Array;
  try {
    const arrayBuffer = await file.arrayBuffer();
    inputBytes = new Uint8Array(arrayBuffer);
  } catch {
    throw error(500, "Failed to read uploaded file");
  }

  let result: ReturnType<typeof stripMetadata>;
  try {
    result = stripMetadata(inputBytes);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error during processing";
    throw error(422, message);
  }

  const { data, mimeType } = result;
  const ext = MIME_TO_EXT[mimeType] ?? "bin";

  // Derive a clean output filename from the original, replacing the extension
  const originalName = file.name ?? "image";
  const baseName = originalName.replace(/\.[^.]+$/, "") || "image";
  const outputName = `${baseName}-stripped.${ext}`;

  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${outputName}"`,
      "Content-Length": String(data.byteLength),
      "X-Original-Size": String(inputBytes.byteLength),
      "X-Stripped-Size": String(data.byteLength),
      // Allow cross-origin API usage
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "X-Original-Size, X-Stripped-Size",
    },
  });
};

// Handle CORS preflight
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
};
