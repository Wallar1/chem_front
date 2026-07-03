import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';

vi.mock('./basic_gameplay_2.js', () => ({
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

import HealthBar from './health_bar.svelte';
import RightElementBar from './right_element_bar.svelte';
import BottomCompoundBar from './bottom_compound_bar.svelte';
import Battle from './battle.svelte';
import { store } from './store.js';

describe('battle scene components', () => {
	it('renders HealthBar with player health from the store', () => {
		store.player_health.set(75);
		const { container } = render(HealthBar);
		const health = container.querySelector('.health');
		expect(health).toBeTruthy();
		expect(health.style.width).toBe('75%');
	});

	it('renders RightElementBar with element counts from the store', () => {
		const { container } = render(RightElementBar);
		expect(container.querySelector('#sidebar-right')).toBeTruthy();
		expect(screen.getByText(/H:/)).toBeTruthy();
	});

	it('renders BottomCompoundBar with keyboard compounds', () => {
		const { container } = render(BottomCompoundBar);
		expect(container.querySelector('#sidebar-bottom')).toBeTruthy();
		expect(container.querySelectorAll('.card').length).toBeGreaterThan(0);
	});

	it('mounts Battle without store subscription errors', () => {
		const { container } = render(Battle);
		expect(container.querySelector('#canvas-container')).toBeTruthy();
		expect(screen.getByText('Start')).toBeTruthy();
	});
});
