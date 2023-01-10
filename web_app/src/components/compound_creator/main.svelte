
<script>
    import { onMount } from 'svelte';
    import { CompoundCreator } from './compound_creator.js';
    onMount(async () => {
        new CompoundCreator();
    })
</script>

<div id='outer'>
    <div id='canvas-container'></div>
</div>

<style>
    #outer {
        background-color: #050505;
        background: radial-gradient(ellipse at center,  rgba(43,45,48,1) 0%,rgba(0,0,0,1) 100%);
    }
</style>
