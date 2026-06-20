<script>
    import CompoundCard from './compound_card.svelte';
	import { formula_to_damage_dict } from '../../compounds';
	import { store } from './store.js';

	let max_number_possible_for_each_compound = store.max_number_possible_for_each_compound;
	let key_to_compound = store.key_to_compound;
	let selected_compound_index = store.selected_compound_index;

	$: keyboard_compounds = Object.entries($key_to_compound).filter(
		([key]) => ['1', '2', '3', '4', '5'].includes(key)
	);
	$: max_by_compound = $max_number_possible_for_each_compound;
	$: selected_key = $selected_compound_index;
</script>

<div id='sidebar-bottom'>
    {#each keyboard_compounds as [key, compound] (key + '-' + (max_by_compound[compound] ?? 0) + '-' + selected_key)}
        <CompoundCard key={key} el_name={compound} damage={formula_to_damage_dict[compound]}
			count_available={max_by_compound[compound] ?? 0}
			is_selected={key === selected_key}/>
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
