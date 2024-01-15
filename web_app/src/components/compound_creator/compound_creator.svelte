
<script>
    import { onMount } from 'svelte';
    import { CompoundCreator } from './compound_creator_3.js';
    import RightSideBar from './right_element_bar.svelte';
    onMount(async () => {
        new CompoundCreator();
    })
</script>

<div id='outer'>
    <RightSideBar/>
    <div id='canvas-container'></div>
</div>

<style>
    #outer {
        background-color: #050505;
        background: radial-gradient(ellipse at center,  rgba(43,45,48,1) 0%,rgba(0,0,0,1) 100%);
    }
</style>
