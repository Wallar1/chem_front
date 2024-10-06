<script>
    import { onMount } from 'svelte';
    import { expoOut } from 'svelte/easing';
    import { BalanceEquationScene, end_scene } from './balance_equation.js';
    import {current_scene, possible_scenes, balance_rotations, compounds_in_scene, sides, need_to_delete, element_counts, game_state, GameStates} from '../../stores.js';
    
    let balance_equation_scene;
    onMount(async () => {
        balance_equation_scene = new BalanceEquationScene();
    })

    var game_won_audio = new Audio('https://chem-game.s3.amazonaws.com/sounds/marimba-bloop-2-188149.mp3');
    var leave_scene_audio = new Audio('https://chem-game.s3.amazonaws.com/sounds/marimba-bloop-3-188151.mp3');

    let balanced = false;
    $: {
        let counts = Object.values($balance_rotations);
        balanced = !counts.length || counts.filter(k => k !== 0).length ? false : true;
        if (balanced){
            game_won_audio.fastSeek(0);
            game_won_audio.play();
        }
    }

    function calc_color(rotation) {
        /* HSL (Hue, Saturation, Lightness)
        Hue: This is the degree on the color wheel from 0 to 360. 0 is red, 120 is green, and 240 is blue.
        Saturation: This is a percentage value; 0% means a shade of gray and 100% is the full color.
        Lightness: This is also a percentage; 0% is black, 100% is white, and 50% is the average lightness of the color.

        for this, if the rotation is 0, I return green (120). Otherwise, some number between red (0) and yellow (60)

        0 < deg <= 90
        if deg = 1, return 60
        if deg = 90, return 0
        if deg = 45, return 30
        */
        if (rotation === 0) {
            return 'hsl(120deg 100% 50%)'
        }
        let degree = Math.abs(rotation);
        const yellow = 60;
        const max_degrees = 90;
        // y = mx + b
        let val = (-yellow/max_degrees) * degree + yellow;
        return `hsl(${val}deg 100% 50%)`
    }

    // TODO: this doesnt really work because it always animates from the center. Idk how to fix it.
    function custom_rotate(node, {duration, rotation}) {
        // from https://learn.svelte.dev/tutorial/custom-css-transitions. I am trying to make this:
        // style="transform: rotate({rotation}deg); color: {calc_color(rotation)}
        // into an animation
        return {
            duration,
            css: t => {
                const eased = expoOut(t);
                return `
                    transform: rotate(${eased * rotation}deg);
                    color: ${calc_color(eased * rotation)};
                `
            }
        }
    }

    function getRandomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }


    function add_molecule_to_scene(compound, side) {
        let y = getRandomBetween(-.4, -.8);
        let x_multiplier = side === sides.LEFT ? -1 : 1;
        let x = x_multiplier * getRandomBetween(.2, .8);
        balance_equation_scene.add_molecule_in_play(compound, x, y);
    }

    function toggle_delete_molecule_from_scene() {
        $need_to_delete = !$need_to_delete;
    }

    function go_to_timeline(event) {
        leave_scene_audio.fastSeek(0);
        leave_scene_audio.play();
        if (balanced) {
            end_scene(GameStates.GAMEWON)
        } else {
            end_scene(GameStates.GAMELOST)
        }
        $current_scene = possible_scenes.Timeline;
    }
</script>

