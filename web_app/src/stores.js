
import { writable, derived } from 'svelte/store';
import { scientists } from './components/scientist_timeline/scientists.js';
import { parse_formula_to_dict } from './helper_functions.js';



export const possible_scenes = Object.freeze({
    'Loading': Symbol('loading'),
    'Timeline': Symbol('timeline'),
    'Battle': Symbol('battle'),
    'CompoundCreator': Symbol('compound creator'),
    'BalanceEquation': Symbol('balance equation'),
    'Story': Symbol('story'),
});
// export const current_scene = writable(possible_scenes.Story);
// export const current_scene = writable(possible_scenes.Battle);
// export const current_scene = writable(possible_scenes.Timeline);
// export const current_scene = writable(possible_scenes.CompoundCreator);
export const current_scene = writable(possible_scenes.BalanceEquation);


export const global_updates_queue = writable([]);


// SCIENTIST TIMELINE SCENE


export const current_scientist = writable(scientists.RobertBoyle);




// BATTLE SCENE

export const initial_player_health = 100;
export const player_health = writable(initial_player_health);
export const player_score = writable(0);

export const key_to_compound = writable({
    '1': 'H2',
    '2': 'CH4',
    '3': 'NH3',
    '4': 'CN',
    '5': 'H2O'
})


export const GameStates = Object.freeze({
    'STARTING': Symbol('starting'),
    'PLAYING': Symbol('playing'),
    'GAMELOST': Symbol('game_over'),
    'GAMEWON': Symbol('game won'),
});

export const game_state = writable({
    'state': GameStates.STARTING,
    'level': 1,
});


let initial_counts = {
    'H': {
        count: 20,
        last_updated: Date.now(),
    }
}
function create_current_counts_store() {
    const { subscribe, set: originalSet, update } = writable(window.structuredClone(initial_counts));

    return {
        subscribe,
        update: (element, added_amount) => {
            update(counts => {
                if (!counts[element]) {
                    counts[element] = { count: 0, last_updated: Date.now() };
                }
                counts[element]['count'] += added_amount;
                counts[element]['last_updated'] = Date.now();
                return counts;
            });
        },
        set: (element, new_count) => {
            update(counts => {
                if (!counts[element]) {
                    counts[element] = { count: 0, last_updated: Date.now() };
                }
                counts[element]['count'] = new_count;
                counts[element]['last_updated'] = Date.now();
                return counts
            })
        },
        reset: () => {
            const initial_with_updated_date = window.structuredClone(initial_counts)
            initial_with_updated_date['H']['last_updated'] = Date.now()
            originalSet(initial_with_updated_date)
        }
    };
}
export const current_element_counts = create_current_counts_store();


/*
Tell you how many CH3 (for example) you can make. Maybe you can make 5 of that compound
*/
export const max_number_possible_for_each_compound = derived(
    [key_to_compound, current_element_counts],
    ([$key_to_compound, $current_element_counts]) => {
        let max_possible_by_compound = {}
        let compounds = Object.values($key_to_compound);
        for (let i=0; i<compounds.length; i++) {
            let current_max_count = Infinity
            let compound = compounds[i];
            let entries = Object.entries(parse_formula_to_dict(compound))
            for (let i=0; i<entries.length; i++) {
                let [element, count_needed] = entries[i];
                if ($current_element_counts[element] === undefined) {
                    current_max_count = 0;
                } else {
                    let max_possible = Math.floor($current_element_counts[element]['count'] / count_needed);
                    current_max_count = Math.min(max_possible, current_max_count);
                }
            }
            max_possible_by_compound[compound] = current_max_count
        }
        return max_possible_by_compound
    }
)

