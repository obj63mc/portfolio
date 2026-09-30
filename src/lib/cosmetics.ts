import type { CosmeticId } from './scenes/types';

/**
 * The seven cosmetics by id (spec: "Cursor identity"), each worn at one of the arrow's anchors (cursors.ts `ANCHORS`);
 * the props that grant them carry the id in scene data. Id 0 is none.
 */
export const COSMETICS = {
	1: { name: 'graduation cap', anchor: 'head' },
	2: { name: '3D glasses', anchor: 'face' },
	3: { name: 'monster ears', anchor: 'head' },
	4: { name: 'antlers', anchor: 'head' },
	5: { name: 'beer mug', anchor: 'side' },
	6: { name: 'cigar', anchor: 'side' },
	7: { name: 'bike helmet', anchor: 'head' }
} as const satisfies Record<CosmeticId, { name: string; anchor: 'head' | 'face' | 'side' }>;

/** A cosmetic this build knows, narrowed from anything read: storage, the wire. */
export const isCosmetic = (id: unknown): id is CosmeticId => typeof id === 'number' && Object.hasOwn(COSMETICS, id);

/** Every cosmetic this build knows: earning them all turns the cursor gold. */
export const KNOWN = Object.keys(COSMETICS).map(Number) as CosmeticId[];
