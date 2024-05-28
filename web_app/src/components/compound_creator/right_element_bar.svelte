<script>
    import { creator_moves_remaining, atoms, selected_atom } from '../../stores.js';

    function set_selected_atom(symbol) {
        $selected_atom = symbol;
    }

</script>

<div id='sidebar-right'>
    <div on:click|stopPropagation={_=>console.log('yo')} id='spacer'></div>
    {#each Object.keys($atoms) as atom_symbol (atom_symbol)}
        <div class={$selected_atom === atom_symbol ? 'select-atom-button highlighted' : 'select-atom-button'}
                on:click|stopPropagation={_ => set_selected_atom(atom_symbol)}>
            <h3>{atom_symbol}</h3>
        </div>
    {/each}
    <div>
        <h4>Moves Remaining:</h4>
        <h4>{$creator_moves_remaining}</h4>
    </div>
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
    .select-atom-button {
        height: 40px;
        width: 100px;
        border: 1px solid black;
        border-radius: 5px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 15px;
    }
    .highlighted {
        color: green;
        border: 1px solid green;
        box-shadow: 0 0 5px 5px green;
    }
</style>