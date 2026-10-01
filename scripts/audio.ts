// `npm run audio` (buildout ticket 22): encodes every sound in audio/sounds.json to the spec's rules ("Format and
// loading") and content-hashes it into static/audio/, writes the map of id to URL that the sound module imports
// (src/lib/sound-files.json), and writes the ledger, docs/audio-sources.md, from the same rows, so the two never disagree.
// Sources, and any licence certificates, live in audio/, outside static/. Run it after changing a row or a source, and
// commit all three outputs. Beds and music (ticket 21) are rows of their own kind in the same manifest, each cut to its
// loop: the period its trim gives, plus the OVERLAP seconds past it that the next pass fades in over (loops.ts). Needs
// ffmpeg and lame (Homebrew's). Audio in audio/sources/alternatives is Joe's, set aside for later, and no row names it.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OVERLAP } from '../src/lib/loops.ts';

/**
 * How each kind is encoded: channels, bitrate and level, a peak in dBFS or a loudness in LUFS; a one-shot must also be
 * shorter than `max` seconds, and a loop's period, its trim, within `loop` seconds. Every file is trimmed, levelled and
 * re-encoded, never served as downloaded.
 */
export const KINDS = {
	'one-shot': { channels: 1, kbps: 96, level: { peak: -6 }, max: 2 },
	// A bed is mono (Joe, 2026-10-01): it is ambience under the theme, and decoded it is held whole, four bytes a sample
	// a channel at the output's rate whatever its bitrate, so one channel halves what the beds near the camera hold, five
	// of them at Join. At 64 kbps the one channel has more bits than each of two had at 96.
	bed: { channels: 1, kbps: 64, level: { lufs: -30 }, loop: [30, 45] },
	// Music's loops are 60 to 120 s by the format rule, but the theme is "a 2 to 3 minute loop", and Joe would have it
	// whatever loops best, longer included (2026-09-30): up to 3 minutes. Sushi Stand's pick, a 54 s loop, repeats every 52 s
	// (Joe, 2026-09-30).
	music: { channels: 2, kbps: 128, level: { lufs: -26 }, loop: [50, 180] }
} as const;

export type Kind = keyof typeof KINDS;

/**
 * The licence ladder (spec: "Sources and licences"), in order of preference. Never CC-BY-NC; CC-BY only once a Credits
 * card is on the signpost, so it isn't here yet; never the agency's Envato seat.
 */
export const LICENCES = ['CC0', 'ElevenLabs paid plan', 'Pixabay Content License', 'AudioJungle Music Standard', 'AudioJungle SFX Single Use'] as const;

export type Licence = (typeof LICENCES)[number];

/**
 * One sound: its id (the sound module's), its kind and what it is for; once sourced, its file under audio/sources/, where
 * it came from, who made it and its licence, the seconds it is trimmed to and any edits beyond the kind's own; and
 * whether Joe has approved it or it is a provisional pick.
 */
export interface Sound {
	id: string;
	kind: Kind;
	use: string;
	status: 'provisional' | 'approved';
	file?: string;
	source?: string;
	title?: string;
	author?: string;
	licence?: Licence;
	trim?: [number, number];
	edits?: string;
}

const isObject = (m: unknown): m is Record<string, unknown> => typeof m === 'object' && m !== null && !Array.isArray(m);
const text = (m: Record<string, unknown>, key: string, where: string) => {
	const v = m[key];
	if (typeof v !== 'string' || !v) throw new Error(`${where}: ${key} must be text`);
	return v;
};
const maybe = (m: Record<string, unknown>, key: string, where: string) => (m[key] === undefined ? undefined : text(m, key, where));
/** Seconds in and out of a source, in order. */
const isTrim = (v: unknown): v is [number, number] =>
	Array.isArray(v) && v.length === 2 && v.every((t) => typeof t === 'number' && t >= 0) && v[0] < v[1];

