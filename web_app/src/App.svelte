<script>
	
	import { global_store } from './global_store.js';
	import { battle_assets_preload } from './components/battle_scene/store.js';

	const { current_scene, possible_scenes } = global_store;
    import Timeline from './components/scientist_timeline/scientist_timeline.svelte';
	import Battle from './components/battle_scene/battle.svelte';
	import CompoundCreator from './components/compound_creator/compound_creator.svelte';
	import BalanceEquation from './components/balance_equation/balance_equation.svelte';
	import Story from './components/story_scene/story_scene.svelte';
	import Workshop from './components/workshop/workshop.svelte';
	import { preload_battle_assets } from './components/battle_scene/enemies.js';

	preload_battle_assets();

	$: preload = $battle_assets_preload;
	$: show_battle_preload = preload.total > 0 && !preload.complete;
	$: preload_percent = preload.total > 0
		? Math.round((preload.loaded / preload.total) * 100)
		: 0;
</script>

<main>
	{#if $current_scene === possible_scenes.CompoundCreator}
		<CompoundCreator/>
	{:else if $current_scene === possible_scenes.Timeline}
		<Timeline/>
	{:else if $current_scene === possible_scenes.Battle}
		<Battle/>
	{:else if $current_scene === possible_scenes.BalanceEquation}
		<BalanceEquation/>
	{:else if $current_scene === possible_scenes.Story}
		<Story/>
	{:else if $current_scene === possible_scenes.Workshop}
		<Workshop/>
	{:else}
		<p>Loading ...</p>
	{/if}

	{#if show_battle_preload}
		<div class="battle-preload" aria-live="polite" aria-busy="true">
			<p class="battle-preload-label">Loading battle assets ({preload.loaded}/{preload.total})</p>
			<div class="battle-preload-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={preload_percent}>
				<div class="battle-preload-fill" style="width: {preload_percent}%"></div>
			</div>
		</div>
	{/if}
</main>

<style>
	.battle-preload {
		position: fixed;
		left: 50%;
		bottom: 24px;
		transform: translateX(-50%);
		width: min(420px, calc(100vw - 32px));
		padding: 12px 16px;
		background: rgba(0, 0, 0, 0.82);
		border: 1px solid #a2a2a2;
		border-radius: 8px;
		color: #a2a2a2;
		z-index: 1000;
		box-sizing: border-box;
	}

	.battle-preload-label {
		margin: 0 0 8px;
		font-size: 14px;
		text-align: center;
	}

	.battle-preload-track {
		height: 8px;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		overflow: hidden;
	}

	.battle-preload-fill {
		height: 100%;
		background: #ffffff;
		border-radius: 4px;
		transition: width 0.2s ease;
	}
</style>