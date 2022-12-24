
import { writable, derived } from 'svelte/store';
import { scientists } from './components/scientist_timeline/scientists.js';
import { parse_formula_to_dict } from './helper_functions.js';

export const possible_scenes = Object.freeze({
    'Loading': Symbol('loading'),
    'Timeline': Symbol('timeline'),
    'Battle': Symbol('battle'),
    'CompoundCreator': Symbol('compound creator')
});
export const current_scene = writable(possible_scenes.Timeline);

export const current_scientist = writable(scientists.RobertBoyle);

export let watched_keys = ['q', 'w', 'e', 'r', ' '];
export const key_to_compound = writable({
    'q': 'H2',
    'w': 'CH4',
    'e': 'NH3',
    'r': 'CN',
    ' ': 'H2O'
})

let counts = {
    'H': 20,
}
export const current_element_counts = writable(counts);


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
                    let max_possible = Math.floor($current_element_counts[element] / count_needed);
                    current_max_count = Math.min(max_possible, current_max_count);
                }
            }
            max_possible_by_compound[compound] = current_max_count
        }
        return max_possible_by_compound
    }
)