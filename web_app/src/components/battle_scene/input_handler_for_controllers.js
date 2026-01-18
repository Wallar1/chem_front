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
    
    // Add WebXR controller state
    store.xrControllerState = {
        left: {
            selectPressed: false,
            squeezePressed: false,
            lastPosition: new THREE.Vector3(),
            lastRotation: new THREE.Quaternion()
        },
        right: {
            selectPressed: false,
            squeezePressed: false,
            lastPosition: new THREE.Vector3(),
            lastRotation: new THREE.Quaternion()
        }
    };
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
        this.isXR = false;
    }

    connect(evt) {
        this.controller = evt.gamepad;
        this.connected = true;
        
        // Check if this is an XR controller
        if (this.controller.id.includes('XR') || this.controller.mapping === 'xr-standard') {
            this.isXR = true;
            console.log('XR Gamepad connected.');
        } else {
            this.isXR = false;
            console.log('Standard Gamepad connected.');
        }
        
        console.log(this.controller);
    }

    disconnect() {
        this.connected = false;
    }
    
    update() {
        if (!this.connected) return;
        
        if (this.isXR && store.renderer.xr.isPresenting) {
            this.updateXRControllers();
        } else {
            this.update_pressed_values();
        }
        
        this.act_on_pressed_buttons();
    }
    
    updateXRControllers() {
        // Update XR controller state if we're in an XR session
        if (!store.controllers || store.controllers.length === 0) return;
        
        // Update controller positions and states
        store.controllers.forEach(controller => {
            if (!controller.userData.handedness) return;
            
            const handedness = controller.userData.handedness;
            const controllerState = store.xrControllerState[handedness];
            
            // Store position and rotation for movement calculation
            controller.getWorldPosition(controllerState.lastPosition);
            controller.getWorldQuaternion(controllerState.lastRotation);
            
            // The controller events (selectstart, etc.) are handled in BattleScene directly
        });
    }

    update_pressed_values() {
        // Skip if we're in XR mode
        if (this.isXR && store.renderer.xr.isPresenting) return;
        
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
        // Standard gamepad buttons
        if (!this.isXR || !store.renderer.xr.isPresenting) {
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
        
        // XR controller actions - moved to event listeners in basic_gameplay_2.js
    }
}

// Helper functions for XR Controller interaction
export function handleXRControllerSelect(controller) {
    const handedness = controller.userData.handedness;
    
    // Map select action to firing the player's weapon
    if (handedness === 'right') {
        let keys_to_compound = get(store.key_to_compound);
        let compound = keys_to_compound[right_upper_trigger]; // Map to appropriate trigger
        try_to_fire_player_weapon(compound);
    } else if (handedness === 'left') {
        let keys_to_compound = get(store.key_to_compound);
        let compound = keys_to_compound[left_upper_trigger]; // Map to appropriate trigger
        try_to_fire_player_weapon(compound);
    }
}

export function handleXRControllerSqueeze(controller) {
    // Map squeeze action to swinging the axe
    store.axe.try_to_swing();
}

export function handleXRControllerMovement() {
    if (!store.controllers || store.controllers.length === 0) return;
    
    // Use the right controller for movement if present
    let movementController = null;
    for (const controller of store.controllers) {
        if (controller.userData.handedness === 'right') {
            movementController = controller;
            break;
        }
    }
    
    if (!movementController) return;
    
    // Get controller forward direction
    const controllerDirection = new THREE.Vector3(0, 0, -1);
    controllerDirection.applyQuaternion(movementController.quaternion);
    controllerDirection.y = 0; // Keep movement on the horizontal plane
    controllerDirection.normalize();
    
    // Use this direction for player movement
    store.current_direction_vector.copy(controllerDirection);
}
