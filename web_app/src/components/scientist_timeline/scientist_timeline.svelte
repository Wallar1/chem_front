<script>
    import {scientists} from './scientists.js';
    import ScientistCard from './scientist_card.svelte';
</script>

<div class='fullscreen'>
    {#each Object.values(scientists) as scientist}
        <ScientistCard scientist={scientist}/>
    {/each}
</div>

<style>
    .fullscreen {
        width: 100vw;
        height: 100vh;
        margin-top: 100px;
        display: flex;
        overflow-x: scroll;
        padding-top: 10px;
    }
</style>