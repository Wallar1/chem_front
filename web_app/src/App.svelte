<script>
	
	import {possible_scenes, current_scene, last_pressed_key} from './stores.js';
    import Timeline from './components/scientist_timeline/scientist_timeline.svelte';
	import Battle from './components/battle_scene/battle.svelte';
	function set_key(e) {
		let watched_keys = ['q', 'w', 'e', 'r', 't'];
		if (watched_keys.includes(e.key)) {
			last_pressed_key.set(e.key)
		}
	}
	

</script>

<main>
	{#if $current_scene === possible_scenes.Timeline}
		<Timeline/>
	{:else if $current_scene === possible_scenes.Battle}
		<Battle/>
	{:else if $current_scene === possible_scenes.CompoundCreator}
		<p>compound creator</p>
	{:else}
		<p>Loading ...</p>
	{/if}
</main>
<svelte:window on:keypress|preventDefault={set_key} />

<style>
</style>