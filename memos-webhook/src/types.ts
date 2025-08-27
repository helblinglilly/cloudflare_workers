export enum Visibility {
	Private = 1,
	Protected = 2,
	Public = 3
}
export interface IMemoHookEvent {
	url: string;
	activityType: 'memos.memo.created' | 'memos.memo.deleted',
	creator: string;
	memo: {
		name: string;
		state: number;
		creator: string;
		create_time: {
			seconds: number; // 1756330954
		},
		update_time: {
			seconds: number; // 1756330954
		}
		display_time: {
			seconds: number; // 1756330954
		}
		content: string;
		nodes: unknown[];
		visibility: Visibility,
		property: object;
		snippet: string;
	}
}

export interface IParsedMemoHook {
	activity: IMemoHookEvent['activityType'],
	visibility: IMemoHookEvent['memo']['visibility'],
	url: string;
	username: string;
	content: string;
	posted: string;
	user: string;
	host: string;
}
