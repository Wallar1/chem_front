<script>
    import { creator_moves_remaining, atoms, selected_atom } from '../../stores.js';

    function set_selected_atom(symbol) {
        $selected_atom = symbol;
    }
</script>

<div id='sidebar-right'>
    <div on:click|stopPropagation={_=>console.log('yo')} id='spacer'></div>
    {#each Object.keys($atoms) as atom_symbol}
        <div on:click|stopPropagation={_ => set_selected_atom(atom_symbol)}>{atom_symbol}</div>
    {/each}
    <div>{$creator_moves_remaining}</div>
    <div>{$selected_atom}</div>
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
        padding: 20px;
        z-index: 2;
	}
</style>