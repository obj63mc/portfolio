// The videos a card or the Foundry screen plays, by file name, so a card or the screen names only its file. They are not
// in the build (Joe, 2026-09-30): each is fetched from the media host, an R2 bucket's custom domain, at the key
// `npm run videos` gave it (video-files.json), since the site's own host answers a video whole, never by byte range, and
// takes no file over 25 MiB. Every source under art/sources/videos is there, so any of them can be named. A build off Workers Builds has no media host (scripts/build-env.ts `mediaUrl`) and fetches them
// from /media on its own server, which the dev and preview servers answer from the sources (scripts/media.ts).
import { PUBLIC_MEDIA_URL } from '$app/env/public';
import manifest from './video-files.json';

export const VIDEOS: Record<string, string> = Object.fromEntries(
	Object.entries(manifest.files).map(([file, key]) => [file, `${PUBLIC_MEDIA_URL || '/media'}/${key}`])
);

/** The Moosylvania lobby TV's channels, by file name, in the order `npm run videos` gave them (scripts/videos.ts `TV_FOLDERS`). */
export const TV: readonly string[] = manifest.tv;
