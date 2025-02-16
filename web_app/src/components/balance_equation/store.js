import { writable, derived } from 'svelte/store';

const GameStates = Object.freeze({
    'STARTING': Symbol('starting'),
    'PLAYING': Symbol('playing'),
    'GAMELOST': Symbol('game_over'),
    'GAMEWON': Symbol('game won'),
});

const game_state = writable({
    'state': GameStates.STARTING,
    'level': 1,
});

const sides = Object.freeze({
    LEFT: 'left',
    RIGHT: 'right',
    BALANCED: 'balanced',
})

let need_to_delete = writable(false);


const initial_element_counts = {}
initial_element_counts[sides.LEFT] = {}
initial_element_counts[sides.RIGHT] = {}
const element_counts = writable(window.structuredClone(initial_element_counts))

const balance_rotations = derived(
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

const initial_compounds_in_scene = {};
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
const compounds_in_scene = writable(window.structuredClone(initial_compounds_in_scene));



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



let global_clock = undefined;
let global_updates_queue = [];
let time_delta = undefined;
let scene = undefined;
let renderer = undefined;
let camera = undefined;
let mouse_ray = undefined;
let mouse = undefined;
let draggable_objects = [];
let non_deletable_objs = [];


export const store = {
    GameStates,
    game_state,
    sides,
    need_to_delete,
    initial_element_counts,
    element_counts,
    balance_rotations,
    compounds_in_scene,
    left_vs_right_to_degrees_of_rotation,
    global_clock,
    global_updates_queue,
    time_delta,
    scene,
    renderer,
    camera,
    mouse_ray,
    mouse,
    draggable_objects,
    non_deletable_objs,
}