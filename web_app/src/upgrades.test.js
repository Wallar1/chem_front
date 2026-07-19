import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
    joules,
    owned_upgrades,
    upgrade_debug_toggles,
    award_joule,
    buy_upgrade,
    has_upgrade,
    toggle_upgrade_debug,
    reset_upgrades,
    UPGRADE_IDS,
} from './upgrades.js';

describe('upgrades', () => {
    beforeEach(() => {
        reset_upgrades();
    });

    it('awards joules', () => {
        award_joule(1);
        award_joule(2);
        expect(get(joules)).toBe(3);
    });

    it('buys upgrades when affordable', () => {
        joules.set(10);
        expect(buy_upgrade(UPGRADE_IDS.SHARP_AXE)).toEqual({ ok: true });
        expect(get(joules)).toBe(5);
        expect(get(owned_upgrades)[UPGRADE_IDS.SHARP_AXE]).toBe(true);
        expect(has_upgrade(UPGRADE_IDS.SHARP_AXE)).toBe(true);
    });

    it('blocks purchases when broke or already owned', () => {
        expect(buy_upgrade(UPGRADE_IDS.LAB_COAT)).toEqual({ ok: false, reason: 'broke' });
        joules.set(20);
        buy_upgrade(UPGRADE_IDS.LAB_COAT);
        expect(buy_upgrade(UPGRADE_IDS.LAB_COAT)).toEqual({ ok: false, reason: 'owned' });
    });

    it('lets debug toggles enable upgrades without ownership', () => {
        expect(has_upgrade(UPGRADE_IDS.ERLENMEYER_FLASK)).toBe(false);
        toggle_upgrade_debug(UPGRADE_IDS.ERLENMEYER_FLASK);
        expect(has_upgrade(UPGRADE_IDS.ERLENMEYER_FLASK)).toBe(true);
        expect(get(owned_upgrades)[UPGRADE_IDS.ERLENMEYER_FLASK]).toBe(false);
    });
});
