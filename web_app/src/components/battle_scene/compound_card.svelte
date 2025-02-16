<script>
    export let el_name;
    export let damage;
    export let count_available;
    export let is_selected;

    function get_classes() {
        let classes = 'card'
        classes += count_available ? ' high_opac' : ' low_opac'
        classes += is_selected ? ' red-border' : ''
        return classes
    }
</script>

<div class={get_classes()}>
    <div class='stats'>
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

    .red-border {
        border: 2px solid red;
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
