import { get } from 'svelte/store';
import {
    joules,
    owned_upgrades,
    UPGRADE_IDS,
    UPGRADE_CATALOG,
} from './upgrades.js';
import {
    unlocked_scientists,
    discovered_molecules,
    selected_battle_molecules,
    SCIENTIST_ORDER,
    STARTING_MOLECULES,
    BATTLE_USABLE_MOLECULES,
    MOLECULE_CATALOG,
    MAX_BATTLE_MOLECULES,
} from './progression.js';

export const PLAYER_SAVE_KEY = 'chem_front_player_v1';
export const PLAYER_SAVE_VERSION = 1;

const UPGRADE_ID_LIST = UPGRADE_CATALOG.map((item) => item.id);
const KNOWN_MOLECULES = new Set([
    ...Object.keys(MOLECULE_CATALOG),
    ...BATTLE_USABLE_MOLECULES,
    ...STARTING_MOLECULES,
]);

let persistence_started = false;
let applying_save = false;
let save_scheduled = false;
let unsubscribers = [];

function empty_upgrade_flags() {
    return {
        [UPGRADE_IDS.LAB_COAT]: false,
        [UPGRADE_IDS.SHARP_AXE]: false,
        [UPGRADE_IDS.ERLENMEYER_FLASK]: false,
        [UPGRADE_IDS.SEPARATING_FUNNEL]: false,
    };
}

function initial_unlocked_scientists() {
    const first = SCIENTIST_ORDER[0];
    return first ? { [first]: true } : {};
}

function initial_discovered_molecules() {
    const discovered = {};
    for (const formula of STARTING_MOLECULES) {
        discovered[formula] = true;
    }
    return discovered;
}

function storage_available() {
    try {
        if (typeof localStorage === 'undefined') return false;
        const probe = '__chem_front_save_probe__';
        localStorage.setItem(probe, '1');
        localStorage.removeItem(probe);
        return true;
    } catch {
        return false;
    }
}

function bool_flag_map(raw, allowed_keys, { ensure_keys = [] } = {}) {
    const next = {};
    for (const key of ensure_keys) {
        next[key] = false;
    }
    if (!raw || typeof raw !== 'object') {
        return next;
    }
    for (const key of allowed_keys) {
        if (raw[key]) next[key] = true;
    }
    return next;
}

/**
 * Normalize a parsed save blob into a safe snapshot.
 * Returns null when the payload is unusable.
 */
export function sanitize_player_save(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.version !== PLAYER_SAVE_VERSION) return null;

    const joules_value = Number.isFinite(raw.joules) ? Math.max(0, Math.floor(raw.joules)) : 0;

    const upgrades = bool_flag_map(raw.owned_upgrades, UPGRADE_ID_LIST, {
        ensure_keys: UPGRADE_ID_LIST,
    });

    const unlocked = bool_flag_map(raw.unlocked_scientists, SCIENTIST_ORDER);
    if (Object.keys(unlocked).length === 0) {
        Object.assign(unlocked, initial_unlocked_scientists());
    } else if (SCIENTIST_ORDER[0]) {
        // Timeline assumes the first scientist is always available.
        unlocked[SCIENTIST_ORDER[0]] = true;
    }

    const discovered = bool_flag_map(
        raw.discovered_molecules,
        [...KNOWN_MOLECULES],
    );
    for (const formula of STARTING_MOLECULES) {
        discovered[formula] = true;
    }

    const selected_raw = Array.isArray(raw.selected_battle_molecules)
        ? raw.selected_battle_molecules
        : [];
    const selected = [...new Set(
        selected_raw.filter(
            (formula) =>
                typeof formula === 'string'
                && discovered[formula]
                && BATTLE_USABLE_MOLECULES.includes(formula),
        ),
    )].slice(0, MAX_BATTLE_MOLECULES);

    return {
        version: PLAYER_SAVE_VERSION,
        joules: joules_value,
        owned_upgrades: upgrades,
        unlocked_scientists: unlocked,
        discovered_molecules: discovered,
        selected_battle_molecules: selected,
    };
}

export function collect_player_save() {
    return {
        version: PLAYER_SAVE_VERSION,
        joules: get(joules),
        owned_upgrades: { ...empty_upgrade_flags(), ...get(owned_upgrades) },
        unlocked_scientists: { ...get(unlocked_scientists) },
        discovered_molecules: { ...get(discovered_molecules) },
        selected_battle_molecules: [...get(selected_battle_molecules)],
    };
}

export function apply_player_save(snapshot) {
    const safe = sanitize_player_save(snapshot);
    if (!safe) return false;

    applying_save = true;
    try {
        joules.set(safe.joules);
        owned_upgrades.set(safe.owned_upgrades);
        unlocked_scientists.set(safe.unlocked_scientists);
        discovered_molecules.set(safe.discovered_molecules);
        selected_battle_molecules.set(safe.selected_battle_molecules);
    } finally {
        applying_save = false;
    }
    return true;
}

export function read_player_save() {
    if (!storage_available()) return null;
    try {
        const raw = localStorage.getItem(PLAYER_SAVE_KEY);
        if (!raw) return null;
        return sanitize_player_save(JSON.parse(raw));
    } catch {
        return null;
    }
}

export function write_player_save(snapshot = collect_player_save()) {
    if (!storage_available()) return false;
    const safe = sanitize_player_save(snapshot);
    if (!safe) return false;
    try {
        localStorage.setItem(PLAYER_SAVE_KEY, JSON.stringify(safe));
        return true;
    } catch {
        return false;
    }
}

export function clear_player_save() {
    if (!storage_available()) return;
    try {
        localStorage.removeItem(PLAYER_SAVE_KEY);
    } catch {
        // Ignore quota / privacy errors.
    }
}

function schedule_write() {
    if (!persistence_started || applying_save) return;
    if (save_scheduled) return;
    save_scheduled = true;
    queueMicrotask(() => {
        save_scheduled = false;
        if (!persistence_started || applying_save) return;
        write_player_save();
    });
}

/**
 * Load any existing save, then keep stores in sync with localStorage.
 * Safe to call once from app startup; no-ops on later calls.
 */
export function init_player_save() {
    if (persistence_started) return;
    persistence_started = true;

    const existing = read_player_save();
    if (existing) {
        apply_player_save(existing);
    } else {
        write_player_save();
    }

    unsubscribers = [
        joules.subscribe(schedule_write),
        owned_upgrades.subscribe(schedule_write),
        unlocked_scientists.subscribe(schedule_write),
        discovered_molecules.subscribe(schedule_write),
        selected_battle_molecules.subscribe(schedule_write),
    ];
}

/** Test helper — stops autosave and clears in-memory subscription state. */
export function stop_player_save() {
    for (const unsub of unsubscribers) {
        try {
            unsub();
        } catch {
            // ignore
        }
    }
    unsubscribers = [];
    persistence_started = false;
    applying_save = false;
    save_scheduled = false;
}
