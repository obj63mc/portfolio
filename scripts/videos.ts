// `npm run videos` (Joe, 2026-09-30): the site's videos live in an R2 bucket behind the media host, not in the build,
// where the host answers a video whole and never by byte range and no file may pass 25 MiB. The sources stay in
// art/sources/videos/<folder>/, and every one of them goes up, played yet or not, so a prop's card or a Foundry reel has
// only to name a file to play it. src/lib/video-files.json is the map the site reads (videos.ts): the host, the bucket
// and each file's key (scripts/media.ts). The bucket is the videos' backup too, so nothing here ever deletes from it:
// a replaced video's old key stays there, and a video whose source is gone from this machine keeps its place in the map.
//
//   npm run videos                  sync: rewrite the map from the sources, then upload each key the host hasn't got
//   npm run videos -- --no-upload   the map alone, offline
//   npm run videos status           each video's source here and its copy on the host
//   npm run videos pull             fetch the sources this machine is missing from the host
//
// Sync, then commit the map, then push: a build that names a key the bucket hasn't got plays nothing. Uploads go
// through wrangler, so it needs `wrangler login`; the bucket and its custom domain are made once (art/README.md).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OVERWORLD } from '../src/lib/scenes/overworld.ts';
import { SCREEN_VIDEOS } from '../src/lib/scenes/foundry.ts';
import { SUB_SCENES, propsOf } from '../src/lib/scenes/index.ts';
import { SOURCES, keyOf, sourceOf } from './media.ts';

export interface Manifest {
	/** The media host, the bucket's custom domain. */
	host: string;
	bucket: string;
	/** Each video on the host, by file name, to its key. */
	files: Record<string, string>;
	/** The Moosylvania lobby TV's channels, by file name, in order (`TV_FOLDERS`). */
	tv: string[];
}

/**
 * The folders whose videos the Moosylvania lobby TV plays, in channel order (Joe, 2026-10-01): the agency's own site by
 * year, then the work. Within a folder the channels go by file name, so a video put in one of them is a channel at the
 * next sync.
 */
export const TV_FOLDERS: readonly string[] = ['moosylvania', 'beer', 'cigar', 'liquor', 'paypal', 'universal'];

/** Every video the site plays, by file name: each prop's card video and each of the Foundry screen's reels. */
export const used = () => {
	const cards = [OVERWORLD, ...Object.values(SUB_SCENES)].flatMap((s) => propsOf(s)).flatMap((p) => (p.video ? [p.video.file] : []));
	return [...new Set([...cards, ...Object.values(SCREEN_VIDEOS).map((v) => v.file)])].sort();
};

/** Every source on this machine, by file name; the site names a video by its file alone, so no two folders may share one. */
export function sources() {
	const folders = existsSync(SOURCES) ? readdirSync(SOURCES, { withFileTypes: true }).filter((d) => d.isDirectory()) : [];
	const files = folders.flatMap((d) => readdirSync(SOURCES + d.name).filter((f) => f.endsWith('.mp4')));
	const twice = files.find((f, i) => files.indexOf(f) !== i);
	if (twice) throw new Error(`${twice}: in two folders of art/sources/videos; a video is named by its file alone`);
	return files;
}

/**
 * The map after a sync of `files`, the sources here and the videos played: each at the key its source now hashes to, or
 * at the key it has where its source isn't on this machine. A video already in the map stays in it, its source here or
 * not: the bucket keeps every video it was ever given. The lobby TV's channels are rewritten from the map each time.
 */
export function plan(was: Manifest, files: readonly string[], local: (file: string) => { folder: string; hash: string } | null): Manifest {
	const now: Record<string, string> = {};
	for (const file of [...new Set([...files, ...Object.keys(was.files)])].sort()) {
		const l = local(file), key = l ? keyOf(l.folder, file, l.hash) : was.files[file];
		if (!key) throw new Error(`${file}: no such file in a folder of art/sources/videos, and no key for it in the map`);
		now[file] = key;
	}
	// A key's folder is its second segment (scripts/media.ts); `now` is already in file-name order, and the sort is stable.
	const folder = (file: string) => TV_FOLDERS.indexOf(now[file].split('/')[1]);
	const tv = Object.keys(now).filter((f) => folder(f) >= 0).sort((a, b) => folder(a) - folder(b));
	return { host: was.host, bucket: was.bucket, files: now, tv };
}

