<script>
    import { get } from 'svelte/store';
    import { onMount } from 'svelte';
    import { BattleScene } from './basic_gameplay_2.js';
    import BottomCompoundBar from './bottom_compound_bar.svelte';
    import RightSideBar from './right_element_bar.svelte';
    import HealthBar from './health_bar.svelte';
    import Score from './score.svelte';
    import { store } from './store.js';
    import { global_store } from '../../global_store.js';
    
    var battle_scene;
    onMount(async () => {
        new_game()
    })

    function new_game() {
        battle_scene = new BattleScene();
    }

    function start_game() {
        store.game_state.update(currentState => {
            currentState.state = store.GameStates.PLAYING;
            return currentState;
        });
        battle_scene.add_event_listeners();
        battle_scene.animate();
    }


    $: show_overlay = (get(store.game_state).state === store.GameStates.STARTING || 
                       get(store.game_state).state === store.GameStates.GAMELOST ||
                       get(store.game_state).state === store.GameStates.GAMEWON);
    $: if (show_overlay) {
        console.log(show_overlay, get(store.game_state).state)
        document.exitPointerLock();
        battle_scene?.remove_event_listeners();
    }

    $: {
        if (get(store.game_state).state === store.GameStates.GAMELOST) {
            battle_scene.game_lost()
        } else if (get(store.game_state).state === store.GameStates.GAMEWON) {
            battle_scene.game_won();
        }
    }

    function handle_click() {
        console.log('clicked')
        let canvas = document.getElementById('canvas-container').firstChild;
        canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
        canvas.requestPointerLock({unadjustedMovement: true,})
        show_overlay = false;
        if (get(store.game_state).state === store.GameStates.GAMELOST) {
            new_game();
        }
        start_game();
    }

    function go_back_to_timeline() {
        global_store.current_scene = possible_scenes.Story;
    }
</script>

<div>
    <div id='overlay-to-start' style={show_overlay ? 'display: flex;' : 'display: none;'}>
        {#if get(store.game_state).state === store.GameStates.STARTING}
            <div class='button' on:click|stopPropagation={handle_click}>Start</div>
        {:else if get(store.game_state).state === store.GameStates.GAMELOST}
            <h3>Game Over</h3>
            <div class='button' on:click|stopPropagation={go_back_to_timeline}>Back to the Lab</div>
        {:else if get(store.game_state).state === store.GameStates.GAMEWON}
            <h3>You Win!</h3>
            <div class='button' on:click|stopPropagation={go_back_to_timeline}>Back to the Lab</div>
        {/if}
    </div>
    <HealthBar/>
    <Score/>
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
        color: #a2a2a2;
    }
    #overlay-to-start .button {
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
