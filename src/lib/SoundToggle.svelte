<script lang="ts">
	import { saved } from './saved.svelte.ts';
	import { sound } from './sound.svelte.ts';
</script>

<!-- The Sound toggle (spec: "Controls"): on unless the visitor turned it off, the choice kept through the saved state. Its
	press is the gesture that resumes audio, or suspends it; before Join it only records the choice. The speaker is struck
	through when off. -->
<button type="button" class="sound" aria-pressed={saved.sound} onclick={() => sound.toggle()}>
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<path class="speaker" d="M3 9h4l5-4v14l-5-4H3z" />
		{#if saved.sound}
			<path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
		{:else}
			<path d="M3 3l18 18" />
		{/if}
	</svg>
	<span>Sound</span>
</button>

<!-- Its tile, icon and hidden label are the controls' (src/app.css). -->
<style>
	.speaker {
		fill: currentColor;
	}
</style>
