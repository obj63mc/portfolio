// The site is static assets; `run_worker_first` sends only the socket path here. Rooms arrive in ticket 12,
// so until then every upgrade is refused and the client runs single-player.

// `_headers` never applies to Worker responses, so the socket path sets its own.
const refuse = (status: number, body: string) =>
	new Response(body, { status, headers: { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' } });

export default {
	fetch(req: Request): Response {
		// Same-origin only: barmadden.com in production (its one hostname, also pinned by the WAF), a Preview's
		// own workers.dev URL on that Preview, localhost under `wrangler dev`. No var to override per Preview.
		if (req.headers.get('Origin') !== new URL(req.url).origin) return refuse(403, 'bad origin');
		return refuse(503, 'multiplayer is not running');
	}
};
