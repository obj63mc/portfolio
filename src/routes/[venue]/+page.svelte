<script lang="ts">
	import type { PageProps } from './$types';
	import SubScene from '#lib/SubScene.svelte';

	let { data }: PageProps = $props();
</script>

<SubScene scene={data.scene} />