const element_colors = { h: [ 20, 20, 20 ], he: [ 217, 255, 255 ], li: [ 204, 128, 255 ], be: [ 194, 255, 0 ], b: [ 255, 181, 181 ], c: [ 144, 144, 144 ], n: [ 48, 80, 248 ], o: [ 255, 13, 13 ], f: [ 144, 224, 80 ], ne: [ 179, 227, 245 ], na: [ 171, 92, 242 ], mg: [ 138, 255, 0 ], al: [ 191, 166, 166 ], si: [ 240, 200, 160 ], p: [ 255, 128, 0 ], s: [ 255, 255, 48 ], cl: [ 31, 240, 31 ], ar: [ 128, 209, 227 ], k: [ 143, 64, 212 ], ca: [ 61, 255, 0 ], sc: [ 230, 230, 230 ], ti: [ 191, 194, 199 ], v: [ 166, 166, 171 ], cr: [ 138, 153, 199 ], mn: [ 156, 122, 199 ], fe: [ 224, 102, 51 ], co: [ 240, 144, 160 ], ni: [ 80, 208, 80 ], cu: [ 200, 128, 51 ], zn: [ 125, 128, 176 ], ga: [ 194, 143, 143 ], ge: [ 102, 143, 143 ], as: [ 189, 128, 227 ], se: [ 255, 161, 0 ], br: [ 166, 41, 41 ], kr: [ 92, 184, 209 ], rb: [ 112, 46, 176 ], sr: [ 0, 255, 0 ], y: [ 148, 255, 255 ], zr: [ 148, 224, 224 ], nb: [ 115, 194, 201 ], mo: [ 84, 181, 181 ], tc: [ 59, 158, 158 ], ru: [ 36, 143, 143 ], rh: [ 10, 125, 140 ], pd: [ 0, 105, 133 ], ag: [ 192, 192, 192 ], cd: [ 255, 217, 143 ], in: [ 166, 117, 115 ], sn: [ 102, 128, 128 ], sb: [ 158, 99, 181 ], te: [ 212, 122, 0 ], i: [ 148, 0, 148 ], xe: [ 66, 158, 176 ], cs: [ 87, 23, 143 ], ba: [ 0, 201, 0 ], la: [ 112, 212, 255 ], ce: [ 255, 255, 199 ], pr: [ 217, 255, 199 ], nd: [ 199, 255, 199 ], pm: [ 163, 255, 199 ], sm: [ 143, 255, 199 ], eu: [ 97, 255, 199 ], gd: [ 69, 255, 199 ], tb: [ 48, 255, 199 ], dy: [ 31, 255, 199 ], ho: [ 0, 255, 156 ], er: [ 0, 230, 117 ], tm: [ 0, 212, 82 ], yb: [ 0, 191, 56 ], lu: [ 0, 171, 36 ], hf: [ 77, 194, 255 ], ta: [ 77, 166, 255 ], w: [ 33, 148, 214 ], re: [ 38, 125, 171 ], os: [ 38, 102, 150 ], ir: [ 23, 84, 135 ], pt: [ 208, 208, 224 ], au: [ 255, 209, 35 ], hg: [ 184, 184, 208 ], tl: [ 166, 84, 77 ], pb: [ 87, 89, 97 ], bi: [ 158, 79, 181 ], po: [ 171, 92, 0 ], at: [ 117, 79, 69 ], rn: [ 66, 130, 150 ], fr: [ 66, 0, 102 ], ra: [ 0, 125, 0 ], ac: [ 112, 171, 250 ], th: [ 0, 186, 255 ], pa: [ 0, 161, 255 ], u: [ 0, 143, 255 ], np: [ 0, 128, 255 ], pu: [ 0, 107, 255 ], am: [ 84, 92, 242 ], cm: [ 120, 92, 227 ], bk: [ 138, 79, 227 ], cf: [ 161, 54, 212 ], es: [ 179, 31, 212 ], fm: [ 179, 31, 186 ], md: [ 179, 13, 166 ], no: [ 189, 13, 135 ], lr: [ 199, 0, 102 ], rf: [ 204, 0, 89 ], db: [ 209, 0, 79 ], sg: [ 217, 0, 69 ], bh: [ 224, 0, 56 ], hs: [ 230, 0, 46 ], mt: [ 235, 0, 38 ], ds: [ 235, 0, 38 ], rg: [ 235, 0, 38 ], cn: [ 235, 0, 38 ], uut: [ 235, 0, 38 ], uuq: [ 235, 0, 38 ], uup: [ 235, 0, 38 ], uuh: [ 235, 0, 38 ], uus: [ 235, 0, 38 ], uuo: [ 235, 0, 38 ] };





// MULTIPLE SCENES


export const atoms = writable({
    'C': {
        'color': [144, 144, 144],
        'bonds': 4,
    },
    'N': {
        'color': [48, 80, 248],
        'bonds': 3,
    },
    'O': {
        'color': [255, 13, 13],
        'bonds': 2,
    },
    'H': {
        'color': [20, 20, 20],
        'bonds': 1,
    },
    'NA': {
        'color': [171, 92, 242],
        'bonds': 1,
    },
    'CL': {
        'color': [31, 240, 31],
        'bonds': 1,
    },
})


// COMPOUND PAINT BY NUMBERS SCENE


export const selected_atom = writable('C');

export const creator_moves_remaining = writable(0);






// BALANCE EQUATION SCENE

export const sides = Object.freeze({
    LEFT: 'left',
    RIGHT: 'right',
    BALANCED: 'balanced',
})


export const initial_element_counts = {}
initial_element_counts[sides.LEFT] = {}
initial_element_counts[sides.RIGHT] = {}
export const element_counts = writable(window.structuredClone(initial_element_counts))

export const balance_rotations = derived(
	element_counts,
	($element_counts) => {
        let _balance_rotations = {};
        [sides.LEFT, sides.RIGHT].forEach(l_or_r => {
            Object.keys($element_counts[l_or_r]).forEach(el => {
                let left_count = $element_counts[sides.LEFT][el] || 0;
                let right_count = $element_counts[sides.RIGHT][el] || 0;
                let degrees_of_rotation = left_vs_right_to_degrees_of_rotation(left_count, right_count)
                _balance_rotations[el] = degrees_of_rotation;
            });
        });
        return _balance_rotations;
    }
);

let initial_compounds_in_scene = {};
// hard
// initial_compounds_in_scene[sides.LEFT] = ['ethane', 'oxygen gas'];
// initial_compounds_in_scene[sides.RIGHT] = ['carbon dioxide', 'water'];

// too easy
// initial_compounds_in_scene[sides.LEFT] = ['hydrochloric acid', 'sodium hydroxide'];
// initial_compounds_in_scene[sides.RIGHT] = ['sodium chloride', 'water'];

// easy
// initial_compounds_in_scene[sides.LEFT] = ['nitrogen gas', 'hydrogen gas'];
// initial_compounds_in_scene[sides.RIGHT] = ['ammonia'];

// medium/hard
initial_compounds_in_scene[sides.LEFT] = ['ammonia', 'oxygen gas'];
initial_compounds_in_scene[sides.RIGHT] = ['nitrogen gas', 'water'];
export const compounds_in_scene = writable(window.structuredClone(initial_compounds_in_scene));



/*
This function returns the degrees of rotation.
Imagine there are 16 C atoms, all on the left. Then this function should return -90
If all the atoms were on the right, it would return 90
If balanced, return 0
If 12/16 were on the right, it should return 45
and if 12/16 were on the left, it should return -45.


15 out of 16 should return -80 or so.
*/
function left_vs_right_to_degrees_of_rotation(left_count, right_count) {
    return ((right_count) / (right_count + left_count)) * 180 - 90
}

export const need_to_delete = writable(false);
