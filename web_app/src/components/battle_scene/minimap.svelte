<script>
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { store } from './store.js';
	import { compute_minimap_indicators } from './minimap.js';

	const DISC_SIZE = 110;
	const RING_RADIUS = 42;

	let indicators = [];
	let raf_id = 0;

	function tick() {
		const state = get(store.game_state)?.state;
		if (state === store.GameStates.PLAYING || state === store.GameStates.PAUSED) {
			indicators = compute_minimap_indicators(store.camera, store.enemies);
		} else {
			indicators = [];
		}
		raf_id = requestAnimationFrame(tick);
	}

	onMount(() => {
		raf_id = requestAnimationFrame(tick);
	});

	onDestroy(() => {
		if (raf_id) {
			cancelAnimationFrame(raf_id);
		}
	});

	function dot_style(indicator) {
		const x = Math.sin(indicator.angle) * RING_RADIUS;
		const y = -Math.cos(indicator.angle) * RING_RADIUS;
		const size = indicator.size;
		return `
			width: ${size}px;
			height: ${size}px;
			transform: translate(${x}px, ${y}px) translate(-50%, -50%);
		`;
	}
</script>

<div id="minimap" aria-label="Enemy minimap" style={`width: ${DISC_SIZE}px; height: ${DISC_SIZE}px;`}>
	<div class="disc">
		<div class="forward-marker"></div>
		<div class="player-marker"></div>
		{#each indicators as indicator, i (i)}
			<div class="enemy-dot" style={dot_style(indicator)}></div>
		{/each}
	</div>
</div>

<style>
	#minimap {
		position: absolute;
		left: 30px;
		top: 140px;
		z-index: 2;
		pointer-events: none;
	}

	.disc {
		position: relative;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: radial-gradient(circle at 45% 40%, rgba(70, 95, 80, 0.55), rgba(15, 25, 20, 0.75));
		border: 2px solid rgba(210, 230, 215, 0.55);
		box-sizing: border-box;
		overflow: hidden;
	}

	.player-marker {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 8px;
		height: 8px;
		margin: -4px 0 0 -4px;
		border-radius: 50%;
		background: rgba(240, 248, 240, 0.95);
	}

	.forward-marker {
		position: absolute;
		top: 10px;
		left: 50%;
		width: 0;
		height: 0;
		margin-left: -5px;
		border-left: 5px solid transparent;
		border-right: 5px solid transparent;
		border-bottom: 8px solid rgba(200, 230, 210, 0.85);
	}

	.enemy-dot {
		position: absolute;
		top: 50%;
		left: 50%;
		border-radius: 50%;
		background: rgb(255, 72, 72);
		box-shadow: 0 0 4px rgba(255, 60, 60, 0.7);
	}
</style>
