// The site's type on the canvas (Joe, 2026-09-30): the page's self-hosted faces (src/app.css), headlines in Barlow
// Condensed ExtraBold and body copy in Montserrat, and the Foundry marquee's dot-matrix face, which is the canvas's alone. A
// canvas draws in a face only once it has loaded, and never asks for one, so `loadFaces` does; `settled` gathers the fonts
// as they arrive, its size a drawing's key, so that text drawn in a fallback is drawn again in its face.
export const HEADLINE = "'Barlow Condensed', 'Arial Narrow', sans-serif";
export const BODY = 'Montserrat, system-ui, sans-serif';
/** Doto at its roundest dots and black weight, like a marquee's bulbs (scripts/fonts/marquee.py). */
export const MARQUEE = "'Doto Marquee', monospace";

/** The fonts asked for whose faces have loaded, or failed to, leaving their fallback. */
export const settled = new Set<string>();

/** Loads the faces of `fonts`, CSS font shorthands. */
export function loadFaces(...fonts: string[]) {
	for (const font of fonts) document.fonts.load(font).catch(() => []).then(() => void settled.add(font));
}
