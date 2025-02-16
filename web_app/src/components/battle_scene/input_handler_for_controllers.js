import * as THREE from 'three';
import { get } from 'svelte/store';
import { store } from './store.js'
import { jump } from './camera.js';
import { try_to_fire_player_weapon } from './gun.js';
import {
    left_button,
    bottom_button,
    right_button, 
    top_button,
    left_upper_trigger,
    right_upper_trigger,
    left_lower_trigger,
    right_lower_trigger,
    minus_button,
    plus_button,
    left_stick_push,
    right_stick_push,
    home_button,
    picture_thing,
    cross_pad,
    left_stick_left_right,
    left_stick_up_down,
    right_stick_left_right,
    right_stick_up_down,
} from './constants.js';

export function init_pushed_buttons() {
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    const back = new THREE.Vector3(0, 0, 1);
    const left = new THREE.Vector3(-1, 0, 0);

    // TODO: figure out what the axes are called on the controller and rename these keys
    store.pushed_buttons = {
        'axes': {
            [left_stick_left_right]: {'value': 0},
            [left_stick_up_down]: {'value': 0},
            [right_stick_left_right]: {
                'value': 0,
                'direction': [left, right],
            },
            [right_stick_up_down]: {
                'value': 0,
                'direction': [forward, back],
            },
        },
        'buttons': {
            [left_button]: {'frames_pressed': 0},
            [bottom_button]: {'frames_pressed': 0},
            [right_button]: {'frames_pressed': 0}, 
            [top_button]: {'frames_pressed': 0},
            [left_upper_trigger]: {'frames_pressed': 0},
            [right_upper_trigger]: {'frames_pressed': 0},
            [left_lower_trigger]: {'frames_pressed': 0},
            [right_lower_trigger]: {'frames_pressed': 0},
            [minus_button]: {'frames_pressed': 0},
            [plus_button]: {'frames_pressed': 0},
            [left_stick_push]: {'frames_pressed': 0},
            [right_stick_push]: {'frames_pressed': 0},
            [home_button]: {'frames_pressed': 0},
            [picture_thing]: {'frames_pressed': 0},
        },
    }
}


// const buttons = [
//     'DPad-Up','DPad-Down','DPad-Left','DPad-Right',
//     'Start','Back','Axis-Left','Axis-Right',
//     'LB','RB','Power','A','B','X','Y',
// ]
  
export class ContollerInputHandler {
    constructor() {
        this.controller = {'buttons': [], 'axes': []};
        this.connected = false;
    }

    connect(evt) {
        this.controller = evt.gamepad;
        this.connected = true;
        console.log('Gamepad connected.');
        console.log(this.controller);
    }

    disconnect() {
        this.connected = false;
    }
    
    update() {
        this.update_pressed_values();
        this.act_on_pressed_buttons();
    }

    update_pressed_values() {
        for (let i = 0; i < this.controller.buttons.length; i++) {
            let button = this.controller.buttons[i];
            if (button.pressed) {
                store.pushed_buttons['buttons'][i]['frames_pressed'] += 1
            } else {
                store.pushed_buttons['buttons'][i]['frames_pressed'] = 0;
            }
        }
        for (const axis of [1,2,3,4]) {
            let value = this.controller.axes[axis].toFixed(2);
            // make sure they actually move the stick (accounts for controller drift)
            if (value * value > 0.4) {
                store.pushed_buttons['axes'][axis]['value'] = value;
            } else {
                store.pushed_buttons['axes'][axis]['value'] = 0;
            }
        }
    }

    act_on_pressed_buttons() {
        for (let i = 0; i < Object.keys(store.pushed_buttons['buttons']).length; i++) {
            if (store.pushed_buttons['buttons'][i]['frames_pressed'] === 0) continue;
            if (i === bottom_button && store.pushed_buttons['buttons'][i]['frames_pressed'] === 1) {
                jump();
            } else if ([right_lower_trigger, right_upper_trigger, left_lower_trigger, left_upper_trigger].indexOf(i) > -1) {
                let keys_to_compound = get(store.key_to_compound)
                let compound = keys_to_compound[i]
                try_to_fire_player_weapon(compound)
            } else if (i === left_stick_push || i === right_stick_push) {
                store.axe.try_to_swing();
            }
        }
    }
}
