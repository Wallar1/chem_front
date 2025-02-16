<script>
	
	import { get } from 'svelte/store';
	import { global_store } from './global_store.js';
    import Timeline from './components/scientist_timeline/scientist_timeline.svelte';
	import Battle from './components/battle_scene/battle.svelte';
	import CompoundCreator from './components/compound_creator/compound_creator.svelte';
	import BalanceEquation from './components/balance_equation/balance_equation.svelte';
	import Story from './components/story_scene/story_scene.svelte';
	import {MODEL_CONFIGS, load_texture, load_model, update_animation} from './components/battle_scene/enemies.js';

	// Start loading the models into the cache to see if it speeds things up
	for (const model of MODEL_CONFIGS) {
		let {
            model_name,
            animation_name,
            scale,
            initial_health,
            health_bar_z,
            damage
        } = model;

        load_texture()
        load_model(model_name, scale).then(fbx_model => update_animation(fbx_model, animation_name))
	}

	console.log(global_store)
</script>

<main>
	{#if get(global_store.current_scene) === global_store.possible_scenes.CompoundCreator}
		<CompoundCreator/>
	{:else if get(global_store.current_scene) === global_store.possible_scenes.Timeline}
		<Timeline/>
	{:else if get(global_store.current_scene) === global_store.possible_scenes.Battle}
		<Battle/>
	{:else if get(global_store.current_scene) === global_store.possible_scenes.BalanceEquation}
		<BalanceEquation/>
	{:else if get(global_store.current_scene) === global_store.possible_scenes.Story}
		<Story/>
	{:else}
		<p>Loading ...</p>
	{/if}
</main>

<style>
</style>