// This page is entirely static – no server data needed, no Worker invoked on
// page load. SvelteKit will prerender it to a plain HTML file that is served
// directly from Cloudflare's asset CDN.
export const prerender = true;
