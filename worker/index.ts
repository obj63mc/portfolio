// The site is static assets; `run_worker_first` sends only the socket path here. A socket on `/ws/<scene>` (the client
// builds the URL from `location`) passes the checks below, gets a room from the directory and is handed to that room.
// This module is the fetch handler alone, so Node's test runner can import it; rooms.ts, the Worker's entry, holds the
// two object classes, which need the runtime's `cloudflare:workers` module.
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import { SUB_SCENES } from '../src/lib/scenes/index.ts';

export interface Env {
	/** The kill switch: `npm run multiplayer:off` sets this secret to `off`, and every upgrade is refused. */
	MULTIPLAYER?: string;
	/** The site-wide visitor ceiling, from wrangler.toml. */
	MAX_VISITORS?: string | number;
}

/** Every scene with rooms, by id: the overworld and each sub-scene's slug. Its size clamps positions in its rooms. */
export const SCENES: Record<string, { w: number; h: number }> = { overworld: OVERWORLD, ...SUB_SCENES };

/** The one directory object, which places every visitor on the site. */
export const DIRECTORY = 'directory';

// `_headers` never applies to Worker responses, so the socket path sets its own.
const refuse = (status: number, body: string) =>
	new Response(body, { status, headers: { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' } });

export default {
	async fetch(req: Request, env: Env, ctx: { exports: WorkerExports }): Promise<Response> {
		const url = new URL(req.url);
		// Same-origin only: barmadden.com in production (its one hostname, also pinned by the WAF), a Preview's own
		// workers.dev URL on that Preview, localhost under `wrangler dev`. No var to override per Preview.
		if (req.headers.get('Origin') !== url.origin) return refuse(403, 'bad origin');
		if (env.MULTIPLAYER === 'off') return refuse(503, 'multiplayer is off');
		const scene = url.pathname.slice('/ws/'.length);
		if (!url.pathname.startsWith('/ws/') || !Object.hasOwn(SCENES, scene)) return refuse(404, 'no such scene');
		if (req.headers.get('Upgrade') !== 'websocket') return refuse(426, 'expected a websocket');
		const room = await ctx.exports.Directory.getByName(DIRECTORY).place(scene);
		if (!room) return refuse(503, 'the site is full');
		// The flag is Cloudflare's geolocation at join, never the client's word: the room reads only this URL.
		const q = new URLSearchParams({ room, cc: req.cf?.country ?? 'XX' });
		return ctx.exports.Room.getByName(room).fetch(new Request(`https://room/?${q}`, { headers: req.headers }));
	}
};
