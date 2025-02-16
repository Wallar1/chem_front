<script>
    import { onMount } from 'svelte';
    import { store } from './store.js';
    import { global_store } from '../../global_store.js';
    import { dispose } from './compound_creator_3.js';

    onMount(async () => {
        store.selected_atom = Object.keys(global_store.atoms)[0];  // C
    })


    function set_selected_atom(symbol) {
        store.selected_atom = symbol;
    }

    function go_back_to_timeline() {
        dispose()
        global_store.current_scene = global_store.possible_scenes.Timeline;
    }

</script>

<div id='sidebar-right'>
    <div id='back-button' on:click|stopPropagation={go_back_to_timeline}><p>Back</p></div>
    {#each Object.keys(global_store.atoms) as atom_symbol (atom_symbol)}
        <div class={store.selected_atom === atom_symbol ? 'select-atom-button highlighted' : 'select-atom-button'}
                on:click|stopPropagation={_ => set_selected_atom(atom_symbol)}>
            <h3>{atom_symbol}</h3>
        </div>
    {/each}
    <div>
        <h4>Moves Remaining:</h4>
        <h4>{store.creator_moves_remaining}</h4>
    </div>
</div>



<style>
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
    #back-button {
        width: 100%;
        height: 30px;
        margin-bottom: 200px;
        background-color: #ff6666;
        border-radius: 5px;
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>