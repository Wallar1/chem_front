
<svelte:window on:keypress|preventDefault={set_key} />
<script>
    import CompoundCard from './compound_card.svelte';
	import { formula_to_damage_dict } from '../../compounds';
	import { last_pressed_key, watched_keys, current_element_counts, key_to_compound,
			  selected_compound, max_number_possible_for_each_compound } from '../../stores.js';

	function set_key(e) {
		if (watched_keys.includes(e.key)) {
			let number_of_compounds_possible = $max_number_possible_for_each_compound[$key_to_compound[e.key]]
			if (number_of_compounds_possible > 0) {
				last_pressed_key.set(e.key)
			}
		}
	}
</script>

<div id='sidebar-bottom'>
    {#each Object.values($key_to_compound) as compound}
        <CompoundCard highlighted={compound === $selected_compound} el_name={compound} damage={formula_to_damage_dict[compound]}
			count_available={$max_number_possible_for_each_compound[compound]}/>
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