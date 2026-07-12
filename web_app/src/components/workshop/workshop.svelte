<script>
    import { global_store } from '../../global_store.js';
    import {
        UPGRADE_CATALOG,
        buy_upgrade,
        toggle_upgrade_debug,
        joules,
        owned_upgrades,
        upgrade_debug_toggles,
    } from '../../upgrades.js';
    import JoulesDisplay from '../joules_display.svelte';

    let purchase_message = '';

    function go_back_to_timeline() {
        global_store.current_scene.set(global_store.possible_scenes.Timeline);
    }

    function purchase(id) {
        const result = buy_upgrade(id);
        if (result.ok) {
            purchase_message = 'Upgrade acquired.';
        } else if (result.reason === 'owned') {
            purchase_message = 'You already own that upgrade.';
        } else if (result.reason === 'broke') {
            purchase_message = 'Not enough joules.';
        } else {
            purchase_message = 'Could not buy that upgrade.';
        }
    }
</script>

<div class="workshop">
    <header class="workshop-header">
        <h1>Workshop</h1>
        <p>Spend joules on gear that helps in battle.</p>
        <JoulesDisplay />
        <button type="button" class="back-button" on:click={go_back_to_timeline}>
            Back to Timeline
        </button>
    </header>

    <div class="workshop-body">
        <ul class="upgrade-list">
            {#each UPGRADE_CATALOG as item}
                {@const owned = $owned_upgrades[item.id]}
                {@const can_afford = $joules >= item.cost}
                <li class="upgrade-item" class:owned>
                    <div class="upgrade-copy">
                        <h2>{item.name}</h2>
                        <p>{item.description}</p>
                        <div class="cost">
                            <img src="joule.svg" alt="" width="22" height="22">
                            <span>{item.cost}</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        class="buy-button"
                        disabled={owned || !can_afford}
                        on:click={() => purchase(item.id)}
                    >
                        {owned ? 'Owned' : can_afford ? 'Buy' : 'Need more joules'}
                    </button>
                </li>
            {/each}
        </ul>
        {#if purchase_message}
            <p class="purchase-message" role="status">{purchase_message}</p>
        {/if}
    </div>

    <section class="debug-panel" aria-label="Upgrade test toggles">
        <h2>Test toggles</h2>
        <p>Force-enable upgrades in battle without spending joules.</p>
        <ul class="debug-list">
            {#each UPGRADE_CATALOG as item}
                <li>
                    <label>
                        <input
                            type="checkbox"
                            checked={$upgrade_debug_toggles[item.id]}
                            on:change={() => toggle_upgrade_debug(item.id)}
                        >
                        <span>{item.name}</span>
                        {#if $owned_upgrades[item.id]}
                            <em>(owned)</em>
                        {/if}
                    </label>
                </li>
            {/each}
        </ul>
    </section>
</div>

<style>
    .workshop {
        min-height: 100vh;
        width: 100vw;
        box-sizing: border-box;
        padding: 40px 24px 64px;
        background:
            radial-gradient(ellipse at 30% 20%, rgba(139, 105, 20, 0.25) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(61, 44, 30, 0.4) 0%, transparent 55%),
            #1a120c;
        color: #e8dcc8;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 28px;
    }

    .workshop-header {
        text-align: center;
        max-width: 520px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }

    h1 {
        margin: 0;
        font-size: 2.5rem;
        letter-spacing: 0.04em;
    }

    .workshop-header > p {
        margin: 0;
        opacity: 0.85;
    }

    .back-button,
    .buy-button {
        border: 1px solid #c4a574;
        border-radius: 6px;
        background: #3d2c1e;
        color: #e8dcc8;
        padding: 8px 16px;
        cursor: pointer;
        font: inherit;
    }

    .back-button:hover,
    .buy-button:hover:not(:disabled) {
        background: #6b4f35;
    }

    .buy-button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }

    .workshop-body {
        width: min(720px, 100%);
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .upgrade-list,
    .debug-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .upgrade-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 16px 18px;
        background: rgba(61, 44, 30, 0.55);
        border: 1px solid rgba(196, 165, 116, 0.45);
        border-radius: 8px;
    }

    .upgrade-item.owned {
        border-color: rgba(124, 240, 255, 0.45);
    }

    .upgrade-copy {
        flex: 1;
        min-width: 0;
    }

    .upgrade-copy h2 {
        margin: 0 0 6px;
        font-size: 1.2rem;
    }

    .upgrade-copy p {
        margin: 0 0 10px;
        opacity: 0.85;
        line-height: 1.35;
    }

    .cost {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-weight: 700;
    }

    .cost img {
        display: block;
    }

    .purchase-message {
        margin: 0;
        text-align: center;
        opacity: 0.85;
    }

    .debug-panel {
        width: min(720px, 100%);
        padding: 16px 18px;
        border: 1px dashed rgba(196, 165, 116, 0.55);
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.25);
    }

    .debug-panel h2 {
        margin: 0 0 6px;
        font-size: 1.1rem;
    }

    .debug-panel > p {
        margin: 0 0 12px;
        opacity: 0.75;
        font-size: 0.95rem;
    }

    .debug-list label {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
    }

    .debug-list em {
        opacity: 0.65;
        font-style: normal;
        font-size: 0.9rem;
    }

    @media (max-width: 640px) {
        .upgrade-item {
            flex-direction: column;
            align-items: stretch;
        }
    }
</style>
