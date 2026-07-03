import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';

afterEach(() => {
	cleanup();
});

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
