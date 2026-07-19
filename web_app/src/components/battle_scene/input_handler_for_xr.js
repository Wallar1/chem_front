import { get } from 'svelte/store';
import { store } from './store.js';
import { jump, rotate_camera_yaw } from './camera.js';
import {
    try_to_fire_player_weapon,
    start_flask_charge_indicator,
    stop_flask_charge_indicator,
} from './gun.js';
import { compound_selection_keys } from './constants.js';
import { has_upgrade, UPGRADE_IDS } from '../../upgrades.js';

/**
 * Quest / WebXR (xr-standard) → keyboard action map
 *
 * Left thumbstick     → WASD movement (same pressed_keys path as keyboard)
 * Right thumbstick X  → yaw turn (comfort look; headset still owns pitch)
 * Trigger (either)    → fire selected compound (mouse LMB)
 * Grip / squeeze      → axe swing (V)
 * A / X (button 4)    → jump (Space)
 * B / Y (button 5)    → cycle compound loadout (ArrowRight)
 * Thumbstick click    → pause (Escape / P)
 */

const XR_TRIGGER = 0;
const XR_SQUEEZE = 1;
const XR_THUMBSTICK_CLICK = 3;
const XR_BUTTON_AX = 4;
const XR_BUTTON_BY = 5;
const XR_THUMBSTICK_X = 2;
const XR_THUMBSTICK_Y = 3;

const MOVE_DEADZONE = 0.18;
const TURN_DEADZONE = 0.35;
const TURN_SPEED_RAD_PER_SEC = 1.8;
const STICK_PRESS_SCALE = 5;

function is_playing() {
    return get(store.game_state).state === store.GameStates.PLAYING;
}

function is_xr_presenting() {
    return Boolean(store.renderer?.xr?.isPresenting);
}

function axis_value(gamepad, index) {
    const value = gamepad.axes[index];
    return typeof value === 'number' ? value : 0;
}

function button_pressed(gamepad, index) {
    const button = gamepad.buttons[index];
    return Boolean(button && (button.pressed || button.value > 0.75));
}

function button_value(gamepad, index) {
    const button = gamepad.buttons[index];
    if (!button) return 0;
    if (typeof button.value === 'number') return button.value;
    return button.pressed ? 1 : 0;
}

function set_movement_from_stick(x, y) {
    const apply = (key, amount) => {
        store.pressed_keys[key].pressed = amount > MOVE_DEADZONE
            ? Math.min(STICK_PRESS_SCALE, amount * STICK_PRESS_SCALE)
            : 0;
    };
    // WebXR thumbstick: -Y is usually forward
    apply('w', -y);
    apply('s', y);
    apply('a', -x);
    apply('d', x);
}

function clear_xr_movement_keys() {
    if (!store.pressed_keys) return;
    for (const key of ['w', 's', 'a', 'd']) {
        store.pressed_keys[key].pressed = 0;
    }
}

function cycle_compound(direction = 1) {
    const loadout = get(store.key_to_compound);
    const available_keys = compound_selection_keys.filter((key) => loadout[key]);
    if (!available_keys.length) return;
    let current_index = available_keys.indexOf(get(store.selected_compound_index));
    if (current_index < 0) current_index = 0;
    current_index = (current_index + direction + available_keys.length) % available_keys.length;
    store.selected_compound_index.set(available_keys[current_index]);
}

function fire_selected(charge = 0) {
    const compound = get(store.key_to_compound)[get(store.selected_compound_index)];
    if (!compound) return;
    try_to_fire_player_weapon(compound, { charge });
}

/**
 * Polls XR input sources each frame and drives the same actions as keyboard/mouse.
 */
export class XRInputHandler {
    constructor() {
        this._prev = {
            trigger: false,
            squeeze: false,
            jump: false,
            cycle: false,
            pause: false,
        };
        this._charge_started_at = null;
    }