/** The manifest's JSON, each row checked: a bad row is an error naming it, never a file encoded from a guess. */
export function parse(json: unknown): Sound[] {
	if (!isObject(json) || !Array.isArray(json.sounds)) throw new Error('audio/sounds.json: expected { sounds: [...] }');
	const seen = new Set<string>();
	return json.sounds.map((m: unknown, i): Sound => {
		const where = `audio/sounds.json row ${i + 1}`;
		if (!isObject(m)) throw new Error(`${where}: not an object`);
		const id = text(m, 'id', where);
		if (!/^[a-z][a-z-]*$/.test(id) || seen.has(id)) throw new Error(`${where}: id ${id} is malformed or repeated`);
		seen.add(id);
		const kind = m.kind, status = m.status;
		if (typeof kind !== 'string' || !Object.hasOwn(KINDS, kind)) throw new Error(`${where}: kind must be one of ${Object.keys(KINDS)}`);
		if (status !== 'provisional' && status !== 'approved') throw new Error(`${where}: status must be provisional or approved`);
		const sound: Sound = { id, kind: kind as Kind, use: text(m, 'use', where), status };
		const file = maybe(m, 'file', where);
		if (!file) return sound;
		const licence = text(m, 'licence', where);
		if (!(LICENCES as readonly string[]).includes(licence)) throw new Error(`${where}: licence ${licence} is not on the ladder (${LICENCES.join(', ')})`);
		const trim = m.trim;
		if (trim !== undefined && !isTrim(trim)) throw new Error(`${where}: trim must be [in, out] seconds`);
		const k = KINDS[kind as Kind];
		if ('loop' in k && !(trim && trim[1] - trim[0] >= k.loop[0] && trim[1] - trim[0] <= k.loop[1]))
			throw new Error(`${where}: a ${kind} is cut to a loop of ${k.loop[0]} to ${k.loop[1]} s, its trim [start, start + period]`);
		return {
			...sound,
			file,
			source: text(m, 'source', where),
			title: maybe(m, 'title', where),
			author: text(m, 'author', where),
			licence: licence as Licence,
			...(trim ? { trim } : {}),
			...(typeof m.edits === 'string' && m.edits ? { edits: m.edits } : {})
		};
	});
}

/** What encoding did to a sound, for its ledger row. */
export function edits(s: Sound) {
	const k = KINDS[s.kind];
	const level = 'peak' in k.level ? `peak-normalised to ${k.level.peak} dBFS` : `loudness-matched to ${k.level.lufs} LUFS and limited to a true peak under −1 dBFS`;
	const period = s.trim && +(s.trim[1] - s.trim[0]).toFixed(3);
	const trim = !s.trim ? '' : 'loop' in k ? `cut to a ${period} s loop from ${s.trim[0]} s, with the ${OVERLAP} s past it that the next pass overlaps, ` : `trimmed to ${s.trim[0]}–${s.trim[1]} s, `;
	const done = `${trim}${k.channels === 1 ? 'mono' : 'stereo'}, ${level}, faded in 3 ms and out 10 ms, ${k.kbps} kbps MP3 with a LAME header`;
	return s.edits ? `${s.edits}; ${done}` : done;
}

/** A table cell: pipes escaped, one line. */
const cell = (s: string) => s.replaceAll('|', '\\|').replaceAll('\n', ' ');

