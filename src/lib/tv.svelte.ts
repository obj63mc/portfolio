// The Moosylvania lobby TV (Joe, 2026-10-01): a television that plays by itself, muted, and a remote on the meeting
// table that one visitor of the room holds at a time. The room holds the channel and the holder (net/protocol.ts `Tv`);
// the engine copies them here each frame (engine/tv.ts), and Prop.svelte and Remote.svelte draw from here.
import { TV } from './videos.ts';

/** A press-less minute and a held remote goes back on the table, ms: nobody leaves the room without one. */
export const IDLE = 60_000;
/** A channel is shown once it has been still this long, ms, the screen dark meanwhile: surfing starts one download, not one a press. */
export const SETTLE = 400;

/** The room's channel count as a place in the playlist: it goes up and down without end, and wraps both ways. */
export const channelOf = (ch: number) => ((ch % TV.length) + TV.length) % TV.length;

export const tv = $state({
	/** The channel showing, an index into `TV`. */
	channel: 0,
	/** Who holds the remote: this visitor, another in the room, or nobody while it lies on the table. */
	held: null as 'me' | 'other' | null,
	/** This visitor has changed the channel: under reduced motion the TV plays only from then on. */
	tuned: false
});
