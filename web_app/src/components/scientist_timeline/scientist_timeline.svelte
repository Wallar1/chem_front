<script>
    import {scientists} from './scientists.js';
    import ScientistCard from './scientist_card.svelte';


    import {current_scene, possible_scenes} from '../../stores.js';

    function set_compound_creator_scene() {
        $current_scene = possible_scenes.CompoundCreator
    }
</script>

<div class='widescreen'>
    {#each Object.values(scientists) as scientist}
        <ScientistCard scientist={scientist}/>
    {/each}
</div>
<div>
    <p on:click|stopPropagation={e => set_compound_creator_scene()}>Build Compounds In The Lab</p>
</div>

<style>
    .widescreen {
        width: 100vw;
        height: 60vh;
        margin-top: 100px;
        display: flex;
        overflow-x: scroll;
        padding-top: 10px;
    }
</style>