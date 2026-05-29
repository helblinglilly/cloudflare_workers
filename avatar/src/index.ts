/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler deploy src/index.ts --name my-worker` to deploy your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { toSvg } from "jdenticon";

async function sha1(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request: Request, ctx: ExecutionContext): Promise<Response> {
    const self = "avatar.helbling.uk";
    const key = request.url.split(self)[1] ?? "blank";
    const origin = request.headers.get("Origin") || "";

    // Function to check if the origin is allowed
    const isAllowedOrigin = (origin: string): boolean => {
      return ["http://localhost:5173", "https://pokecompanion.com", "https://helbling.uk"].includes(
        origin,
      );
    };

    const svg = toSvg(key, 128);
    const etag = `"${await sha1(svg)}"`;

    let headers = new Headers({
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
      ETag: etag,
    });

    // Set CORS headers if origin is allowed
    if (isAllowedOrigin(origin)) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Access-Control-Allow-Methods", "GET");
      headers.set("Access-Control-Allow-Headers", "Content-Type");
    }

    // Handle preflight (OPTIONS) request
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: headers,
      });
    }

    return new Response(toSvg(key, 128), {
      headers: headers,
    });
  },
};
