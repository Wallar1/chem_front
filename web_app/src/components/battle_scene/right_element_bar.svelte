<script>
    import {current_element_counts} from '../../stores.js';
</script>

<div id='sidebar-right'>
    <div id='spacer'></div>
    {#each Object.entries($current_element_counts) as [el, count]}
        <div class='el-count'>
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
</style>