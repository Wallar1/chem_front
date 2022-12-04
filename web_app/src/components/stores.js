
import { writable, derived } from 'svelte/store';
export const last_pressed_key = writable('p');

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
        return $key_to_compound[$last_pressed_key]
    }
);
