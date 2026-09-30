// The videos a card or the Foundry screen plays, served from where Joe keeps them (art/sources/videos/universal, and beer and
// liquor for the Side Project bottles) and hashed into the build by path, never inlined; by file name, so a card or the
// screen names only its file.
const FILES = import.meta.glob<string>('/art/sources/videos/{universal,beer,liquor}/*.mp4', { eager: true, query: '?no-inline', import: 'default' });
export const VIDEOS: Record<string, string> = Object.fromEntries(Object.entries(FILES).map(([path, url]) => [path.split('/').pop()!, url]));
