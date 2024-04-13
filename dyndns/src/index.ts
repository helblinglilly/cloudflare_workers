/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler deploy src/index.ts --name my-worker` to deploy your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { getConfig } from "./config";
import { updateIPEntries } from "./dns";
import { Env } from "./types";

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname !== '/nic/update'){
			return new Response("404", {
				status: 400
			})
		}

		const config = await getConfig(request, env);
		if (!config){
			return new Response("401", {
				status: 401
			})
		}

		if (config.ipv4){
			await updateIPEntries(config);
		}

		if (config.ipv6){

		}


		return new Response(JSON.stringify(config));
	},
};
