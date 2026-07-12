import { writable, get } from 'svelte/store';

export const UPGRADE_IDS = Object.freeze({
    LAB_COAT: 'lab_coat',
    SHARP_AXE: 'sharp_axe',
    ERLENMEYER_FLASK: 'erlenmeyer_flask',
    SEPARATING_FUNNEL: 'separating_funnel',
});

export const UPGRADE_CATALOG = Object.freeze([
    {
        id: UPGRADE_IDS.LAB_COAT,
        name: 'New Lab Coat',
        cost: 10,
        description: 'Halves damage taken from enemies.',
    },
    {
        id: UPGRADE_IDS.SHARP_AXE,
        name: 'Sharp Axe',
        cost: 5,
        description: 'Destroys mines in one swing and deals 2× axe damage to enemies.',
    },
    {
        id: UPGRADE_IDS.ERLENMEYER_FLASK,
        name: 'Erlenmeyer Flask',
        cost: 5,
        description: 'Hold click up to 1s to grow your projectile (up to 2× size and damage).',
    },
    {
        id: UPGRADE_IDS.SEPARATING_FUNNEL,
        name: 'Separating Funnel',
        cost: 10,
        description: 'Fires two projectiles per shot without using extra atoms.',
    },
]);

function empty_upgrade_flags() {
    return {
        [UPGRADE_IDS.LAB_COAT]: false,
        [UPGRADE_IDS.SHARP_AXE]: false,
        [UPGRADE_IDS.ERLENMEYER_FLASK]: false,
        [UPGRADE_IDS.SEPARATING_FUNNEL]: false,
    };
}

export const joules = writable(0);
export const owned_upgrades = writable(empty_upgrade_flags());
export const upgrade_debug_toggles = writable(empty_upgrade_flags());

export function award_joule(amount = 1) {
    joules.update((n) => n + amount);
}

export function has_upgrade(id) {
    const owned = get(owned_upgrades);
    const debug = get(upgrade_debug_toggles);
    return !!(owned[id] || debug[id]);
}

export function buy_upgrade(id) {
    const item = UPGRADE_CATALOG.find((u) => u.id === id);
    if (!item) return { ok: false, reason: 'unknown' };

    const owned = get(owned_upgrades);
    if (owned[id]) return { ok: false, reason: 'owned' };

    const balance = get(joules);
    if (balance < item.cost) return { ok: false, reason: 'broke' };

    joules.set(balance - item.cost);
    owned_upgrades.update((flags) => ({ ...flags, [id]: true }));
    return { ok: true };
}

export function toggle_upgrade_debug(id) {
    upgrade_debug_toggles.update((flags) => ({
        ...flags,
        [id]: !flags[id],
    }));
}
