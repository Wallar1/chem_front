<script>
	// import { CharacterControllerDemo } from './simon_dev_controller.js'
	// new CharacterControllerDemo();

	import {BasicGameplay} from './basic_gameplay.js'
	import {update_selected} from './ui.js';
	document.addEventListener('DOMContentLoaded', (event) => {
		new BasicGameplay();
	});

	export let name;
</script>

<main>
	<div id='sidebar-right'></div>
	<div id='sidebar-bottom'>
		<div class='button' on:click={update_selected}>H2</div>
		<div class='button' on:click={update_selected}>CH4</div>
		<div class='button' on:click={update_selected}>NH3</div>
		<div class='button' on:click={update_selected}>CN</div>
		<div class='button' on:click={update_selected}>H2O</div>
	</div>
	<div id='canvas-container'></div>
	<h1>Hello {name}!</h1>
	<p>Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.</p>
</main>

<style>
	main {
		text-align: center;
		max-width: 240px;
		margin: 0 auto;
		position: sticky;
		top: 0px;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}

	

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

	#sidebar-bottom {
		height: 150px;
		width: calc(100vw - 150px);
		background-color: white;
		box-sizing: border-box;
		position: absolute;
		opacity: .7;
		left: 0px;
		top: calc(100vh - 150px);
		float: right;
		display: flex;
		justify-content: space-around;
		align-items: center;
	}

	.button {
		width: 50px;
		height: 50px;
		background-color: antiquewhite;
		border: 1px solid black;
	}

	
</style>