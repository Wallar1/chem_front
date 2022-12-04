<script>
    import { onMount } from 'svelte';
    import { BattleScene } from './basic_gameplay.js';
    import BottomCompoundBar from './bottom_compound_bar.svelte';
    import { current_scientist } from '../../stores.js';
    onMount(async () => {
        new BattleScene();
    })
</script>

<div>
    <div style="display: flex; justify-content: center;">
        <h4>{$current_scientist}</h4>
    </div>
    <div id='sidebar-right'></div>
    <BottomCompoundBar/>
    <div id='canvas-container'></div>
</div>

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