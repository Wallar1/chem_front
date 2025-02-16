import * as THREE from 'three';


export const camera_offset = 50;

export const earth_radius = 3000;
export const earth_initial_position = new THREE.Vector3(0,0,0);

export const initial_object_count = 100;
export const include_enemies = true;
export const seconds_between_spawns = 1;
export const count_to_spawn = 1;
// const speed = .2;
// const frame_rate = 60;
// const world_units_scale = 1/frame_rate  // used to adjust the speed of things, because moving an obj 10 units is super fast/far 
export const max_movement_speed = 5;
export const stun_time = 1;
export const burn_duration = 5;
export const burn_pulse_damage = 15;



// Input constants
export const movement_keys = ['w', 's', 'a', 'd']
export const space = ' '
export const tab = 'Tab'
export const meta_key = 'Meta'


// button axes:
export const cross_pad = 0;
export const left_stick_left_right = 1;
export const left_stick_up_down = 2;
export const right_stick_left_right = 3;
export const right_stick_up_down = 4;

export const left_button = 0;
export const bottom_button = 1;
export const right_button = 2; 
export const top_button = 3;
export const left_upper_trigger = 4;
export const right_upper_trigger = 5;
export const left_lower_trigger = 6;
export const right_lower_trigger = 7;
export const minus_button = 8;
export const plus_button = 9;
export const left_stick_push = 10;
export const right_stick_push = 11;
export const home_button = 12;
export const picture_thing = 13;
