# DynDNS

This is a cloudflare worker that can accept DynamicDNS requests from routers and update DNS entries accordingly.

Multiple clients are supported by keeping their configurations in an attached KV store.

The KV's data structure looks like this:

| Key               | Value                                               |
| ----------------- | --------------------------------------------------- |
| USERNAME-PASSWORD | DNS_ENTRY=entry.example.com,CF_API_KEY=your_api_key |
