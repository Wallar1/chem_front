<script>
    import { onMount, tick } from 'svelte';
    import { BattleScene } from './basic_gameplay_2.js';
    import BottomCompoundBar from './bottom_compound_bar.svelte';
    import RightSideBar from './right_element_bar.svelte';
    import { GameStates, game_state, current_scene, possible_scenes } from '../../stores.js';
    
    var battle_scene;
    onMount(async () => {
        new_game()
    })

    function new_game() {
        battle_scene = new BattleScene();
    }

    function start_game() {
        game_state.update(currentState => {
            currentState.state = GameStates.PLAYING;
            return currentState;
        });
        battle_scene.add_event_listeners();
        battle_scene.animate();
    }

    $: show_overlay = ($game_state.state === GameStates.STARTING || $game_state.state === GameStates.GAMEOVER);
    $: if (show_overlay) {
        console.log(show_overlay, $game_state.state)
        document.exitPointerLock();
        battle_scene?.remove_event_listeners();
    }

    function handle_click() {
        console.log('clicked')
        let canvas = document.getElementById('canvas-container').firstChild;
        canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
        canvas.requestPointerLock({unadjustedMovement: true,})
        console.log($game_state.state)
        if ($game_state.state === GameStates.GAMEOVER) {
            new_game();
        }
        start_game();
        console.log($game_state.state)
    }

    function go_back_to_timeline() {
        $current_scene = possible_scenes.Timeline;
    }
</script>

<div>
    <div id='overlay-to-start' style={show_overlay ? 'display: flex;' : 'display: none;'}>
        {#if $game_state.state === GameStates.STARTING}
            <div class='button' on:click|stopPropagation={handle_click}>Start</div>
        {:else if $game_state.state === GameStates.GAMEOVER}
            <h3>Game Over</h3>
            <div class='button' on:click|stopPropagation={go_back_to_timeline}>Back to the Lab</div>
        {/if}
    </div>
    <RightSideBar/>
    <BottomCompoundBar/>
    <div id='cursor'></div>
    <div id='canvas-container'></div>
</div>

<style>
    #overlay-to-start {
        position: absolute;
        display: flex;
        width: 100%;
        height: 100%;
        background-color: black;
        opacity: 0.8;
        z-index: 2;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
    #overlay-to-start .button {
        /* position: absolute;
        top: 50%;
        left: 50%; */
        /* transform: translate(-50%, -50%); */
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
