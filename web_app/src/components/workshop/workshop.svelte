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
    import {
        discovered_molecule_list,
        MAX_BATTLE_MOLECULES,
        needs_battle_loadout_selection,
        battle_loadout,
        toggle_battle_molecule,
    } from '../../progression.js';
    import JoulesDisplay from '../joules_display.svelte';

    let purchase_message = '';
    let loadout_message = '';

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

    function toggle_loadout(formula) {
        const result = toggle_battle_molecule(formula);
        if (result.ok) {
            loadout_message = result.action === 'added'
                ? `Added ${formula} to battle loadout.`
                : `Removed ${formula} from battle loadout.`;
        } else if (result.reason === 'full') {
            loadout_message = `Battle loadout is full (${MAX_BATTLE_MOLECULES}/${MAX_BATTLE_MOLECULES}). Unequip one first.`;
        } else {
            loadout_message = '';
        }
    }
</script>

<div class="workshop">
    <header class="workshop-header">
        <h1>Workshop</h1>
        <p>Review discovered molecules and spend joules on gear.</p>
        <JoulesDisplay />
        <button type="button" class="back-button" on:click={go_back_to_timeline}>
            Back to Timeline
        </button>
    </header>

    <section class="pokedex" aria-label="Molecule Pokédex">
        <h2>Molecule Pokédex</h2>
        <p class="section-lede">
            Molecules you have discovered. Up to {MAX_BATTLE_MOLECULES} can be equipped for battle.
        </p>
        {#if $needs_battle_loadout_selection}
            <p class="loadout-status" role="status">
                Battle loadout: {$battle_loadout.length} / {MAX_BATTLE_MOLECULES} selected.
                Tap a battle-ready molecule to equip or unequip it.
            </p>
            {#if loadout_message}
                <p class="loadout-message" role="status">{loadout_message}</p>
            {/if}
        {/if}
        <ul class="molecule-list">
            {#each $discovered_molecule_list as molecule (molecule.formula)}
                <li
                    class="molecule-item"
                    class:battle-ready={molecule.battle_usable}
                    class:equipped={molecule.equipped}
                >
                    <div class="molecule-heading">
                        <h3>{molecule.name}</h3>
                        <span class="formula">{molecule.formula}</span>
                    </div>
                    <p class="damage">Damage: {molecule.damage}</p>
                    <p class="effect">{molecule.effect}</p>
                    {#if molecule.battle_usable}
                        <span class="badge">Usable in battle</span>
                    {:else}
                        <span class="badge muted">Catalog only</span>
                    {/if}
                    {#if $needs_battle_loadout_selection && molecule.battle_usable}
                        <button
                            type="button"
                            class="equip-button"
                            class:is-equipped={molecule.equipped}
                            aria-pressed={molecule.equipped}
                            on:click={() => toggle_loadout(molecule.formula)}
                        >
                            {molecule.equipped ? 'Equipped' : 'Equip for battle'}
                        </button>
                    {/if}
                </li>
            {/each}
        </ul>
    </section>

    <div class="workshop-body">
        <h2 class="upgrades-heading">Upgrades</h2>
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
    .buy-button,
    .equip-button {
        border: 1px solid #c4a574;
        border-radius: 6px;
        background: #3d2c1e;
        color: #e8dcc8;
        padding: 8px 16px;
        cursor: pointer;
        font: inherit;
    }

    .back-button:hover,
    .buy-button:hover:not(:disabled),
    .equip-button:hover {
        background: #6b4f35;
    }

    .buy-button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }

    .equip-button {
        align-self: flex-start;
        margin-top: 4px;
        padding: 6px 12px;
        font-size: 0.9rem;
    }

    .equip-button.is-equipped {
        border-color: rgba(124, 240, 255, 0.7);
        background: #2a4a52;
    }

    .pokedex,
    .workshop-body {
        width: min(720px, 100%);
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .pokedex h2,
    .upgrades-heading,
    .debug-panel h2 {
        margin: 0;
        font-size: 1.35rem;
    }

    .section-lede,
    .loadout-status,
    .loadout-message {
        margin: 0;
        opacity: 0.8;
        line-height: 1.4;
    }

    .loadout-status {
        opacity: 0.95;
        font-weight: 600;
    }

    .molecule-list,
    .upgrade-list,
    .debug-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .molecule-item,
    .upgrade-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 16px 18px;
        background: rgba(61, 44, 30, 0.55);
        border: 1px solid rgba(196, 165, 116, 0.45);
        border-radius: 8px;
    }

    .molecule-item.battle-ready {
        border-color: rgba(124, 240, 255, 0.45);
    }

    .molecule-item.equipped {
        box-shadow: inset 0 0 0 1px rgba(124, 240, 255, 0.35);
    }

    .molecule-heading {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
    }

    .molecule-heading h3 {
        margin: 0;
        font-size: 1.15rem;
    }

    .formula {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        opacity: 0.9;
    }

    .damage,
    .effect {
        margin: 0;
        line-height: 1.35;
    }

    .damage {
        font-weight: 700;
    }

    .effect {
        opacity: 0.85;
    }

    .badge {
        align-self: flex-start;
        margin-top: 4px;
        font-size: 0.8rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        opacity: 0.9;
    }

    .badge.muted {
        opacity: 0.55;
    }

    .upgrade-item {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
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
