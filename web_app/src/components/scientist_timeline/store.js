import { writable } from 'svelte/store';

import { scientists } from './scientists';

const current_scientist = writable(scientists.RobertBoyle);

export const store = {
    current_scientist,
}