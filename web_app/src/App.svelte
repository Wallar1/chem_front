<script>
	// import { CharacterControllerDemo } from './simon_dev_controller.js'
	// new CharacterControllerDemo();

	import {BasicGameplay} from './basic_gameplay.js';
	import {last_pressed_key} from './components/stores.js';
	import BottomCompoundBar from './components/bottom_compound_bar.svelte';
	document.addEventListener('DOMContentLoaded', (event) => {
		new BasicGameplay();
	});
	function set_key(e) {
		let watched_keys = ['q', 'w', 'e', 'r', 't'];
		if (watched_keys.includes(e.key)) {
			last_pressed_key.set(e.key)
		}
	}
</script>

<main>
	<div id='sidebar-right'></div>
	<BottomCompoundBar/>
	<div id='canvas-container'></div>
</main>
<svelte:window on:keypress|preventDefault={set_key} />

<style>

	#sidebar-right {
		height: 100vh;
		width: 150px;
		background-color: white;
		box-sizing: border-box;
		position: absolute;
		opacity: .7;
		top: 0px;
		left: calc(100vw - 150px);
		float: right;
	}
</style>