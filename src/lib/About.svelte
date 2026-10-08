<script module lang="ts">
	// What each scene is and what is in it (Joe, 2026-10-08): `about.md` in the scene's folder of src/lib/content, built
	// into the page as HTML like a card's copy (vite.config.ts).
	const ABOUT = Object.fromEntries(
		Object.entries(import.meta.glob<string>('./content/*/about.md', { eager: true, import: 'default' })).map(([path, html]) => [path.split('/')[2], html])
	);
</script>

<script lang="ts">
	let { scene }: { scene: string } = $props();
</script>

<!-- Read on the plain document, under the page's headline; with the engine it is kept for a screen reader only (app.css). -->
<section class="about">{@html ABOUT[scene]}</section>
