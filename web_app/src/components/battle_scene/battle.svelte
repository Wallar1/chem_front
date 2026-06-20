<script>
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
        battle_scene?.destroy?.();
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


    let game_state_store = store.game_state;

    $: game_state = $game_state_store;
    $: show_start_overlay = (
        game_state.state === store.GameStates.STARTING ||
        game_state.state === store.GameStates.GAMELOST ||
        game_state.state === store.GameStates.GAMEWON
    );
    $: show_pause_overlay = game_state.state === store.GameStates.PAUSED;

    $: if (show_start_overlay) {
        document.exitPointerLock();
        battle_scene?.remove_event_listeners();
        battle_scene?.remove_pause_listener?.();
    }

    $: {
        if (game_state.state === store.GameStates.GAMELOST) {
            battle_scene.game_lost()
        } else if (game_state.state === store.GameStates.GAMEWON) {
            battle_scene.game_won();
        }
    }

    function handle_click() {
        let canvas = document.getElementById('canvas-container').firstChild;
        canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
        canvas.requestPointerLock({unadjustedMovement: true,})
        if (game_state.state === store.GameStates.GAMELOST) {
            new_game();
        }
        start_game();
    }

    function go_back_to_timeline() {
        battle_scene?.destroy?.();
        global_store.current_scene = global_store.possible_scenes.Story;
    }
</script>

<div>
    <div id='overlay-to-start' style={show_start_overlay ? 'display: flex;' : 'display: none;'}>
        {#if game_state.state === store.GameStates.STARTING}
            <button type="button" class='button' on:click|stopPropagation={handle_click}>Start</button>
        {:else if game_state.state === store.GameStates.GAMELOST}
            <h3>Game Over</h3>
            <button type="button" class='button' on:click|stopPropagation={go_back_to_timeline}>Back to the Lab</button>
        {:else if game_state.state === store.GameStates.GAMEWON}
            <h3>You Win!</h3>
            <button type="button" class='button' on:click|stopPropagation={go_back_to_timeline}>Back to the Lab</button>
        {/if}
    </div>
    <div id='overlay-paused' style={show_pause_overlay ? 'display: flex;' : 'display: none;'}>
        <h2>Paused</h2>
        <p>Press P or Escape to resume</p>
    </div>
    <HealthBar/>
    <Score/>
    <RightSideBar/>
    <BottomCompoundBar/>
    <div id='cursor'></div>
    <div id='canvas-container'></div>
</div>

<style>
    #overlay-to-start,
    #overlay-paused {
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
    #overlay-paused {
        opacity: 0.65;
        pointer-events: none;
    }
    #overlay-to-start .button {
        border: 1px solid white;
        border-radius: 8px;
        padding: 10px;
        font-size: 30px;
        cursor: pointer;
        background: transparent;
        color: inherit;
        font: inherit;
    }
    #overlay-paused h2 {
        font-size: 48px;
        margin-bottom: 16px;
    }
    #overlay-paused p {
        font-size: 24px;
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
