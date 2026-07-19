import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
    PLAYER_SAVE_KEY,
    PLAYER_SAVE_VERSION,
    sanitize_player_save,
    collect_player_save,
    apply_player_save,
    read_player_save,
    write_player_save,
    clear_player_save,
    init_player_save,
    stop_player_save,
} from './player_save.js';
import { joules, owned_upgrades, reset_upgrades, UPGRADE_IDS } from './upgrades.js';
import {
    unlocked_scientists,
    discovered_molecules,
    selected_battle_molecules,
    reset_progression,
    defeat_scientist,
    active_scientist_id,
} from './progression.js';

function flush_microtasks() {
    return Promise.resolve();
}

describe('player_save', () => {
    beforeEach(() => {
        stop_player_save();
        clear_player_save();
        reset_progression();
        reset_upgrades();
    });

    afterEach(() => {
        stop_player_save();
        clear_player_save();
    });

    it('sanitizes a valid save blob', () => {
        const safe = sanitize_player_save({
            version: PLAYER_SAVE_VERSION,
            joules: 12.7,
            owned_upgrades: { [UPGRADE_IDS.SHARP_AXE]: true, bogus: true },
            unlocked_scientists: { Democritus: true, Geber: true, NotAScientist: true },
            discovered_molecules: { H2: true, H2O: true, NH3: true, FAKE: true },
            selected_battle_molecules: ['NH3', 'NH3', 'FAKE', 'H2'],
        });

        expect(safe).toEqual({
            version: PLAYER_SAVE_VERSION,
            joules: 12,
            owned_upgrades: {
                [UPGRADE_IDS.LAB_COAT]: false,
                [UPGRADE_IDS.SHARP_AXE]: true,
                [UPGRADE_IDS.ERLENMEYER_FLASK]: false,
                [UPGRADE_IDS.SEPARATING_FUNNEL]: false,
            },
            unlocked_scientists: { Democritus: true, Geber: true },
            discovered_molecules: { H2: true, H2O: true, NH3: true },
            selected_battle_molecules: ['NH3', 'H2'],
        });
    });

    it('rejects unknown versions', () => {
        expect(sanitize_player_save({ version: 999, joules: 1 })).toBeNull();
    });

    it('round-trips through localStorage', async () => {
        joules.set(7);
        owned_upgrades.set({
            [UPGRADE_IDS.LAB_COAT]: true,
            [UPGRADE_IDS.SHARP_AXE]: false,
            [UPGRADE_IDS.ERLENMEYER_FLASK]: false,
            [UPGRADE_IDS.SEPARATING_FUNNEL]: false,
        });
        unlocked_scientists.set({ Democritus: true, Geber: true });
        discovered_molecules.set({ H2: true, H2O: true, NH3: true });
        selected_battle_molecules.set(['NH3', 'H2O']);

        expect(write_player_save()).toBe(true);
        expect(localStorage.getItem(PLAYER_SAVE_KEY)).toBeTruthy();

        reset_progression();
        reset_upgrades();
        expect(get(joules)).toBe(0);

        const loaded = read_player_save();
        expect(apply_player_save(loaded)).toBe(true);
        expect(get(joules)).toBe(7);
        expect(get(owned_upgrades)[UPGRADE_IDS.LAB_COAT]).toBe(true);
        expect(get(unlocked_scientists)).toEqual({ Democritus: true, Geber: true });
        expect(get(discovered_molecules)).toEqual({ H2: true, H2O: true, NH3: true });
        expect(get(selected_battle_molecules)).toEqual(['NH3', 'H2O']);
    });

    it('autosaves when stores change after init', async () => {
        init_player_save();
        joules.set(3);
        await flush_microtasks();

        const saved = JSON.parse(localStorage.getItem(PLAYER_SAVE_KEY));
        expect(saved.joules).toBe(3);

        active_scientist_id.set('Democritus');
        defeat_scientist();
        await flush_microtasks();

        stop_player_save();
        reset_progression();
        reset_upgrades();

        init_player_save();
        expect(get(joules)).toBe(3);
        expect(get(unlocked_scientists).Geber).toBe(true);
        expect(get(discovered_molecules).NH3).toBe(true);
    });

    it('collects the current store snapshot', () => {
        joules.set(4);
        const snapshot = collect_player_save();
        expect(snapshot.version).toBe(PLAYER_SAVE_VERSION);
        expect(snapshot.joules).toBe(4);
        expect(snapshot.discovered_molecules.H2).toBe(true);
    });
});
