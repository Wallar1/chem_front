<script>
    import CompoundCard from './compound_card.svelte';
	import { formula_to_damage_dict } from '../../compounds';
	import { key_to_compound, max_number_possible_for_each_compound } from '../../stores.js';
</script>

<div id='sidebar-bottom'>
    {#each Object.entries($key_to_compound) as [key, compound]}
        <CompoundCard key={key} el_name={compound} damage={formula_to_damage_dict[compound]}
			count_available={$max_number_possible_for_each_compound[compound]}/>
    {/each}
</div>

<style>
    #sidebar-bottom {
		height: 250px;
		width: calc(100vw - 150px);
		box-sizing: border-box;
		position: absolute;
		left: 0px;
		top: calc(100vh - 250px);
		float: right;
		display: flex;
		justify-content: space-around;
		align-items: center;
	}
</style>