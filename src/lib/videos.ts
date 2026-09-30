// The videos a card or the Foundry screen plays, served from where Joe keeps them (art/sources/videos) and hashed into
// the build by path, never inlined.
export const VIDEOS = import.meta.glob<string>('/art/sources/videos/*.mp4', { eager: true, query: '?no-inline', import: 'default' });
