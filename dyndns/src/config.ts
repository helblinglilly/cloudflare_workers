import { Env, IConfig } from "./types";

export async function getConfig(req: Request, env: Env): Promise<undefined | IConfig >{
	const url = new URL(req.url);

	const ip = url.searchParams.get('myip') ?? '';
	const [ipv4, ipv6] = ip.split(',');

	const authHeader = req.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Basic ')) {
		return;
	}
	const encodedCredentials = authHeader.slice('Basic '.length);
	const decodedCredentials = atob(encodedCredentials);
	const [username, password] = decodedCredentials.split(':');

	const entry = await env.KV_CONFIGS.get(`${username}-${password}`);

	if (!entry){
		return;
	}

	const entries = entry.split(',');

	const apiKey = entries.find((value) => {
		const key = value.split('=')[0];
		return key === 'API_KEY';
	})?.split('=')[1]

	const zoneId = entries.find((value) => {
		const key = value.split('=')[0];
		return key === 'ZONE_ID'
	})?.split('=')[1]

	const dnsEntry = entries.find((value) => {
		const key = value.split('=')[0];
		return key === 'DNS_ENTRY'
	})?.split('=')[1]
	
	const domain = entries.find((value) => {
		const key = value.split('=')[0];
		return key === 'DOMAIN'
	})?.split('=')[1]

	if (!apiKey || !zoneId || !dnsEntry || !domain){
		return;
	}

	return {
		apiKey,
		zoneId,
		domain,
		dnsEntry,
		ipv4,
		ipv6,
	};
}