import * as cheerio from "cheerio";
/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

async function getWebsiteHTML(site: string){
	const response = await fetch(site);
	return await response.text();

}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		const link = url.searchParams.get("link");
		if (!link){
			return new Response("Missing link search parameter", { status: 400 });
		}

		try {
			const html = await getWebsiteHTML(`${link}`);
			const $ = cheerio.load(html);

			const responseBody = {
				title: {
					native: $('title')?.text() ?? 
						$('meta[name="title"]')?.attr('content') ?? "No data",
					og: $('meta[property="og:title"]')?.attr('content') ?? 
						$('meta[name="og:title"]')?.attr('content') ?? 
						null,
					twitter: $('meta[property="twitter:title"]')?.attr('content') ?? 
						$('meta[name="twitter:title"]')?.attr('content') ?? 
						null,
				},
				description: {
					native: $('meta[name="description"]').attr('content') ?? "No data",
					og: $('meta[property="og:description"]').attr('content') ?? 
						$('meta[name="og:description"]').attr('content') ?? 
						null,
					twitter: $('meta[property="twitter:description"]').attr('content') ?? 
						$('meta[name="twitter:description"]').attr('content') ?? 
						null,
				},
				image: {
					og: $('meta[property="og:image"]').attr('content') ?? 
						$('meta[name="og:image"]').attr('content') ?? 
						null,
					twitter: $('meta[property="twitter:image"]').attr('content') ?? 
						$('meta[name="twitter:image"]').attr('content') ??
						null,
				}
			}

			return new Response(JSON.stringify(responseBody), {
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'no-store',
				}
			});
		} catch(err){
			console.log(err);
			return new Response('Error fetching site data');
		}
	},
};