<script>
    import {current_scene, possible_scenes, current_scientist} from '../../stores.js';
    import {scientists} from './scientists.js';
    import ScientistCard from './scientist_card.svelte';

    function set_scene(scientist) {
        $current_scientist = scientist.name
        console.log($current_scientist)
        $current_scene = possible_scenes.Battle
    }
</script>

<div class='fullscreen'>
    {#each Object.values(scientists) as scientist}
        <div on:click|stopPropagation={(e) => set_scene(scientist)} class='card'>
            <img src="{scientist.src}" alt={scientist.name}>
            <p>{scientist.name}</p>
        </div>
    {/each}
</div>

<style>
    .fullscreen {
        width: 100vw;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow-x: scroll;
    }

    .card{
        min-width: 300px;
        height: 600px;
        border: 1px solid black;
        border-radius: 5px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    img {
        width: 100%;
        height: 100%;
    }
</style>