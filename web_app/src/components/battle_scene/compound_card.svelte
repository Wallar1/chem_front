<script>
    export let el_name;
    export let damage;
    export let count_available;
    export let key;
</script>

<div class={count_available ? 'card high_opac' : 'card low_opac'}>
    <div class='stats'>
        <p>{key === ' ' ? 'Space' : key.toUpperCase()}</p>
        <p>Count Available: {count_available}</p>
        <p>Damage: {damage}</p>
    </div>
    <h2 class='el_name'>{el_name}</h2>
</div>

<style>
    .card {
		width: 200px;
		height: 200px;
		background-color: rgb(225, 193, 255);
		border: 1px solid black;
        border-radius: 5px;
        margin: 20px;
        box-shadow: 4px 8px 10px 10px rgba(0, 0, 0, 0.2);
        transition-duration: 0.3s;
	}

    .high_opac {
        opacity: 1.0;
    }

    .low_opac {
        opacity: 0.4;
    }

    .stats {
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        align-items: center;
    }

    .el_name {
        display: flex;
        justify-content: center;
    }
</style>
