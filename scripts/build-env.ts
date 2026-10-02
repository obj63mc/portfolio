// What a build is made with, from its environment: the analytics IDs and the videos' host. vite.config.ts sets them
// before SvelteKit reads the environment (src/env.ts names them), and the tests call these with environments of their own.
import { readFileSync } from 'node:fs';

type Env = Record<string, string | undefined>;

/** The media host and what it holds (`npm run videos`). */
export const media: { host: `https://${string}.${string}` } = JSON.parse(readFileSync(new URL('../src/lib/video-files.json', import.meta.url), 'utf8'));

/**
 * The GA4 measurement ID the site is built with (buildout ticket 23): Workers Builds sets `PUBLIC_GA_ID` for every build,
 * and only a `main` build, `WORKERS_CI_BRANCH` being `main`, passes it through. Previews, local builds and the dev server
 * get none, so they carry no GA script and no queue.
 */
export const measurementId = (env: Env) => (env.WORKERS_CI_BRANCH === 'main' && env.PUBLIC_GA_ID) || '';

/**
 * The host a build fetches its videos from (src/lib/videos.ts): the media host for every Workers Builds build, `main` and
 * Previews alike, and none for a local build or the dev server, which serve the sources themselves under /media
 * (vite.config.ts), so nothing local reaches the network. A build made here to deploy by hand sets `PUBLIC_MEDIA_URL`.
 */
export const mediaUrl = (env: Env) => env.PUBLIC_MEDIA_URL ?? (env.WORKERS_CI_BRANCH ? media.host : '');

/**
 * Cloudflare Web Analytics' site token: public, since the page carries it, and so kept here; `PUBLIC_CF_BEACON` names
 * another. Like the measurement ID it reaches only a `main` build in Workers Builds, so nothing else counts a visit.
 */
const CF_BEACON = '514693578145419188d0063ff1886d55';

export const beaconToken = (env: Env) => (env.WORKERS_CI_BRANCH === 'main' && (env.PUBLIC_CF_BEACON ?? CF_BEACON)) || '';
