export interface IMemoHookEvent {
	url: string;
	activityType: 'memos.memo.created' | 'memos.memo.deleted',
	creator: string;
	createTime: string;
	memo: {
		name: string;
		state: 'NORMAL';
		creator: string;
		createTime: string;
		updateTime: string;
		displayTime: string;
		content: string;
		nodes: unknown[];
		visibility: 'PRIVATE' | 'PUBLIC',
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
