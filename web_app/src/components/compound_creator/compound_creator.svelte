
<script>
    import { onMount } from 'svelte';
    import { CompoundCreator, dispose } from './compound_creator_3.js';
    import RightSideBar from './right_element_bar.svelte';
    import { game_state, GameStates, current_scene, possible_scenes } from '../../stores.js';
    onMount(async () => {
        new CompoundCreator();
    })

    $: show_overlay = ($game_state.state === GameStates.GAMELOST ||
                       $game_state.state === GameStates.GAMEWON);

    function go_back_to_timeline() {
        dispose()
        $current_scene = possible_scenes.Timeline;
        $game_state['state'] = GameStates.STARTING;
    }
</script>

<div id='outer'>
    <div id='overlay-to-start' style={show_overlay ? 'display: flex;' : 'display: none;'}>
        {#if $game_state.state === GameStates.GAMELOST}
            <h3>You ran out of moves, and the molecule disappeared</h3>
            <div class='button' on:click|stopPropagation={go_back_to_timeline}>Back to the Timeline</div>
        {:else if $game_state.state === GameStates.GAMEWON}
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
