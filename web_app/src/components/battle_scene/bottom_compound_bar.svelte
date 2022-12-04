<script>
    import CompoundCard from './compound_card.svelte';
    import {key_to_compound, selected_compound} from '../../stores.js';
</script>

<div id='sidebar-bottom'>
    {#each Object.values($key_to_compound) as compound}
        <CompoundCard highlighted={compound === $selected_compound} el_name={compound}/>
    {/each}
</div>

<style>
    #sidebar-bottom {
		height: 250px;
		width: calc(100vw - 150px);
		background-color: white;
		box-sizing: border-box;
		position: absolute;
		opacity: .7;
		left: 0px;
		top: calc(100vh - 250px);
		float: right;
		display: flex;
		justify-content: space-around;
		align-items: center;
	}
</style>