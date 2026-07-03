<script>
    import { onMount } from 'svelte';
    import { store } from './store.js';
    import { global_store } from '../../global_store.js';
    import { dispose } from './compound_creator_3.js';

    const { atoms, current_scene, possible_scenes } = global_store;
    const { selected_atom, creator_moves_remaining } = store;

    onMount(() => {
        selected_atom.set(Object.keys($atoms)[0]);
    });

    function set_selected_atom(symbol) {
        selected_atom.set(symbol);
    }

    function go_back_to_timeline() {
        dispose();
        current_scene.set(possible_scenes.Timeline);
    }
</script>

<div id='sidebar-right'>
    <button type="button" id='back-button' on:click|stopPropagation={go_back_to_timeline}><p>Back</p></button>
    {#each Object.keys($atoms) as atom_symbol (atom_symbol)}
        <button type="button" class={$selected_atom === atom_symbol ? 'select-atom-button highlighted' : 'select-atom-button'}
                on:click|stopPropagation={_ => set_selected_atom(atom_symbol)}>
            <h3>{atom_symbol}</h3>
        </button>
    {/each}
    <div>
        <h4>Moves Remaining:</h4>
        <h4>{$creator_moves_remaining}</h4>
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
        background: transparent;
        cursor: pointer;
        font: inherit;
        color: inherit;
        padding: 0;
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
        border: none;
        border-radius: 5px;
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        font: inherit;
        padding: 0;
    }
</style>