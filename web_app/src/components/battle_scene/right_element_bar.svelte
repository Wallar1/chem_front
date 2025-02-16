<script>
    import { get } from 'svelte/store';
    import { store } from './store.js';
    import { fade } from 'svelte/transition';

    function should_highlight(last_updated) {
        // if the last update was recent, the element will be highlighted
        return performance.now() - last_updated < 1000;
    }

    let el_counts = store.current_element_counts
</script>

<div id='sidebar-right'>
    <div id='spacer'></div>
    {#each Object.entries($el_counts) as [el, {count, last_updated}] (el + count)}
        <div in:fade={{ duration: 300 }} class='el-count' class:highlight={should_highlight(last_updated)}>
            <p>{el}: {count}</p>
        </div>
    {/each}
</div>



<style>
    #spacer {
        width: 100%;
        height: 300px;
    }
    #sidebar-right {
		height: 100vh;
		width: 150px;
		background-color: white;
		box-sizing: border-box;
		position: absolute;
		opacity: .7;
		top: 0px;
		left: calc(100vw - 150px);
		float: right;
	}
    .el-count {
        width: 100%;
        height: 80px;
        border: 1px solid gray;
        border-radius: 4px;
        margin: 10px;
    }

    @keyframes highlight-background {
        0% { background-color: yellow; }
        100% { background-color: transparent; }
    }

    .highlight {
        animation: highlight-background 1s ease forwards;
    }
</style>