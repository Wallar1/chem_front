<script>
	
	import {possible_scenes, current_scene} from './stores.js';
    import Timeline from './components/scientist_timeline/scientist_timeline.svelte';
	import Battle from './components/battle_scene/battle.svelte';
	import CompoundCreator from './components/compound_creator/compound_creator.svelte';
	import BalanceEquation from './components/balance_equation/balance_equation.svelte';
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
	{:else}
		<p>Loading ...</p>
	{/if}
</main>

<style>
</style>