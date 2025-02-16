
<script>
    import { onMount } from 'svelte';
    import { CompoundCreator, dispose } from './compound_creator_3.js';
    import RightSideBar from './right_element_bar.svelte';
    import { store } from './store.js';
    import { global_store } from '../../global_store.js';
    onMount(async () => {
        new CompoundCreator();
    })

    $: show_overlay = (store.game_state.state === store.GameStates.GAMELOST ||
                       store.game_state.state === store.GameStates.GAMEWON);

    function go_back_to_timeline() {
        dispose()
        global_store.current_scene = global_store.possible_scenes.Timeline;
    }
</script>

<div id='outer'>
    <div id='overlay-to-start' style={show_overlay ? 'display: flex;' : 'display: none;'}>
        {#if store.game_state.state === store.GameStates.GAMELOST}
            <h3>You ran out of moves, and the molecule disappeared</h3>
            <div class='button' on:click|stopPropagation={go_back_to_timeline}>Back to the Timeline</div>
        {:else if store.game_state.state === store.GameStates.GAMEWON}
            <h3>You Win!</h3>
            <div class='button' on:click|stopPropagation={go_back_to_timeline}>Back to the Timeline</div>
        {/if}
    </div>
    <RightSideBar/>
    <div id='canvas-container'></div>
</div>

<style>
    #outer {
        background-color: #050505;
        background: radial-gradient(ellipse at center,  rgba(43,45,48,1) 0%,rgba(0,0,0,1) 100%);
    }
    #overlay-to-start {
        position: absolute;
        display: flex;
        width: 100%;
        height: 100%;
        background-color: black;
        z-index: 2;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: #a2a2a2;
        transition: opacity 3s ease-in;
        opacity: 0.6;
    }
    #overlay-to-start .button {
        border: 1px solid white;
        border-radius: 8px;
        padding: 10px;
        font-size: 30px;
        cursor: pointer;
    }
</style>
