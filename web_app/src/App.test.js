import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('./components/battle_scene/enemies.js', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		preload_battle_assets: vi.fn(() => Promise.resolve()),
	};
});

vi.mock('./components/battle_scene/basic_gameplay_2.js', () => ({
	BattleScene: class {
		add_event_listeners() {}
		remove_event_listeners() {}
		remove_pause_listener() {}
		animate() {}
		destroy() {}
		game_lost() {}
		game_won() {}
	},
}));

vi.mock('./components/compound_creator/compound_creator_3.js', () => ({
	CompoundCreator: class {},
	dispose: vi.fn(),
}));

vi.mock('./components/balance_equation/balance_equation.js', () => ({
	BalanceEquationScene: class {},
	end_scene: vi.fn(),
}));

import App from './App.svelte';
import { global_store } from './global_store.js';

const { current_scene, possible_scenes } = global_store;

describe('App', () => {
	beforeEach(() => {
		current_scene.set(possible_scenes.Battle);
	});

	it('mounts without store subscription errors when Battle is the active scene', () => {
		render(App);
		expect(screen.getByText('Start')).toBeTruthy();
	});

	it('switches scenes through global_store', async () => {
		const { container, rerender } = render(App);
		expect(screen.getByText('Start')).toBeTruthy();

		current_scene.set(possible_scenes.Timeline);
		await rerender({});
		expect(get(current_scene)).toBe(possible_scenes.Timeline);
		expect(container.querySelector('.widescreen')).toBeTruthy();

		current_scene.set(possible_scenes.Story);
		await rerender({});
		expect(get(current_scene)).toBe(possible_scenes.Story);
		expect(screen.getByAltText('blasting_off')).toBeTruthy();
	});
});
