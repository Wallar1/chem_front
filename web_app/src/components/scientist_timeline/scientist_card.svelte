<script>
    import { store } from './store.js';
    import { global_store } from '../../global_store.js';
    import {
        unlocked_scientists,
        scientist_id_for,
        SCIENTIST_REWARD_MOLECULE,
        molecule_info,
        active_scientist_id,
    } from '../../progression.js';

    export let scientist;

    $: scientist_id = scientist_id_for(scientist);
    $: unlocked = scientist_id ? !!$unlocked_scientists[scientist_id] : false;
    $: reward_formula = scientist_id ? SCIENTIST_REWARD_MOLECULE[scientist_id] : null;
    $: reward = reward_formula ? molecule_info(reward_formula) : null;

    function start_battle() {
        if (!unlocked || !scientist_id) return;
        store.current_scientist.set(scientist.name);
        active_scientist_id.set(scientist_id);
        global_store.current_scene.set(global_store.possible_scenes.Battle);
    }

    let hide_image = false;

    function handle_card_keydown(e) {
        if (!unlocked) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            hide_image = !hide_image;
        }
    }
</script>

{#if unlocked}
    <div
        class="card"
        role="button"
        tabindex="0"
        aria-label="Toggle {scientist.name} card"
        on:click|stopPropagation={_ => hide_image = !hide_image}
        on:keydown={handle_card_keydown}
    >
        <img class:hide_image src="{scientist.src}" alt={scientist.name}>
        <div class="text">
            <div class="story">
                <p>{scientist.story}</p>
                {#if reward}
                    <p class="reward-hint">Victory unlocks {reward.name} ({reward.formula})</p>
                {/if}
                <button type="button" class="button" on:click|stopPropagation={start_battle}>Battle!</button>
            </div>
            <p>{scientist.name}</p>
        </div>
    </div>
{:else}
    <div class="card locked" aria-label="{scientist.name} locked">
        <div class="locked-panel">
            <span class="lock-badge" aria-hidden="true">Locked</span>
            <p class="locked-copy">Beat the previous scientist to unlock {scientist.name}.</p>
        </div>
        <p class="locked-name">{scientist.name}</p>
    </div>
{/if}

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
        box-sizing: border-box;
    }
    .card:hover:not(.locked) {
        transform: scale(1.02);
    }
    .card.locked {
        background: #2a2a2a;
        color: #c8c8c8;
        justify-content: space-between;
        cursor: not-allowed;
        box-shadow: 2px 4px 8px 4px rgba(0, 0, 0, 0.35);
    }
    img {
        width: 100%;
        max-height: 80%;
        min-height: 80%;
        transition-duration: .8s;
        transition-timing-function: ease-out;
        z-index: 1;
        object-fit: cover;
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

    .reward-hint {
        margin: 0 15px 8px !important;
        font-size: 0.85rem;
        opacity: 0.85;
        align-self: stretch;
        text-align: left;
    }

    .button {
        width: 50px;
        height: 20px;
        border: 1px solid black;
        border-radius: 5px;
        background-color: rgb(200, 248, 185);
        padding: 5px;
        margin: 10px;
        cursor: pointer;
        font: inherit;
        color: inherit;
    }

    .locked-panel {
        flex: 1;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        text-align: center;
        padding: 12px;
    }

    .lock-badge {
        display: inline-block;
        padding: 6px 12px;
        border: 1px solid #888;
        border-radius: 4px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-size: 0.85rem;
        font-weight: 700;
    }

    .locked-copy {
        margin: 0;
        opacity: 0.8;
        line-height: 1.35;
    }

    .locked-name {
        margin: 0 0 10px 0;
        width: 100%;
        text-align: left;
    }
    
    p {
        margin: 0 0 10px 0;
    }
</style>
