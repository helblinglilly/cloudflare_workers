import type { IParsedMemoHook } from "./types";


export async function postMessage(message: IParsedMemoHook, baseUrl: string) {

	const body  = {
		content: null,
		username: "Memos Bot",
		avatar_url: "https://raw.githubusercontent.com/usememos/memos/refs/heads/main/web/public/android-chrome-512x512.png",
	  embeds: [
	    {
				title: `New message from ${message.username}`,
	      description: message.content,
				url: message.url,
	      timestamp: message.posted,
	    }
	  ],
	}

	const res = await fetch(baseUrl, {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(body),
	});

	return res.status;
}