<div id='outer'>
    <div id='back-button' on:click|stopPropagation={_ => {balanced = true; go_to_timeline()}}><p>Back</p></div>
    <div id='canvas-container'>
        <canvas></canvas>
    </div>
    <div id='arrow-container'>
        <div id='balance-arrows'>
            {#each Object.entries($balance_rotations) as [el, rotation] (el + rotation)}
                <div class="p-cont">
                    <p class="spaced-p">{el}</p>
                    <p class="spaced-p" in:custom_rotate={{duration: 1000, rotation: rotation}} style="transform: rotate({rotation}deg); color: {calc_color(rotation)}">↑</p>
                </div>
            {/each}
        </div>
        <h1 class="center-arrow">↑</h1>
        <hr class='middle-divider'>
    </div>
    <div class={balanced ? "jiggle" : ""} id='submit' on:click|stopPropagation={go_to_timeline}>Submit!</div>
    <div class="add-molecules-container">
        {#each [sides.LEFT, sides.RIGHT] as side (side)}
            <div class="{side} add-molecules">
                {#each $compounds_in_scene[side] as compound (compound)}
                    <div class="add-molecule-button" on:click|stopPropagation={() => add_molecule_to_scene(compound, side)}>
                        <p>{compound}</p>
                    </div>
                {/each}
            </div>
        {/each}
        <div class={$need_to_delete ? 'red':'gray'} id="trash" on:click={() => toggle_delete_molecule_from_scene()}>🗑️</div>
    </div>
</div>

<style>
    #back-button {
        position: absolute;
        left: 30px;
        top: 30px;
        z-index: 2;
        width: 50px;
        height: 30px;
        background-color: #ff6666;
        border-radius: 5px;
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    #outer {
        background-color: #050505;
        background: radial-gradient(ellipse at center,  rgba(43,45,48,1) 0%,rgba(0,0,0,1) 100%);
        overflow: hidden;
        width: 100%;
        height: 100%;
        display: flex;
    }
    canvas {
        position: absolute;
        left: 0;
        top: 0;
        z-index: 1;  /* needs to be above 0 I think. I made it negative and click events were blocked */
    }
    #canvas-container {
        height: 80vh;
        width: 100vw;
    }
    #arrow-container{
        position: absolute;
        top: 0;
        left: 0;
        z-index: 2;
        width: 100%;
        pointer-events: none;  /* this allows the clicks to pass through to the canvas */
    }
    .center-arrow {
        position: fixed;
        top: 40%;
        left: 50%;
        color: white;
        /* translating -50 to account for its width */
        transform: translate(-50px) rotate(90deg);
        font-size: 100px;
        width: 100px;
        margin: 0;
    }

    .middle-divider {
        border-top: dashed 5px;
        background-color: transparent;
        color: rgba(255,255,255,.3);
        transform: rotate(90deg);
    }

    #submit {
        font-size: 35px;
        color: white;
        cursor: pointer;
        width: 140px;
        height: 50px;
        border: 2px solid rgb(163, 0, 152);
        border-radius: 5px;
        display: flex;
        justify-content: center;
        align-items: center;
        position: fixed;
        left: 90%;
        top: 20px;
        z-index: 3;
    }

    #balance-arrows {
        font-size: 35px;
        color: white;
        cursor: pointer;
        width: 100%;
        height: 100px;
        display: flex;
        justify-content: space-around;
        background-color:rgb(119, 144, 203);
        width: 600px;
        position: fixed;
        left: calc(50vw - 300px);
        top: 0;
        z-index: 3;
    }
    .p-cont {
        display: flex;
        align-items: center;
    }
    .spaced-p {
        padding: 10px;
        margin: 0;
    }
    .jiggle {
        animation-name: jiggle;
        animation-duration: 2s;
        animation-timing-function: ease-in-out;
        animation-iteration-count: infinite;
    }
    @keyframes jiggle {
        0% {
            transform: rotate(0deg);
        }
        5% {
            transform: rotate(1deg);
        }
        10% {
            /* to -1 */
            transform: rotate(-2deg);
        }
        15% {
            /* to +3 */
            transform: rotate(4deg);
        }
        20% {
            /* to -3 */
            transform: rotate(-6deg);
        }
        25% {
            /* to +5 */
            transform: rotate(8deg);
        }
        30% {
            /* to -4 */
            transform: rotate(-8deg);
        }
        35% {
            /* to +3 */
            transform: rotate(7deg);
        }
        40% {
            /* to -3 */
            transform: rotate(-6deg);
        }
        45% {
            /* to +1 */
            transform: rotate(4deg);
        }
        /* doing nothing from 50 - 100% so that there is a delay between each iteration */
        50%, 100% {
            transform: rotate(0deg);
        }
    }

    .add-molecules-container {
        position: fixed;
        top: 80vh;
        display: flex;
        justify-content: space-around;
        height: 20vh;
        width: 100vw;
        padding: 10px;
    }

    .add-molecules {
        display: flex;
        justify-content: space-around;
        width: 40%;
    }

    .add-molecule-button {
        border: 1px solid black;
        border-radius: 5px;
        height: 50%;
        width: auto;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .add-molecule-button p {
        margin: 10px;
        padding: 0;
    }

    #trash {
        font-size: 50px;
        cursor: pointer;
        position: fixed;
        left: 50%;
        align-content: center;
    }
    .gray {
        border: none;
    }
    .red {
        border: 1px solid red;
        border-radius: 5px;
    }

</style>
