<script>
    import { onMount } from 'svelte';
    import { BattleScene } from './basic_gameplay_2.js';
    import BottomCompoundBar from './bottom_compound_bar.svelte';
    import RightSideBar from './right_element_bar.svelte';
    
    var battle_scene;
    onMount(async () => {
        battle_scene = new BattleScene();
    })

    function handle_click() {
        let canvas = document.getElementById('canvas-container').firstChild;
        console.log(canvas)
        canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
        canvas.requestPointerLock()
        battle_scene.add_event_listeners();
        battle_scene.animate();
        document.getElementById('overlay-to-start').style.display = 'none';
    }
</script>

<div>
    <div id='overlay-to-start'>
        <div class='button' on:click|stopPropagation={handle_click}>Start</div>
    </div>
    <RightSideBar/>
    <BottomCompoundBar/>
    <div id='cursor'></div>
    <div id='canvas-container'></div>
</div>

<style>
    #overlay-to-start {
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: black;
        opacity: 0.5;
        z-index: 2;
    }
    #overlay-to-start .button {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border: 1px solid white;
        border-radius: 8px;
        padding: 10px;
        font-size: 30px;
        cursor: pointer;
    }
    #cursor {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: white;
        z-index: 3;
    }
</style>

