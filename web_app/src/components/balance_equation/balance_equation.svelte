<script>
    import { onMount } from 'svelte';
    import { expoOut } from 'svelte/easing';
    import { BalanceEquationScene} from './balance_equation.js';
    import {balance_rotations} from '../../stores.js';
    onMount(async () => {
        new BalanceEquationScene();
    })

    function check_balance() {
        return Object.values($balance_rotations).filter(k => k !== 0).length ? false : true;
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
        console.log(duration, rotation)
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

</script>

<div id='outer'>
    <div id='canvas-container'></div>
    <div id='balance-arrows'>
        {#each Object.entries($balance_rotations) as [el, rotation] (el + rotation)}
            <div style="display: flex;">
                <p>{el}</p>
                <p in:custom_rotate={{duration: 1000, rotation: rotation}} style="transform: rotate({rotation}deg); color: {calc_color(rotation)}">↑</p>
            </div>
        {/each}
    </div>
    <div id='check-balance' on:click={check_balance}>Check Balance!</div>
</div>

<style>
    #outer {
        background-color: #050505;
        background: radial-gradient(ellipse at center,  rgba(43,45,48,1) 0%,rgba(0,0,0,1) 100%);
    }

    #check-balance {
        position: absolute;
        top: 10%;
        left: 50%;
        font-size: 35px;
        color: white;
        cursor: pointer;
        width: 150px;
        height: 100px;
        border: 2px solid white;
        border-radius: 5px;
    }

    #balance-arrows {
        position: absolute;
        top: 30%;
        left: 50%;
        font-size: 35px;
        color: white;
        cursor: pointer;
        width: 150px;
        height: 100px;
        display: flex;
        justify-content: space-around;
    }
</style>
