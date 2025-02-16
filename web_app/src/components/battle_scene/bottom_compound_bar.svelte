<script>
	import { get } from 'svelte/store';
    import CompoundCard from './compound_card.svelte';
	import { formula_to_damage_dict } from '../../compounds';
	import { store } from './store.js';

	function is_selected(index) {
		let _sci = get(store.selected_compound_index)
		console.log(index, parseInt(_sci))
		return index === parseInt(_sci) - 1;
	}

	let max_number_possible_for_each_compound = store.max_number_possible_for_each_compound;
	let key_to_compound = store.key_to_compound;
</script>

<div id='sidebar-bottom'>
    {#each Object.entries($key_to_compound) as [key, compound], i}
        <CompoundCard key={key} el_name={compound} damage={formula_to_damage_dict[compound]}
			count_available={$max_number_possible_for_each_compound[compound]}
			is_selected={is_selected(i)}/>
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