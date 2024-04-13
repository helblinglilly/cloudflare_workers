import { IConfig } from "./types";

export async function updateIPEntries(config: IConfig){
	const existingEntries = await getExistingEntries(config);

	let createdV4Entry = false;
	let createdV6Entry = false;

	if (!existingEntries.ipv4){
		await createEntry();
		createdV4Entry = true;
	}
	if (!existingEntries.ipv6){
		await createEntry();
		createdV6Entry = true;
	}

	if (!createdV4Entry){
		await updateEntry();
	}

	if (!createdV6Entry){
		await updateEntry();
	}
}

async function getExistingEntries(config: IConfig){
	const v4RequestUrl = `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/dns_records?type=A&name=${config.dnsEntry}.${config.domain}`;
	const v6RequestUrl = `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/dns_records?type=AAAA&name=${config.dnsEntry}.${config.domain}`;

	const [v4Response, v6Response] = await Promise.all([
		fetch(v4RequestUrl, {
			headers: {
				'Authorization': `Bearer ${config.apiKey}`,
				"Content-Type": "application/json"
			}
		}),
		fetch(v6RequestUrl, {
			headers: {
				'Authorization': `Bearer ${config.apiKey}`,
				"Content-Type": "application/json"
			}
		})
	]);

	const v4Data = await v4Response.json();
	const v6Data = await v6Response.json();

	return {
		ipv4: v4Data?.result[0],
		ipv6: v6Data?.result[0]
	}
}

async function updateEntry(){
	const url = `https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=A&name=$A_RECORD.$DOMAIN`
	console.log('tbd');
}

async function createEntry(){
	console.log('tbd');
}