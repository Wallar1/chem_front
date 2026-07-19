import { get } from 'svelte/store';
import * as THREE from 'three';
import { store } from './store.js'
import {jump, rotate_on_mouse_move} from './camera.js';
import {
    try_to_fire_player_weapon,
    start_flask_charge_indicator,
    stop_flask_charge_indicator,
} from './gun.js';
import {
    movement_keys,
    compound_selection_keys,
    space,
    axe_swing_key,
    pause_keys,
} from './constants.js';
import { has_upgrade, UPGRADE_IDS } from '../../upgrades.js';


export function init_pressed_keys() {
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    const back = new THREE.Vector3(0, 0, 1);
    const left = new THREE.Vector3(-1, 0, 0);
    store.pressed_keys = {
        'w': {
            'pressed': 0,
            'direction': forward,
        },
        's': {
            'pressed': 0,
            'direction': back,
        },
        'a': {
            'pressed': 0,
            'direction': left,
        },
        'd': {
            'pressed': 0,
            'direction': right,
        },
        ' ': {
            'pressed': 0
        }
    }
}

function is_playing() {
    return get(store.game_state).state === store.GameStates.PLAYING;
}

function is_pause_key(e) {
    return pause_keys.includes(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey;
}

function swallow_keyboard_event(e) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
    }
}

export function reset_pressed_keys() {
    if (!store.pressed_keys) return;
    for (const key of movement_keys) {
        if (store.pressed_keys[key]) {
            store.pressed_keys[key]['pressed'] = 0;
        }
    }
    if (store.pressed_keys[space]) {
        store.pressed_keys[space]['pressed'] = 0;
    }
}


export class InputHandler {
    constructor() {
        this._charge_started_at = null;
    }

    on_mouse_move(event){
        if (!is_playing()) return;
        rotate_on_mouse_move(event)
    }

    on_mouse_down(event) {
        if (!is_playing()) return;
        if (event.button !== 0) return;
        this._charge_started_at = performance.now();
        if (!has_upgrade(UPGRADE_IDS.ERLENMEYER_FLASK)) {
            this._fire_selected_compound(0);
            this._charge_started_at = null;
            return;
        }
        start_flask_charge_indicator();
    }

    on_mouse_up(event) {
        if (!is_playing()) return;
        if (event.button !== 0) return;
        if (!has_upgrade(UPGRADE_IDS.ERLENMEYER_FLASK)) {
            this._charge_started_at = null;
            return;
        }
        if (this._charge_started_at == null) return;
        const held_seconds = (performance.now() - this._charge_started_at) / 1000;
        const charge = Math.min(1, Math.max(0, held_seconds));
        this._charge_started_at = null;
        this._fire_selected_compound(charge);
    }

    cancel_flask_charge() {
        this._charge_started_at = null;
        stop_flask_charge_indicator();
    }

    _fire_selected_compound(charge) {
        let compound = get(store.key_to_compound)[get(store.selected_compound_index)]
        if (!compound) return;
        try_to_fire_player_weapon(compound, { charge })
    }

    on_keydown(e) {
        if (!is_playing()) return;

        if (is_pause_key(e)) {
            store.battle_scene?.pause();
            swallow_keyboard_event(e);
            return;
        }

        if (compound_selection_keys.includes(e.key)) {
            const loadout = get(store.key_to_compound);
            if (loadout[e.key]) {
                store.selected_compound_index.set(e.key);
            }
        } else if (e.key === axe_swing_key) {
            store.axe.try_to_swing();
        } else if (['ArrowRight', 'ArrowLeft'].indexOf(e.key) > -1) {
            const loadout = get(store.key_to_compound);
            const available_keys = compound_selection_keys.filter((key) => loadout[key]);
            if (!available_keys.length) return;
            let current_index = available_keys.indexOf(get(store.selected_compound_index));
            if (current_index < 0) current_index = 0;
            if (e.key === 'ArrowLeft') {
                current_index = current_index <= 0 ? available_keys.length - 1 : current_index - 1;
            } else {
                current_index = current_index >= available_keys.length - 1 ? 0 : current_index + 1;
            }
            store.selected_compound_index.set(available_keys[current_index]);
        } else if (movement_keys.includes(e.key)) {
            store.pressed_keys[e.key]['pressed'] = Math.min(5, store.pressed_keys[e.key]['pressed'] + 1);
        } else if (e.key === space) {
            if (!store.jump_in_progress && store.pressed_keys[space]['pressed'] === 0) {
                store.pressed_keys[space]['pressed'] = 1;
                jump();
            }
        }

        swallow_keyboard_event(e);
    }

    on_keyup(e) {
        if (!is_playing()) return;

        if (movement_keys.includes(e.key)) {
            store.pressed_keys[e.key]['pressed'] = 0;
        } else if (e.key === space) {
            store.pressed_keys[space]['pressed'] = 0;
        }

        swallow_keyboard_event(e);
    }
}
