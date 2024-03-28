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

export default {
	async fetch(
		request: Request,
		ctx: ExecutionContext
	): Promise<Response> {
		const self = 'avatar.helbling.uk';
	
		const key = request.url.split(self)[1] ?? 'blank';

		return new Response(toSvg(key, 128), {
			headers: {
				'Content-Type': 'image/svg+xml'
			}
		});
	},
};
