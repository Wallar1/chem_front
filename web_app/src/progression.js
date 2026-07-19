import { writable, derived, get } from 'svelte/store';
import { scientists } from './components/scientist_timeline/scientists.js';

/** Timeline order — first entry starts unlocked. */
export const SCIENTIST_ORDER = Object.freeze(Object.keys(scientists));

/**
 * Molecule rewarded when that scientist is beaten.
 * Edit this map to change which discovery each scientist unlocks.
 */
export const SCIENTIST_REWARD_MOLECULE = Object.freeze({
    Democritus: 'NH3',
    Geber: 'CH4',
    SirFrancisBacon: 'CN',
    RobertBoyle: 'CO',
    AlessandroVolta: 'O2',
    Lavoisier: 'Na',
    DuPont: 'Cl',
    JohnDalton: 'Au',
    Berzelius: 'Ag',
    HumphryDavy: 'Ca',
});

export const STARTING_MOLECULES = Object.freeze(['H2', 'H2O']);
export const MAX_BATTLE_MOLECULES = 5;

/** Formulas that have battle projectiles today. */
export const BATTLE_USABLE_MOLECULES = Object.freeze([
    'H2', 'H2O', 'NH3', 'CH4', 'CN', 'CO', 'O2', 'Na', 'Cl', 'Au', 'Ag', 'Ca',
]);

/**
 * Pokédex / workshop metadata.
 * Keep damage in sync with formula_to_damage_dict in compounds.js.
 */
export const MOLECULE_CATALOG = Object.freeze({
    H2: {
        formula: 'H2',
        name: 'Hydrogen gas',
        damage: 10,
        effect: 'Light basic projectile.',
    },
    H2O: {
        formula: 'H2O',
        name: 'Water',
        damage: 40,
        effect: 'Splashes nearby enemies for half damage.',
    },
    NH3: {
        formula: 'NH3',
        name: 'Ammonia',
        damage: 50,
        effect: 'Poisons the target over time.',
    },
    CH4: {
        formula: 'CH4',
        name: 'Methane',
        damage: 40,
        effect: 'Explodes on impact: area damage and knockback.',
    },
    CN: {
        formula: 'CN',
        name: 'Cyanide',
        damage: 40,
        effect: 'Poisons the target over time.',
    },
    CO: {
        formula: 'CO',
        name: 'Carbon Monoxide',
        damage: 30,
        effect: 'Invisible gas projectile.',
    },
    O2: {
        formula: 'O2',
        name: 'Oxygen gas',
        damage: 10,
        effect: 'Light oxidizer shot.',
    },
    Na: {
        formula: 'Na',
        name: 'Sodium',
        damage: 90,
        effect: 'Explodes on neighbors.',
    },
    Cl: {
        formula: 'Cl',
        name: 'Chlorine',
        damage: 90,
        effect: 'Poison gas.',
    },
    Au: {
        formula: 'Au',
        name: 'Gold',
        damage: 80,
        effect: 'Heavy metal strike; grants extra attacks.',
    },
    Ag: {
        formula: 'Ag',
        name: 'Silver',
        damage: 40,
        effect: 'Metal strike; grants an extra attack.',
    },
    Ca: {
        formula: 'Ca',
        name: 'Calcium',
        damage: 40,
        effect: 'Makes the player stronger.',
    },
});

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

export const unlocked_scientists = writable(initial_unlocked_scientists());
export const discovered_molecules = writable(initial_discovered_molecules());
/**
 * Player-chosen battle loadout (formulas). Empty means “use automatic first 5”.
 * Only relevant once more than MAX_BATTLE_MOLECULES battle-usable molecules are owned.
 */
export const selected_battle_molecules = writable([]);
/** Scientist id currently being fought (timeline key, e.g. 'Democritus'). */
export const active_scientist_id = writable(null);

export function molecule_damage(formula) {
    return MOLECULE_CATALOG[formula]?.damage ?? 0;
}

export function molecule_info(formula) {
    const entry = MOLECULE_CATALOG[formula];
    if (!entry) {
        return {
            formula,
            name: formula,
            damage: 0,
            effect: 'Unknown effect.',
            battle_usable: BATTLE_USABLE_MOLECULES.includes(formula),
        };
    }
    return {
        ...entry,
        battle_usable: BATTLE_USABLE_MOLECULES.includes(formula),
    };
}

export function is_scientist_unlocked(scientist_id) {
    return !!get(unlocked_scientists)[scientist_id];
}

export function is_molecule_discovered(formula) {
    return !!get(discovered_molecules)[formula];
}

export function scientist_id_for(scientist) {
    if (!scientist) return null;
    if (typeof scientist === 'string') {
        if (scientists[scientist]) return scientist;
        return Object.keys(scientists).find((id) => scientists[id].name === scientist) ?? null;
    }
    return Object.keys(scientists).find((id) => scientists[id] === scientist || scientists[id].name === scientist.name) ?? null;
}

export function next_scientist_id(scientist_id) {
    const index = SCIENTIST_ORDER.indexOf(scientist_id);
    if (index < 0 || index >= SCIENTIST_ORDER.length - 1) return null;
    return SCIENTIST_ORDER[index + 1];
}

/** Preferred unlock order for auto loadout / candidates. */
export function preferred_molecule_order() {
    const preferred = [...STARTING_MOLECULES];
    for (const scientist_id of SCIENTIST_ORDER) {
        const reward = SCIENTIST_REWARD_MOLECULE[scientist_id];
        if (reward && !preferred.includes(reward)) preferred.push(reward);
    }
    for (const formula of BATTLE_USABLE_MOLECULES) {
        if (!preferred.includes(formula)) preferred.push(formula);
    }
    return preferred;
}

