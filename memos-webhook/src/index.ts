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

import { postMessage } from "./discord";
import { Visibility, type IMemoHookEvent } from "./types";
import { parseWebHookEvent } from "./webhookParser";

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method !== "POST") {
			return new Response("Method not allowed", { status: 405 });
		}

		try {
			const contentType = request.headers.get("content-type") || "";

			if (!contentType.includes("application/json")) {
				throw new Error(`Can only accept application/json but got ${contentType}`);
			}

			const requestUrl = new URL(request.url);
			const memosHost = requestUrl.searchParams.get('from');
			const discordTarget = requestUrl.searchParams.get('discord');

			if (!memosHost || !discordTarget){
				throw new Error('Did not include "host" or "discord" query param')
			}

			const body = await request.json();

			if (typeof body !== "object" || !body) {
				throw new Error("Parsed body was not an object or null")
			}

			const memoEvent = parseWebHookEvent(body as unknown as IMemoHookEvent, memosHost);

			if (memoEvent.visibility !== Visibility.Public || memoEvent.activity !== 'memos.memo.created'){
				return new Response('Not a public post - not doing anything', { status: 200 });
			}
			await postMessage(memoEvent, discordTarget)

			return new Response("Ok");
		} catch(err){
			console.log(err);
			return new Response(null, { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
