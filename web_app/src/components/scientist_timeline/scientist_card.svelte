<script>
    import {current_scene, possible_scenes, current_scientist, GameStates, game_state} from '../../stores.js';

    export let scientist;

    function start_battle(scientist) {
        $current_scientist = scientist.name
        $current_scene = possible_scenes.Battle

        game_state.update(currentState => {
            currentState.state = GameStates.STARTING;
            return currentState;
        });
    }

    let hide_image = false;
</script>

<div class='card' on:click|stopPropagation={_ => hide_image = !hide_image}>
    <img class:hide_image src="{scientist.src}" alt={scientist.name}>
    <div class='text'>
        <div class='story'>
            <p>{scientist.story}</p>
            <div class='button' on:click|stopPropagation={(e) => start_battle(scientist)}>Battle!</div>
        </div>
        <p>{scientist.name}</p>
        <p>{scientist.year}</p>
    </div>
</div>

<style>
    .card{
        min-width: 300px;
        height: 400px;
        border: 1px solid black;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 0 20px 0 20px;
        position: relative;
        padding: 15px;
        box-shadow: 4px 8px 10px 10px rgba(0, 0, 0, 0.2);
        transition-duration: 0.3s;
    }
    .card:hover {
        transform: scale(1.02);
    }
    img {
        width: 100%;
        max-height: 80%;
        min-height: 80%;
        transition-duration: .8s;
        transition-timing-function: ease-out;
        z-index: 1;
    }
    .hide_image {
        transform: translateY(-150%);
        transition-duration: .7s;
        transition-timing-function: ease-out;
    }

    .text {
        width: 100%;
        height: 100%;
        position: absolute;
        bottom: 0;
        box-sizing: border-box;
        padding: 15px;
    }

    .story {
        max-height: 80%;
        min-height: 80%;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    .story p {
        margin: 15px;
    }

    .button {
        width: 50px;
        height: 20px;
        border: 1px solid black;
        border-radius: 5px;
        background-color: rgb(200, 248, 185);
        padding: 5px;
        margin: 10px;
    }
    
    p {
        margin: 0 0 10px 0;
    }
</style>
