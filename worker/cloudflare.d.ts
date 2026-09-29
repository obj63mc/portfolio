// The few Workers runtime types this Worker uses, declared here instead of installing @cloudflare/workers-types, whose
// globals clash with the DOM library the site's type-check loads. The object state deliberately has no `storage`: the rooms
// never touch it (spec: "Rooms"), so any call to it fails the type-check.

declare module 'cloudflare:workers' {
	export abstract class DurableObject<Env = unknown> {
		protected ctx: DurableObjectState;
		protected env: Env;
		constructor(ctx: DurableObjectState, env: Env);
	}
}

/** A stub for an object reached by name: each of its methods, called over RPC, returns a promise. */
type DurableObjectStub<T> = {
	[K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<Awaited<R>> : never;
};

interface DurableObjectNamespace<T> {
	getByName(name: string): DurableObjectStub<T>;
}

/** `ctx.exports`: a namespace per exported object class, declared in wrangler.toml's `exports`; a Preview gets its own. */
interface WorkerExports {
	Directory: DurableObjectNamespace<import('./rooms.ts').Directory>;
	Room: DurableObjectNamespace<import('./rooms.ts').Room>;
}

interface DurableObjectState {
	exports: WorkerExports;
	acceptWebSocket(ws: WebSocket): void;
	getWebSockets(): WebSocket[];
	setWebSocketAutoResponse(pair: WebSocketRequestResponsePair): void;
}

declare class WebSocketRequestResponsePair {
	constructor(request: string, response: string);
}

declare class WebSocketPair {
	0: WebSocket;
	1: WebSocket;
}

interface WebSocket {
	/** Up to 2 KB kept with a hibernated socket and handed back when the object wakes. */
	serializeAttachment(value: unknown): void;
	deserializeAttachment(): unknown;
}

interface ResponseInit {
	webSocket?: WebSocket;
}

interface Request {
	/** Cloudflare's properties of the incoming request; absent under Node. */
	cf?: { country?: string };
}
