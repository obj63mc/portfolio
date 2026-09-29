// `npm run usage` (buildout ticket 14): month-to-date Durable Object usage from the GraphQL Analytics API, and the bill
// it projects for the whole month at the Workers Paid rates in the spec (Deploy and operations).

/** Month-to-date usage: Durable Object requests, inbound WebSocket messages and duration. */
export type Usage = { requests: number; messages: number; gbSeconds: number };

/** The month's bill in dollars if usage keeps its month-to-date pace until `now`'s month (UTC) ends. */
export function projectedBill({ requests, messages, gbSeconds }: Usage, now: Date): number {
	const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
	const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
	// ponytail: a straight line from month-to-date; floored at an hour so the first minutes of the 1st stay finite.
	const pace = (end - start) / Math.max(now.getTime() - start, 3_600_000);
	// Inbound messages bill as requests at 20:1 (outbound are free); 1M requests and 400k GB-s are included.
	const billed = (requests + messages / 20) * pace;
	return 5 + (Math.max(0, billed - 1e6) * 0.15) / 1e6 + (Math.max(0, gbSeconds * pace - 400_000) * 12.5) / 1e6;
}

/** The value at `path` in the API's answer, or undefined. */
const at = (x: unknown, ...path: (string | number)[]): unknown =>
	path.reduce((o, k) => (typeof o === 'object' && o !== null ? (o as Record<string | number, unknown>)[k] : undefined), x);
const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);

if (import.meta.main) {
	// The token lives outside the repo (bash scripts/cloudflare-setup.sh writes this file); the environment wins.
	try {
		process.loadEnvFile(`${process.env.HOME}/.config/barmadden/.env`);
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
	}
	const token = process.env.CF_ANALYTICS_TOKEN;
	if (!token) {
		console.error('Set CF_ANALYTICS_TOKEN to an Account Analytics: Read API token (bash scripts/cloudflare-setup.sh makes one).');
		process.exit(1);
	}
	const now = new Date();
	const [from, to] = [`${now.toISOString().slice(0, 8)}01`, now.toISOString().slice(0, 10)];
	// The whole account from the 1st of the month (UTC) to today. Invocations are split by type because a hibernated
	// room's incoming messages are counted there, one invocation each, rather than in the periodic inbound count.
	// Periodic duration is already GB-s at 128 MB an object.
	const query = `query ($account: string!, $from: Date!, $to: Date!) {
		viewer { accounts(filter: { accountTag: $account }) {
			durableObjectsInvocationsAdaptiveGroups(limit: 100, filter: { date_geq: $from, date_leq: $to }) {
				dimensions { type } sum { requests }
			}
			durableObjectsPeriodicGroups(limit: 1, filter: { date_geq: $from, date_leq: $to }) {
				sum { duration inboundWebsocketMsgCount outboundWebsocketMsgCount }
			}
		} }
	}`;
	const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ query, variables: { account: '3edd4b87aa844db287c56527fb8dba69', from, to } })
	});
	const body: unknown = await res.json().catch(() => null);
	const account = at(body, 'data', 'viewer', 'accounts', 0);
	if (!res.ok || account === undefined) {
		console.error(`GraphQL Analytics API: ${res.status} ${JSON.stringify(at(body, 'errors') ?? body)}`);
		process.exit(1);
	}
	const groups = at(account, 'durableObjectsInvocationsAdaptiveGroups');
	const byType = (Array.isArray(groups) ? (groups as unknown[]) : []).map(
		(g) => [String(at(g, 'dimensions', 'type')), num(at(g, 'sum', 'requests'))] as const
	);
	const periodic = (field: string) => num(at(account, 'durableObjectsPeriodicGroups', 0, 'sum', field));
	// ponytail: message types matched by pattern (live: hibernation; http is a request); widen it if the "by type"
	// line shows a new message type, which this bills 1:1 as a request until then.
	const isMessage = (type: string) => /hibernat|websocket/i.test(type);
	const total = (pick: (type: string) => boolean) => byType.reduce((s, [type, n]) => s + (pick(type) ? n : 0), 0);
	const usage: Usage = {
		requests: total((t) => !isMessage(t)),
		// Hibernated messages as invocations, or the periodic count, never both: the docs name one or the other.
		messages: Math.max(total(isMessage), periodic('inboundWebsocketMsgCount')),
		gbSeconds: periodic('duration')
	};
	const fmt = (x: number) => Math.round(x).toLocaleString('en-US');
	console.log(`Durable Objects, ${from} to ${to} (UTC):
  requests      ${fmt(usage.requests)}, billed 1:1
  messages in   ${fmt(usage.messages)}, billed as requests at 20:1 (${fmt(periodic('outboundWebsocketMsgCount'))} out, free)
  duration      ${fmt(usage.gbSeconds)} GB-s (400,000 included)
  by type       ${byType.map(([type, count]) => `${type} ${fmt(count)}`).join(', ') || 'no invocations yet'}
Projected bill for the month: $${projectedBill(usage, now).toFixed(2)}`);
}
