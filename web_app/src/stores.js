
import { writable, derived } from 'svelte/store';
import { scientists } from './components/scientist_timeline/scientists.js';

export const possible_scenes = Object.freeze({
    'Loading': Symbol('loading'),
    'Timeline': Symbol('timeline'),
    'Battle': Symbol('battle'),
    'CompoundCreator': Symbol('compound creator')
});
export const current_scene = writable(possible_scenes.Timeline);

export const last_pressed_key = writable('p');

export const current_scientist = writable(scientists.RobertBoyle);

export const key_to_compound = writable({
    'q': 'H2',
    'w': 'CH4',
    'e': 'NH3',
    'r': 'CN',
    't': 'H2O'
})

export const selected_compound = derived(
	[last_pressed_key, key_to_compound],
	([$last_pressed_key, $key_to_compound]) => {
        return $key_to_compound[$last_pressed_key] ? $key_to_compound[$last_pressed_key] : 'H2';
    }
);