/** The ledger, one row per file served (`files`, id to URL), then the rows not yet sourced, which are silent. */
export function ledger(sounds: Sound[], files: Readonly<Record<string, string>>) {
	const rows = sounds
		.filter((s) => files[s.id])
		.map((s) =>
			[
				`\`static${files[s.id]}\``,
				`${s.id}: ${s.use}`,
				`[${s.title ?? s.source}](${s.source})`,
				s.author!,
				s.licence!,
				edits(s),
				s.status === 'approved' ? 'Approved' : 'Provisional, awaiting Joe’s approval'
			]
				.map(cell)
				.join(' | ')
		);
	const missing = sounds.filter((s) => !files[s.id]).map((s) => s.id);
	return [
		'# Audio sources',
		'',
		'Every sound file the site serves, where it came from and under what licence (spec: "Sources and licences"). Generated',
		'by `npm run audio` from `audio/sounds.json`: edit that and rerun, never this file. The sources, and any licence',
		'certificates, are kept in `audio/`, outside `static/`.',
		'',
		'| File | Sound | Source | Author | Licence | Edits | Status |',
		'| --- | --- | --- | --- | --- | --- | --- |',
		...rows.map((r) => `| ${r} |`),
		...(missing.length ? ['', `Not yet sourced, and silent until they are: ${missing.map((id) => `\`${id}\``).join(', ')}.`] : []),
		''
	].join('\n');
}

const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/**
 * A source encoded to its kind's rules; the MP3's bytes. ffmpeg trims, downmixes and levels it in float, so the peak it
 * measures is the peak it sets, and the lame encoder writes the MP3 with its LAME header, which tells decoders the
 * encoder's delay and padding to trim.
 */
function encode(src: string, s: Sound, tmp: string): Buffer {
	const k = KINDS[s.kind];
	// A loop keeps the OVERLAP seconds past its period, which the next pass fades in over.
	const end = s.trim && ('loop' in k ? s.trim[1] + OVERLAP : s.trim[1]);
	const shape = [
		...(s.trim ? [`atrim=${s.trim[0]}:${end}`, 'asetpts=PTS-STARTPTS'] : []),
		`aformat=sample_fmts=flt:channel_layouts=${k.channels === 1 ? 'mono' : 'stereo'}`
	];
	const measure = (filter: string) =>
		spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', src, '-af', [...shape, filter].join(), '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
	let level: string;
	if ('peak' in k.level) {
		// astats reports the peak on stderr, above full scale too, which a decoded MP3 can reach and volumedetect clamps.
		const stderr = measure('astats=measure_perchannel=none:measure_overall=Peak_level');
		const peak = /Peak level dB: (-?[\d.]+)/.exec(stderr);
		if (!peak) throw new Error(`${s.id}: couldn't measure its peak\n${stderr}`);
		level = `volume=${(k.level.peak - Number(peak[1])).toFixed(2)}dB`;
	} else {
		// Measured, then one gain for the whole cut: loudnorm's own one pass rides the level through the file, which would
		// leave a loop's end at another level from its start, where the passes meet.
		// One channel is heard from both speakers, 3 LU louder than it measures alone: measured as the two.
		const stderr = measure(k.channels === 1 ? 'ebur128=dualmono=true' : 'ebur128');
		const lufs = /Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS/.exec(stderr);
		if (!lufs) throw new Error(`${s.id}: couldn't measure its loudness\n${stderr}`);
		level = `volume=${(k.level.lufs - Number(lufs[1])).toFixed(2)}dB`;
	}
	// Short fades where it was cut, so nothing clicks; the fade out by way of the reversed sound, whatever its length.
	const fades = ['afade=t=in:d=0.003', 'areverse', 'afade=t=in:d=0.01', 'areverse'];
	// A loop's gain can lift a lone transient (a laugh, a clap) past full scale: a limiter holds it 2 dB under, which the
	// MP3's own overshoot keeps under a true peak of −1 dBFS. It touches only those peaks, and its delay is compensated.
	if ('loop' in k) level += ',alimiter=limit=0.794:level=false:latency=true';
	const wav = join(tmp, `${s.id}.wav`), mp3 = join(tmp, `${s.id}.mp3`);
	run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-af', [...shape, level, ...fades].join(), '-ar', '44100', '-c:a', 'pcm_s16le', '-map_metadata', '-1', '-fflags', '+bitexact', wav]);
	// No tags, so a source gives the same bytes, and the same hash, every run.
	run('lame', ['--silent', '--cbr', '-b', String(k.kbps), '-m', k.channels === 1 ? 'm' : 'j', '-q', '2', '--noreplaygain', wav, mp3]);
	const length = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]));
	if ('max' in k && !(length < k.max)) throw new Error(`${s.id}: ${length.toFixed(2)} s long, a ${s.kind} must be under ${k.max} s (trim it)`);
	// A source that ends before the loop's overlap does gives a short file, and a loop that skips.
	if (s.trim && 'loop' in k && Math.abs(length - (s.trim[1] - s.trim[0] + OVERLAP)) > 0.1)
		throw new Error(`${s.id}: ${length.toFixed(2)} s long, not its ${s.trim[1] - s.trim[0]} s period and the ${OVERLAP} s overlap: the source ends too soon`);
	return readFileSync(mp3);
}

if (import.meta.main) {
	const root = new URL('../', import.meta.url), at = (path: string) => fileURLToPath(new URL(path, root));
	const sounds = parse(JSON.parse(readFileSync(at('audio/sounds.json'), 'utf8')));
	const tmp = mkdtempSync(join(tmpdir(), 'audio-'));
	mkdirSync(at('static/audio'), { recursive: true });
	const files: Record<string, string> = {};
	try {
		for (const s of sounds) {
			if (!s.file) continue;
			const mp3 = encode(at(`audio/sources/${s.file}`), s, tmp);
			const name = `${s.id}.${createHash('sha256').update(mp3).digest('hex').slice(0, 8)}.mp3`;
			writeFileSync(at(`static/audio/${name}`), mp3);
			files[s.id] = `/audio/${name}`;
			console.log(`${s.id} → static/audio/${name}`);
		}
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
	// A file no row produced any more (a replaced pick, an old hash) is dropped.
	for (const f of readdirSync(at('static/audio'))) if (!Object.values(files).includes(`/audio/${f}`)) rmSync(at(`static/audio/${f}`));
	writeFileSync(at('src/lib/sound-files.json'), `${JSON.stringify(files, null, '\t')}\n`);
	writeFileSync(at('docs/audio-sources.md'), ledger(sounds, files));
	const missing = sounds.filter((s) => !s.file).length;
	console.log(`${Object.keys(files).length} encoded${missing ? `, ${missing} not yet sourced` : ''}; wrote src/lib/sound-files.json and docs/audio-sources.md`);
}
