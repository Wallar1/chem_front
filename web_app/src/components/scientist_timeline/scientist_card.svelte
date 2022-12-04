<script>
    export let name;
    export let src;
</script>

<div class='card'>    
    <img src="{src}" alt={name}>

    <p>{name}</p>
</div>

<style>
    .card{
        width: 300px;
        height: 600px;
        border: 1px solid black;
        border-radius: 5px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    img {
        width: 100%;
        height: 100%;
    }
</style>
