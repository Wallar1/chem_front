<script>
    import { onMount } from 'svelte';
    import { BattleScene } from './basic_gameplay.js';
    import BottomCompoundBar from './bottom_compound_bar.svelte';
    import RightSideBar from './right_element_bar.svelte';
    import { current_scientist } from '../../stores.js';
    onMount(async () => {
        new BattleScene();
    })
</script>

<div>
    <div style="display: flex; justify-content: center;">
        <h4>{$current_scientist}</h4>
    </div>
    <RightSideBar/>
    <BottomCompoundBar/>
    <div id='canvas-container'></div>
</div>

