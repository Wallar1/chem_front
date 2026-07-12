import { afterEach, vi } from 'vitest';

// Pure THREE.js / logic tests use @vitest-environment node and skip DOM setup.
if (typeof document !== 'undefined') {
	await import('@testing-library/jest-dom/vitest');
	const { cleanup } = await import('@testing-library/svelte');
	afterEach(() => {
		cleanup();
	});
}

// Polyfills and DOM stubs run once per worker (singleFork => once per test run).
if (typeof document !== 'undefined' && !globalThis.__chemTestEnv) {
	globalThis.__chemTestEnv = true;

	if (!globalThis.performance?.now) {
		globalThis.performance = {
			now: () => Date.now(),
		};
	}

	if (!globalThis.structuredClone) {
		globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
	}

	document.exitPointerLock = vi.fn();
	HTMLElement.prototype.requestPointerLock = vi.fn();

	HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
		canvas: document.createElement('canvas'),
		getExtension: vi.fn(),
		getParameter: vi.fn(),
		viewport: vi.fn(),
		clearColor: vi.fn(),
		clear: vi.fn(),
	}));
}
