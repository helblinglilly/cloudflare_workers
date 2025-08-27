import type { IMemoHookEvent, IParsedMemoHook } from "./types";

function getUsername(user: string){
	const usernameMap: Record<string, string> = {
		'users/1': 'lilly',
		'users/2': 'Harrygloom'
	};

	return usernameMap[user] ?? 'Unknown user'
}
export function parseWebHookEvent(input: IMemoHookEvent, host: string): IParsedMemoHook{

	return {
		activity: input.activityType,
		visibility: input?.memo?.visibility,
		url: `https://${host}/m/${input.memo.name.split('memos/')[1]}`,
		content: input.memo.snippet ?? '[An image]',
		posted: new Date(input.memo.create_time.seconds * 1000).toISOString(),
		user: input.creator,
		username: getUsername(input.creator),
		host,
	}
}
