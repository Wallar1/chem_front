<script>
    import { onMount } from 'svelte';
    import {scientists} from './scientists.js';
    import ScientistCard from './scientist_card.svelte';
    import JoulesDisplay from '../joules_display.svelte';


    import { global_store } from '../../global_store.js';

    function set_random_lab_scene(e) {
        if (Math.random() < 0.5) {
            global_store.current_scene.set(global_store.possible_scenes.CompoundCreator);
        } else {
            global_store.current_scene.set(global_store.possible_scenes.BalanceEquation);
        }
    }

    function go_to_workshop(e) {
        global_store.current_scene.set(global_store.possible_scenes.Workshop);
    }

    const click_sound = new Audio('https://chem-game.s3.amazonaws.com/sounds/bubble_pop.mp3');
    function play_click_sound() {
        console.log('playing click sound')
        click_sound.fastSeek(0);
        click_sound.play();
    }

    let timeline_el;
    onMount(() => {
        timeline_el.addEventListener('click', play_click_sound);
        return () => timeline_el.removeEventListener('click', play_click_sound);
    });
</script>
<div bind:this={timeline_el}>
    <div class="joules-hud">
        <JoulesDisplay />
    </div>
    <div class='widescreen'>
        <div class="timeline-content">
            {#each Object.values(scientists) as scientist}
                <div class="scientist-slot">
                    <ScientistCard scientist={scientist}/>
                    <div class="timeline-marker">
                        <div class="timeline-tick"></div>
                        <span class="timeline-year">{scientist.year}</span>
                    </div>
                </div>
            {/each}
            <div class="timeline-line" aria-hidden="true"></div>
        </div>
    </div>
    <div class="scene-links">
        <button type="button" class="scene-link-button lab-link" on:click|stopPropagation={set_random_lab_scene}>
            <img src="lab_equipment.webp" alt="Go to lab">
        </button>
        <button type="button" class="scene-link-button workshop-link" on:click|stopPropagation={go_to_workshop}>
            <img src="workshop.svg" alt="Go to workshop">
        </button>
    </div>
</div>

<style>
    .joules-hud {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 5;
    }

    .widescreen {
        width: 100vw;
        margin-top: 100px;
        overflow-x: scroll;
        padding-top: 10px;
    }

    .timeline-content {
        display: flex;
        align-items: flex-start;
        width: max-content;
        position: relative;
        padding-bottom: 48px;
    }

    .scientist-slot {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex-shrink: 0;
        position: relative;
        z-index: 1;
    }

    .timeline-line {
        position: absolute;
        left: 20px;
        right: 20px;
        bottom: 28px;
        height: 3px;
        background: #333;
        z-index: 0;
        pointer-events: none;
    }

    .timeline-marker {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 12px;
        width: 100%;
    }

    .timeline-tick {
        width: 3px;
        height: 14px;
        background: #333;
        border-radius: 1px;
    }

    .timeline-year {
        margin-top: 6px;
        font-size: 0.95rem;
        font-weight: 600;
        white-space: nowrap;
        color: #222;
    }

    .scene-links {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 24px;
        padding: 16px 0 32px;
    }

    .scene-link-button {
        border: none;
        background: none;
        padding: 0;
        cursor: pointer;
    }

    .scene-link-button img {
        display: block;
        object-fit: contain;
    }

    .workshop-link img {
        width: 192px;
        height: 192px;
    }

    .lab-link img {
        width: 480px;
        height: 480px;
    }
</style>
