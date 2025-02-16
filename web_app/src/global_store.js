import { writable, derived } from 'svelte/store';
import { scientists } from './components/scientist_timeline/scientists.js';


const possible_scenes = Object.freeze({
    'Loading': Symbol('loading'),
    'Timeline': Symbol('timeline'),
    'Battle': Symbol('battle'),
    'CompoundCreator': Symbol('compound creator'),
    'BalanceEquation': Symbol('balance equation'),
    'Story': Symbol('story'),
});
// export const current_scene = writable(possible_scenes.Story);
const current_scene = writable(possible_scenes.Battle);
// export const current_scene = writable(possible_scenes.Timeline);
// export const current_scene = writable(possible_scenes.CompoundCreator);
// export const current_scene = writable(possible_scenes.BalanceEquation);




// MULTIPLE SCENES

// Does this need to be a store?
const atoms = writable({
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


export const global_store = {
    atoms,
    current_scene,
    possible_scenes,
}
