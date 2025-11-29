/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

 export default {
	async fetch(request, env, ctx): Promise<Response> {
		// Get the URL and path from the incoming request
		const url = new URL(request.url);
		const path = url.pathname + url.search;

		// Create the redirect URL (preserving the path)
		const redirectUrl = `https://helbling.uk${path}`;

		// Return a 301 permanent redirect response
		return Response.redirect(redirectUrl, 301);
	},
 } satisfies ExportedHandler<Env>;
