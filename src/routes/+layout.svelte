<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<canvas class="scene" aria-hidden="true"></canvas>
<main>
	{@render children()}
</main>
<p class="presence">1 here</p>
<div role="status" aria-live="polite"></div>
<div class="controls">
	<button type="button" aria-pressed="true">Sound</button>
	<button type="button">Analytics settings</button>
</div>
<canvas class="cursors" aria-hidden="true"></canvas>
