<script>
    export let el_name;
    export let highlighted;
</script>

<div class='card' class:highlighted>
    <div class='stats'>
        <p>Damage: 10</p>
    </div>
    <div class='el_name'>{el_name}</div>
</div>

<style>
    .card {
		width: 250px;
		height: 200px;
		background-color: antiquewhite;
		border: 1px solid black;
        border-radius: 5px;
	}

	.highlighted {
		border: 5px solid red;
	}

    .stats {
        display: flex;
        justify-content: space-around;
    }

    .el_name {
        display: flex;
        justify-content: center;
    }
</style>