/**
 * All discovered ∩ battle-usable molecules in preferred order (uncapped).
 */
export function battle_candidate_formulas(discovered = get(discovered_molecules)) {
    const candidates = [];
    for (const formula of preferred_molecule_order()) {
        if (!discovered[formula]) continue;
        if (!BATTLE_USABLE_MOLECULES.includes(formula)) continue;
        candidates.push(formula);
    }
    return candidates;
}

/**
 * Molecules equipped for battle.
 * When ≤5 candidates, all are used. When >5, uses the player's selection
 * (falling back to the first 5 if selection is empty/invalid).
 */
export function resolve_battle_loadout(
    discovered = get(discovered_molecules),
    selected = get(selected_battle_molecules),
) {
    const candidates = battle_candidate_formulas(discovered);
    if (candidates.length <= MAX_BATTLE_MOLECULES) {
        return candidates;
    }
    const chosen = selected.filter((formula) => candidates.includes(formula));
    const unique = [...new Set(chosen)].slice(0, MAX_BATTLE_MOLECULES);
    if (unique.length > 0) {
        return unique;
    }
    return candidates.slice(0, MAX_BATTLE_MOLECULES);
}

/** @deprecated Prefer resolve_battle_loadout — kept for existing tests. */
export function battle_loadout_formulas(discovered = get(discovered_molecules)) {
    return resolve_battle_loadout(discovered, []);
}

export function toggle_battle_molecule(formula) {
    if (!BATTLE_USABLE_MOLECULES.includes(formula)) {
        return { ok: false, reason: 'not_usable' };
    }
    if (!is_molecule_discovered(formula)) {
        return { ok: false, reason: 'undiscovered' };
    }

    const candidates = battle_candidate_formulas();
    if (candidates.length <= MAX_BATTLE_MOLECULES) {
        return { ok: false, reason: 'selection_not_needed' };
    }

    const current = get(selected_battle_molecules);
    // If the player hasn't customized yet, seed from the auto loadout so toggles
    // feel like editing the current fight set rather than starting from empty.
    const working = current.length > 0
        ? [...current]
        : resolve_battle_loadout(get(discovered_molecules), []).slice();

    const index = working.indexOf(formula);
    if (index >= 0) {
        working.splice(index, 1);
        selected_battle_molecules.set(working);
        return { ok: true, selected: working, action: 'removed' };
    }

    if (working.length >= MAX_BATTLE_MOLECULES) {
        return { ok: false, reason: 'full', selected: working };
    }

    working.push(formula);
    selected_battle_molecules.set(working);
    return { ok: true, selected: working, action: 'added' };
}

export function set_battle_loadout(formulas) {
    const candidates = new Set(battle_candidate_formulas());
    const next = [...new Set(formulas)].filter((formula) => candidates.has(formula));
    if (next.length > MAX_BATTLE_MOLECULES) {
        return { ok: false, reason: 'too_many' };
    }
    selected_battle_molecules.set(next);
    return { ok: true, selected: next };
}

export const battle_loadout = derived(
    [discovered_molecules, selected_battle_molecules],
    ([$discovered, $selected]) => resolve_battle_loadout($discovered, $selected),
);

export const battle_candidates = derived(discovered_molecules, ($discovered) =>
    battle_candidate_formulas($discovered),
);

export const needs_battle_loadout_selection = derived(
    battle_candidates,
    ($candidates) => $candidates.length > MAX_BATTLE_MOLECULES,
);

export const discovered_molecule_list = derived(
    [discovered_molecules, selected_battle_molecules, needs_battle_loadout_selection],
    ([$discovered, $selected, $needs_selection]) => {
        const order = preferred_molecule_order();
        for (const formula of Object.keys(MOLECULE_CATALOG)) {
            if (!order.includes(formula)) order.push(formula);
        }
        const equipped = new Set(
            $needs_selection
                ? resolve_battle_loadout($discovered, $selected)
                : battle_candidate_formulas($discovered),
        );
        return order
            .filter((formula) => $discovered[formula])
            .map((formula) => ({
                ...molecule_info(formula),
                equipped: equipped.has(formula),
            }));
    },
);

/**
 * Call when the player beats the active scientist.
 * Unlocks the next scientist and the reward molecule for the beaten one.
 */
export function defeat_scientist(scientist_id = get(active_scientist_id)) {
    if (!scientist_id || !scientists[scientist_id]) {
        return { ok: false, reason: 'unknown' };
    }
    if (!is_scientist_unlocked(scientist_id)) {
        return { ok: false, reason: 'locked' };
    }

    const unlocked_molecule = SCIENTIST_REWARD_MOLECULE[scientist_id] ?? null;
    if (unlocked_molecule) {
        discovered_molecules.update((flags) => ({
            ...flags,
            [unlocked_molecule]: true,
        }));
        selected_battle_molecules.update((selected) => {
            const discovered = get(discovered_molecules);
            return selected.filter(
                (formula) => discovered[formula] && BATTLE_USABLE_MOLECULES.includes(formula),
            );
        });
    }

    const next_id = next_scientist_id(scientist_id);
    if (next_id) {
        unlocked_scientists.update((flags) => ({
            ...flags,
            [next_id]: true,
        }));
    }

    return {
        ok: true,
        unlocked_molecule,
        unlocked_scientist: next_id,
    };
}

/** Test / debug helper to restore fresh progression. */
export function reset_progression() {
    unlocked_scientists.set(initial_unlocked_scientists());
    discovered_molecules.set(initial_discovered_molecules());
    selected_battle_molecules.set([]);
    active_scientist_id.set(null);
}
