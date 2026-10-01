// The media host's layout, shared by the sync (`npm run videos`, scripts/videos.ts) and by the dev and preview servers
// (vite.config.ts): a video's key in the R2 bucket, which is its path under the media host, and the stand-in for that
// host on this machine, serving the sources themselves under /media so that dev, a local build and the smokes never
// reach the network.
import { createReadStream, existsSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';

/** Where the sources are kept: art/sources/videos/<folder>/<file>. */
export const SOURCES = fileURLToPath(new URL('../art/sources/videos/', import.meta.url));

/** A video's key: its folder and file name under videos/, its content's hash before the extension, so a key never changes its bytes. */
export const keyOf = (folder: string, file: string, hash: string) => `videos/${folder}/${file.replace(/\.mp4$/, '')}.${hash}.mp4`;

/** The source a key was made from, as `<folder>/<file>` under art/sources/videos; null for anything that isn't a key. */
export function sourceOf(key: string) {
	const m = /^videos\/([\w-]+)\/([\w-][\w.-]*)\.[0-9a-f]{8}\.mp4$/.exec(key);
	return m && `${m[1]}/${m[2]}.mp4`;
}

/**
 * /media/<key> answered from the key's source, whole or by the byte range asked for, as the bucket answers it; anything
 * else, and a key whose source isn't on this machine (`npm run videos pull`), is passed on.
 */
export function serveMedia(req: IncomingMessage, res: ServerResponse, next: () => void) {
	const path = new URL(req.url ?? '/', 'http://localhost').pathname, source = path.startsWith('/media/') && sourceOf(path.slice('/media/'.length));
	const file = source && SOURCES + source;
	if (!file || !existsSync(file)) return next();
	const size = statSync(file).size, range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
	let start = 0, end = size - 1;
	if (range?.[1]) (start = Number(range[1])), (end = range[2] ? Math.min(end, Number(range[2])) : end);
	else if (range?.[2]) start = Math.max(0, size - Number(range[2]));
	if (start > end) return void res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end();
	res.writeHead(range ? 206 : 200, {
		'Content-Type': 'video/mp4',
		'Accept-Ranges': 'bytes',
		'Content-Length': end - start + 1,
		...(range && { 'Content-Range': `bytes ${start}-${end}/${size}` })
	});
	if (req.method === 'HEAD') return void res.end();
	createReadStream(file, { start, end }).pipe(res);
}