const hashOf = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 8);

/** A video's source on this machine: the folder of art/sources/videos that holds it, and its content's hash. */
export function local(file: string) {
	const folder = existsSync(SOURCES) && readdirSync(SOURCES, { withFileTypes: true }).find((d) => d.isDirectory() && existsSync(`${SOURCES}${d.name}/${file}`))?.name;
	return folder ? { folder, hash: hashOf(`${SOURCES}${folder}/${file}`) } : null;
}

if (import.meta.main) {
	const args = process.argv.slice(2), cmd = args.find((a) => !a.startsWith('--')) ?? 'sync';
	const path = fileURLToPath(new URL('../src/lib/video-files.json', import.meta.url));
	const was: Manifest = JSON.parse(readFileSync(path, 'utf8'));
	const write = (m: Manifest) => writeFileSync(path, `${JSON.stringify(m, null, '\t')}\n`);
	// Asked under a query of its own, never the video's URL itself: the host's cache keeps a miss for minutes, and one
	// kept for a key about to be uploaded would be the 404 its first visitors got.
	const hosted = (key: string) => fetch(`${was.host}/${key}?check=${Date.now()}`, { method: 'HEAD' }).then((r) => r.ok, () => false);
	const upload = (key: string, file: string) => {
		const put = ['wrangler', 'r2', 'object', 'put', `${was.bucket}/${key}`, '--file', file, '--content-type', 'video/mp4', '--cache-control', 'public, max-age=31536000, immutable', '--remote'];
		if (spawnSync('npx', put, { stdio: 'inherit' }).status !== 0) throw new Error(`${key}: the upload failed`);
	};
	const source = (key: string) => SOURCES + sourceOf(key)!;

	if (cmd === 'sync') {
		const now = plan(was, [...sources(), ...used()], local);
		write(now);
		console.log(`${Object.keys(now.files).length} videos in src/lib/video-files.json`);
		if (!args.includes('--no-upload')) {
			let up = 0;
			for (const key of Object.values(now.files)) {
				if (await hosted(key)) continue;
				if (!existsSync(source(key))) throw new Error(`${key}: not on ${now.host}, and its source isn't here to upload`);
				upload(key, source(key));
				up++;
			}
			console.log(`${up} uploaded to ${now.bucket}; the rest were already on ${now.host}`);
		}
	} else if (cmd === 'status') {
		for (const [file, key] of Object.entries(was.files)) {
			const l = local(file), here = !l ? 'no source here' : keyOf(l.folder, file, l.hash) === key ? 'source current' : 'source changed: sync';
			console.log(`${key}\n  ${here}; ${(await hosted(key)) ? 'on the host' : 'NOT on the host'}`);
		}
		const unsynced = [...new Set([...sources(), ...used()])].filter((f) => !was.files[f]);
		if (unsynced.length) console.log(`not in the map (sync): ${unsynced.join(', ')}`);
	} else if (cmd === 'pull') {
		for (const key of Object.values(was.files)) {
			if (existsSync(source(key))) continue;
			const res = await fetch(`${was.host}/${key}`);
			if (!res.ok) throw new Error(`${key}: ${res.status} from ${was.host}`);
			const bytes = Buffer.from(await res.arrayBuffer());
			if (!key.endsWith(`.${createHash('sha256').update(bytes).digest('hex').slice(0, 8)}.mp4`)) throw new Error(`${key}: what ${was.host} sent isn't the file the key names`);
			mkdirSync(dirname(source(key)), { recursive: true });
			writeFileSync(source(key), bytes);
			console.log(`${key} → art/sources/videos/${sourceOf(key)}`);
		}
	} else throw new Error(`npm run videos [sync | status | pull] [-- --no-upload], not "${cmd}"`);
}
