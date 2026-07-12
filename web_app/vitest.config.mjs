import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				dev: true,
				compatibility: {
					componentApi: 4,
				},
			},
		}),
	],
	resolve: {
		dedupe: ['svelte'],
		conditions: ['browser', 'development', 'import', 'module', 'default'],
	},
	test: {
		environment: 'jsdom',
		setupFiles: ['./src/test/setup.js'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		// One jsdom worker for the whole run — avoids per-file environment spawn cost.
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},
		fileParallelism: false,
	},
});
