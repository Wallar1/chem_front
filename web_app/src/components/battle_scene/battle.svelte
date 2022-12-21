<script>
    import { onMount } from 'svelte';
    import { BattleScene } from './basic_gameplay.js';
    import BottomCompoundBar from './bottom_compound_bar.svelte';
    import RightSideBar from './right_element_bar.svelte';
    onMount(async () => {
        new BattleScene();
    })
</script>

<div>
    <RightSideBar/>
    <BottomCompoundBar/>
    <div id='canvas-container'></div>
</div>