    reset() {
        this._prev = {
            trigger: false,
            squeeze: false,
            jump: false,
            cycle: false,
            pause: false,
        };
        this._charge_started_at = null;
        clear_xr_movement_keys();
        stop_flask_charge_indicator();
    }

    update(time_delta) {
        if (!is_xr_presenting()) return;

        const session = store.renderer.xr.getSession();
        if (!session) return;

        let move_x = 0;
        let move_y = 0;
        let turn_x = 0;
        let trigger_down = false;
        let squeeze_down = false;
        let jump_down = false;
        let cycle_down = false;
        let pause_down = false;

        for (const source of session.inputSources) {
            const gamepad = source.gamepad;
            if (!gamepad || gamepad.mapping !== 'xr-standard') continue;

            const stick_x = axis_value(gamepad, XR_THUMBSTICK_X);
            const stick_y = axis_value(gamepad, XR_THUMBSTICK_Y);

            if (source.handedness === 'left') {
                move_x = stick_x;
                move_y = stick_y;
            } else if (source.handedness === 'right') {
                turn_x = stick_x;
            } else {
                // Undeclared handedness: treat first stick as move
                if (Math.abs(stick_x) > Math.abs(move_x)) move_x = stick_x;
                if (Math.abs(stick_y) > Math.abs(move_y)) move_y = stick_y;
            }

            if (button_pressed(gamepad, XR_TRIGGER) || button_value(gamepad, XR_TRIGGER) > 0.75) {
                trigger_down = true;
            }
            if (button_pressed(gamepad, XR_SQUEEZE)) squeeze_down = true;
            if (button_pressed(gamepad, XR_BUTTON_AX)) jump_down = true;
            if (button_pressed(gamepad, XR_BUTTON_BY)) cycle_down = true;
            if (button_pressed(gamepad, XR_THUMBSTICK_CLICK)) pause_down = true;
        }

        if (!is_playing()) {
            clear_xr_movement_keys();
            this._prev.trigger = trigger_down;
            this._prev.squeeze = squeeze_down;
            this._prev.jump = jump_down;
            this._prev.cycle = cycle_down;
            this._prev.pause = pause_down;
            return;
        }

        set_movement_from_stick(move_x, move_y);

        if (Math.abs(turn_x) > TURN_DEADZONE) {
            rotate_camera_yaw(-turn_x * TURN_SPEED_RAD_PER_SEC * time_delta);
        }

        // Trigger edge: press starts fire/charge; release finishes charged shot
        if (trigger_down && !this._prev.trigger) {
            this._charge_started_at = performance.now();
            if (!has_upgrade(UPGRADE_IDS.ERLENMEYER_FLASK)) {
                fire_selected(0);
                this._charge_started_at = null;
            } else {
                start_flask_charge_indicator();
            }
        } else if (!trigger_down && this._prev.trigger) {
            if (has_upgrade(UPGRADE_IDS.ERLENMEYER_FLASK) && this._charge_started_at != null) {
                const held_seconds = (performance.now() - this._charge_started_at) / 1000;
                const charge = Math.min(1, Math.max(0, held_seconds));
                this._charge_started_at = null;
                fire_selected(charge);
            } else {
                this._charge_started_at = null;
                stop_flask_charge_indicator();
            }
        }

        if (squeeze_down && !this._prev.squeeze) {
            store.axe?.try_to_swing?.();
        }

        if (jump_down && !this._prev.jump && !store.jump_in_progress) {
            if (store.pressed_keys[' ']) {
                store.pressed_keys[' '].pressed = 1;
            }
            jump();
        } else if (!jump_down && store.pressed_keys?.[' ']) {
            store.pressed_keys[' '].pressed = 0;
        }

        if (cycle_down && !this._prev.cycle) {
            cycle_compound(1);
        }

        if (pause_down && !this._prev.pause) {
            store.battle_scene?.pause?.();
        }

        this._prev.trigger = trigger_down;
        this._prev.squeeze = squeeze_down;
        this._prev.jump = jump_down;
        this._prev.cycle = cycle_down;
        this._prev.pause = pause_down;
    }
}
