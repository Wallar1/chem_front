<script>
    import {scientists} from './scientists.js';
    import ScientistCard from './scientist_card.svelte';


    import {current_scene, possible_scenes} from '../../stores.js';

    function set_random_lab_scene(e) {
        $current_scene = Math.random() < 0.5 ? possible_scenes.CompoundCreator : possible_scenes.BalanceEquation;
    }
</script>

<div class='widescreen'>
    {#each Object.values(scientists) as scientist}
        <ScientistCard scientist={scientist}/>
    {/each}
</div>
<div class="lab-equipment">
    <img src="lab_equipment.webp" on:click|stopPropagation={set_random_lab_scene} alt="lab equipment">
</div>

<style>
    .widescreen {
        width: 100vw;
        height: 40vh;
        margin-top: 100px;
        display: flex;
        overflow-x: scroll;
        padding-top: 10px;
    }
    .lab-equipment {
        display: flex;
        justify-content: center;
    }
</style>