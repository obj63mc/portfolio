import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// SvelteKit narrows the dev server's file access to src, node_modules and its output; the engine fetches its background
// tiles from art/generated (the rest of art/ is the art workspace and stays unserved).
export default defineConfig({ plugins: [sveltekit()], server: { fs: { allow: ['art/generated'] } } });
