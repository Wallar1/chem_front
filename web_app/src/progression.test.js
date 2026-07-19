import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
    SCIENTIST_ORDER,
    SCIENTIST_REWARD_MOLECULE,
    STARTING_MOLECULES,
    MAX_BATTLE_MOLECULES,
    unlocked_scientists,
    discovered_molecules,
    selected_battle_molecules,
    active_scientist_id,
    battle_loadout,
    discovered_molecule_list,
    defeat_scientist,
    reset_progression,
    is_scientist_unlocked,
    battle_loadout_formulas,
    resolve_battle_loadout,
    toggle_battle_molecule,
    set_battle_loadout,
    needs_battle_loadout_selection,
} from './progression.js';

describe('progression', () => {
    beforeEach(() => {
        reset_progression();
    });

    it('starts with only the first scientist unlocked', () => {
        expect(SCIENTIST_ORDER[0]).toBe('Democritus');
        expect(is_scientist_unlocked('Democritus')).toBe(true);
        expect(is_scientist_unlocked('Geber')).toBe(false);
        expect(get(unlocked_scientists)).toEqual({ Democritus: true });
    });

    it('starts with hydrogen and water in the pokedex', () => {
        expect(get(discovered_molecules)).toEqual({
            H2: true,
            H2O: true,
        });
        expect(get(discovered_molecule_list).map((m) => m.formula)).toEqual(STARTING_MOLECULES);
        expect(get(battle_loadout)).toEqual(['H2', 'H2O']);
    });

    it('links Democritus to ammonia and Geber to methane', () => {
        expect(SCIENTIST_REWARD_MOLECULE.Democritus).toBe('NH3');
        expect(SCIENTIST_REWARD_MOLECULE.Geber).toBe('CH4');
    });

    it('unlocks the next scientist and molecule on victory', () => {
        active_scientist_id.set('Democritus');
        const result = defeat_scientist();
        expect(result).toEqual({
            ok: true,
            unlocked_molecule: 'NH3',
            unlocked_scientist: 'Geber',
        });
        expect(is_scientist_unlocked('Geber')).toBe(true);
        expect(get(discovered_molecules).NH3).toBe(true);
        expect(get(battle_loadout)).toEqual(['H2', 'H2O', 'NH3']);
    });

    it('unlocks methane after beating Geber', () => {
        active_scientist_id.set('Democritus');
        defeat_scientist();
        active_scientist_id.set('Geber');
        const result = defeat_scientist();
        expect(result.unlocked_molecule).toBe('CH4');
        expect(result.unlocked_scientist).toBe('SirFrancisBacon');
        expect(get(battle_loadout)).toEqual(['H2', 'H2O', 'NH3', 'CH4']);
    });

    it('caps battle loadout at five molecules', () => {
        const all = {
            H2: true,
            H2O: true,
            NH3: true,
            CH4: true,
            CN: true,
            CO: true,
        };
        const loadout = battle_loadout_formulas(all);
        expect(loadout).toHaveLength(MAX_BATTLE_MOLECULES);
        expect(loadout).toEqual(['H2', 'H2O', 'NH3', 'CH4', 'CN']);
    });

    it('uses player selection when more than five battle molecules are owned', () => {
        discovered_molecules.set({
            H2: true,
            H2O: true,
            NH3: true,
            CH4: true,
            CN: true,
            CO: true,
        });
        expect(get(needs_battle_loadout_selection)).toBe(true);
        expect(get(battle_loadout)).toEqual(['H2', 'H2O', 'NH3', 'CH4', 'CN']);

        set_battle_loadout(['H2O', 'NH3', 'CH4', 'CN', 'CO']);
        expect(get(battle_loadout)).toEqual(['H2O', 'NH3', 'CH4', 'CN', 'CO']);
        expect(resolve_battle_loadout(get(discovered_molecules), get(selected_battle_molecules)))
            .toEqual(['H2O', 'NH3', 'CH4', 'CN', 'CO']);
    });

    it('toggle_battle_molecule equips and unequips within the five-slot cap', () => {
        discovered_molecules.set({
            H2: true,
            H2O: true,
            NH3: true,
            CH4: true,
            CN: true,
            CO: true,
        });

        // Seeds from auto loadout (first 5), then removes H2 and adds CO.
        const removed = toggle_battle_molecule('H2');
        expect(removed.ok).toBe(true);
        expect(removed.action).toBe('removed');

        const added = toggle_battle_molecule('CO');
        expect(added.ok).toBe(true);
        expect(added.action).toBe('added');
        expect(get(battle_loadout)).toEqual(['H2O', 'NH3', 'CH4', 'CN', 'CO']);

        const full = toggle_battle_molecule('H2');
        expect(full.ok).toBe(false);
        expect(full.reason).toBe('full');
    });

    it('rejects defeating a locked scientist', () => {
        expect(defeat_scientist('Geber')).toEqual({ ok: false, reason: 'locked' });
    });
});
