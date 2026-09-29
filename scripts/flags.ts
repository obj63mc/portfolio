// Renders the cursor atlas's flag sheet (buildout ticket 13): every two-letter country flag from the flag-icons package,
// plus the St. Louis city flag first, one 40 x 30 cell each, the size of the own cursor's badge at DPR 2. The browser
// rasterizes them here, once, because Firefox can't draw an SVG without a width and height onto a canvas and the page's
// CSP allows no data: or blob: images. Run `npm run flags` after updating flag-icons and commit both outputs.
import { chromium } from '@playwright/test';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const W = 40;
const H = 30;
const COLS = 16;
const dir = new URL('../node_modules/flag-icons/flags/4x3/', import.meta.url);
const out = new URL('../src/lib/engine/', import.meta.url);

// The city flag, simplified to read at a few pixels: a red field, the Missouri and the Mississippi meeting in a wavy
// white-edged blue band, and the gold bezant with its fleur-de-lis as a blue dot at the confluence.
const RIVERS = 'M0 3Q8 5 13 15Q8 25 0 27M13 15Q20 11 27 15T40 15';
const STL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><path fill="#c8102e" d="M0 0h${W}v${H}H0z"/><g fill="none" stroke-linecap="round"><path stroke="#fff" stroke-width="8" d="${RIVERS}"/><path stroke="#1f5fd1" stroke-width="4.5" d="${RIVERS}"/></g><circle cx="13" cy="15" r="5.5" fill="#f5c518"/><circle cx="13" cy="15" r="2.2" fill="#1f5fd1"/></svg>`;

// flag-icons also draws `xx` (unknown, a grey placeholder), `eu` and `un`: unknown or non-country geo wears the St. Louis
// flag (spec: flag), so they get no cell and fall back to it.
const NOT_COUNTRIES = new Set(['xx', 'eu', 'un']);
const codes = readdirSync(dir)
	.filter((f) => /^[a-z]{2}\.svg$/.test(f))
	.map((f) => f.slice(0, 2))
	.filter((c) => !NOT_COUNTRIES.has(c))
	.sort();
const svgs = [STL, ...codes.map((c) => readFileSync(new URL(`${c}.svg`, dir), 'utf8'))];

const browser = await chromium.launch();
const page = await browser.newPage();
const webp = await page.evaluate(
	async ({ svgs, W, H, COLS }) => {
		const c = document.createElement('canvas');
		c.width = COLS * W;
		c.height = Math.ceil(svgs.length / COLS) * H;
		const g = c.getContext('2d')!;
		await Promise.all(
			svgs.map(async (svg, i) => {
				const img = new Image(W, H);
				img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
				await img.decode();
				g.drawImage(img, (i % COLS) * W, Math.floor(i / COLS) * H, W, H);
			})
		);
		return c.toDataURL('image/webp', 0.9);
	},
	{ svgs, W, H, COLS }
);
await browser.close();
writeFileSync(new URL('flags.webp', out), Buffer.from(webp.split(',')[1], 'base64'));
writeFileSync(new URL('flags.json', out), JSON.stringify({ w: W, h: H, cols: COLS, codes: ['stl', ...codes] }) + '\n');
console.log(`${svgs.length} flags`);
