import * as THREE from 'three';
import { get } from 'svelte/store';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
// import * as AmmoLib from '../lib/ammo.js';
import { Updater } from './objects.js';
import { create_mine, create_cloud } from './mines_and_clouds.js';
import { inialize_axe } from './axe.js';
import { add_energy_effect_updater } from './lab.js';
import { create_enemy } from './enemies.js';
import { InputHandler, init_pressed_keys, reset_pressed_keys } from './input_handler.js';
import { ContollerInputHandler, init_pushed_buttons } from './input_handler_for_controllers.js';
import { XRInputHandler } from './input_handler_for_xr.js';
import { store } from './store.js';
import { earth_radius, initial_object_count, include_enemies, count_to_spawn, seconds_between_spawns, pause_keys } from './constants.js';
import { create_earth } from './earth.js';
import {
    create_camera,
    move_camera,
    rotate_on_controller_move,
    enter_xr_camera_rig,
    exit_xr_camera_rig,
} from './camera.js';
import { create_gun } from './gun.js';
import {
    get_random_from_probilities,
    dispose_group,
    dispose_renderer
} from '../../helper_functions.js';

import { Stats } from '../../../public/lib/stats.js'


// Tutorial for collision detection:
// https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection/Bounding_volume_collision_detection_with_THREE.js


// Tips for speeding up:
//https://attackingpixels.com/tips-tricks-optimizing-three-js-performance/
// also his 3d portfolio tutorial
// https://attackingpixels.com/three-js-timeline-career-3D-portfolio/




const ZONE_SPREAD_RADIANS = 0.12;
const ZONE_AGGRO_RADIUS = earth_radius * 0.25;
const SCATTERED_OBJECT_FRACTION = 0.15;
const MINES_PER_ENEMY = 0.4;
const CLOUDS_PER_ENEMY = 0.8;

function initialize_vars(){
    store.global_clock = new THREE.Clock();
    store.mouse_ray = new THREE.Raycaster();
    store.mouse = new THREE.Vector2();
    store.enemies = [];
    store.clouds = [];
    store.mines = [];
    store.labs = [];
    store.zones = [];
    store.lab_effects = {'nuclear': 0, 'electrical': 0, 'kinetic': 0, 'thermal': 0, 'chemical': 0, 'sound': 0};
    store.current_direction_vector = new THREE.Vector3(0, 0, 0);
    store.jump_in_progress = false;
    store.xr_controllers = [];
    store.xr_controller_grips = [];
    store.player_rig = null;
}

export class BattleScene {
    constructor() {
        create_renderer();
        initialize_vars();
        create_earth();
        create_camera();
        inialize_axe();
        create_gun();
        init_stats();
        init_pressed_keys();
        init_pushed_buttons();
        
        const canvas_container = document.getElementById('canvas-container')
        canvas_container.appendChild(store.renderer.domElement);

        this._vr_button = VRButton.createButton(store.renderer);
        this._vr_button.id = 'VRButton';
        this._ar_button = ARButton.createButton(store.renderer, {
            optionalFeatures: ['dom-overlay', 'local-floor'],
            domOverlay: { root: document.body },
        });
        this._ar_button.id = 'ARButton';
        canvas_container.appendChild(this._vr_button);
        canvas_container.appendChild(this._ar_button);

        store.scene = new THREE.Scene()

        // this.orbit_controls = new OrbitControls( store.camera, store.renderer.domElement );

        store.scene.add(create_directional_light());
        store.scene.add(new THREE.AmbientLight(0xFFFFFF, 0.25));

        store.scene.background = create_background();
        store.scene.add(store.earth);
    
        store.mouse_ray.setFromCamera( store.mouse, store.camera );

        store.renderer.render(store.scene, store.camera);

        spawn_cluster_zones(initial_object_count, include_enemies)
        continue_spawning_objects(count_to_spawn, seconds_between_spawns)

        music.play();

        this.input_handler = new InputHandler();
        this.controller_input_handler = new ContollerInputHandler();
        this.xr_input_handler = new XRInputHandler();
        store.battle_scene = this;

        this._on_xr_session_start = this.on_xr_session_start.bind(this);
        this._on_xr_session_end = this.on_xr_session_end.bind(this);
        store.renderer.xr.addEventListener('sessionstart', this._on_xr_session_start);
        store.renderer.xr.addEventListener('sessionend', this._on_xr_session_end);
        this.init_xr_controllers();
    }

    on_xr_session_start() {
        store.xr_presenting = true;
        const session = store.renderer.xr.getSession();
        // Passthrough / AR: drop the cubemap so the real world can show through.
        if (session?.environmentBlendMode && session.environmentBlendMode !== 'opaque') {
            store.scene.background = null;
        }

        const rig = enter_xr_camera_rig();
        for (const controller of store.xr_controllers) {
            rig.add(controller);
        }
        for (const grip of store.xr_controller_grips) {
            rig.add(grip);
        }

        // FPS gun/axe sit on the desktop camera; hide them in immersive mode.
        if (store.gun) store.gun.visible = false;
        if (store.axe) store.axe.visible = false;

        document.exitPointerLock?.();
        this.xr_input_handler.reset();

        // Entering VR from the start overlay should begin play without a mouse click.
        const state = get(store.game_state).state;
        if (state === store.GameStates.STARTING) {
            store.game_state.update((current) => {
                current.state = store.GameStates.PLAYING;
                return current;
            });
            this.add_event_listeners();
            this.animate();
        } else if (state === store.GameStates.PAUSED) {
            this.unpause();
        } else if (state === store.GameStates.PLAYING) {
            // Ensure the XR-paced loop is running.
            this.animate();
        }
    }

    on_xr_session_end() {
        store.xr_presenting = false;
        store.scene.background = create_background();
        this.xr_input_handler.reset();

        for (const controller of store.xr_controllers) {
            store.scene.add(controller);
        }
        for (const grip of store.xr_controller_grips) {
            store.scene.add(grip);
        }
        exit_xr_camera_rig();

        if (store.gun) store.gun.visible = true;
        if (store.axe) store.axe.visible = true;
    }

    init_xr_controllers() {
        const controllerModelFactory = new XRControllerModelFactory();
        store.xr_controllers = [];
        store.xr_controller_grips = [];

        for (let i = 0; i < 2; i++) {
            const controller = store.renderer.xr.getController(i);
            controller.addEventListener('connected', (event) => {
                controller.userData.handedness = event.data?.handedness;
                controller.userData.targetRayMode = event.data?.targetRayMode;
                if (!controller.userData.ray) {
                    const geometry = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(0, 0, 0),
                        new THREE.Vector3(0, 0, -1),
                    ]);
                    const line = new THREE.Line(geometry);
                    line.scale.z = 5;
                    line.name = 'xr-ray';
                    controller.add(line);
                    controller.userData.ray = line;
                }
            });
            controller.addEventListener('disconnected', () => {
                const line = controller.userData.ray;
                if (line) {
                    controller.remove(line);
                    line.geometry?.dispose?.();
                    line.material?.dispose?.();
                    controller.userData.ray = null;
                }
            });
            store.scene.add(controller);
            store.xr_controllers.push(controller);

            const grip = store.renderer.xr.getControllerGrip(i);
            grip.add(controllerModelFactory.createControllerModel(grip));
            store.scene.add(grip);
            store.xr_controller_grips.push(grip);
        }
    }

    pause() {
        if (get(store.game_state).state !== store.GameStates.PLAYING) return;
        store.game_state.update(currentState => {
            currentState.state = store.GameStates.PAUSED;
            return currentState;
        });
        reset_pressed_keys();
        this.input_handler?.cancel_flask_charge?.();
        this.xr_input_handler?.reset?.();
        document.exitPointerLock();
        this.remove_event_listeners();
        this.add_pause_listener();
    }

    unpause() {
        if (get(store.game_state).state !== store.GameStates.PAUSED) return;
        store.game_state.update(currentState => {
            currentState.state = store.GameStates.PLAYING;
            return currentState;
        });
        this.remove_pause_listener();
        this.add_event_listeners();
        store.global_clock.getDelta();
        this.animate();
        if (!store.renderer?.xr?.isPresenting) {
            const canvas = document.getElementById('canvas-container')?.firstChild;
            canvas?.requestPointerLock?.({ unadjustedMovement: true });
        }
    }

    add_pause_listener() {
        this._on_pause_keydown = (e) => {
            if (pause_keys.includes(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
                this.unpause();
            }
        };
        document.addEventListener('keydown', this._on_pause_keydown);
    }

    remove_pause_listener() {
        if (this._on_pause_keydown) {
            document.removeEventListener('keydown', this._on_pause_keydown);
            this._on_pause_keydown = null;
        }
    }

    add_event_listeners(){
        this._on_mouse_move = this.input_handler.on_mouse_move.bind(this.input_handler);
        this._on_mouse_down = this.input_handler.on_mouse_down.bind(this.input_handler);
        this._on_mouse_up = this.input_handler.on_mouse_up.bind(this.input_handler);
        this._on_keydown = this.input_handler.on_keydown.bind(this.input_handler);
        this._on_keyup = this.input_handler.on_keyup.bind(this.input_handler);

        window.addEventListener('resize', resize_window, false);
        window.addEventListener('mousemove', this._on_mouse_move, false);
        window.addEventListener('mousedown', this._on_mouse_down, false);
        window.addEventListener('mouseup', this._on_mouse_up, false);
        window.addEventListener('keydown', this._on_keydown, true);
        window.addEventListener('keyup', this._on_keyup, true);

        if (!this.move_camera_updater_added) {
            store.global_updates_queue.push(new Updater(move_camera, {}));
            this.move_camera_updater_added = true;
        }

        this._on_gamepad_connected = (e) => {
            this.controller_input_handler.connect(e);
            if (!this.rotate_camera_updater_added) {
                store.global_updates_queue.push(new Updater(rotate_on_controller_move, {}));
                this.rotate_camera_updater_added = true;
            }
        };
        this._on_gamepad_disconnected = () => {
            this.controller_input_handler.disconnect();
        };
        window.addEventListener('gamepadconnected', this._on_gamepad_connected);
        window.addEventListener('gamepaddisconnected', this._on_gamepad_disconnected);
    }

    remove_event_listeners(){
        window.removeEventListener('resize', resize_window, false);
        window.removeEventListener('mousemove', this._on_mouse_move, false);
        window.removeEventListener('mousedown', this._on_mouse_down, false);
        window.removeEventListener('mouseup', this._on_mouse_up, false);
        window.removeEventListener('keydown', this._on_keydown, true);
        window.removeEventListener('keyup', this._on_keyup, true);

        window.removeEventListener('gamepadconnected', this._on_gamepad_connected);
        window.removeEventListener('gamepaddisconnected', this._on_gamepad_disconnected);
    }

    destroy() {
        this.remove_event_listeners();
        this.remove_pause_listener();
        store.renderer?.setAnimationLoop?.(null);
        if (store.renderer?.xr) {
            store.renderer.xr.removeEventListener('sessionstart', this._on_xr_session_start);
            store.renderer.xr.removeEventListener('sessionend', this._on_xr_session_end);
        }
        this.xr_input_handler?.reset?.();
        store.battle_scene = null;
        store.xr_presenting = false;
    }

    animate(){
        // setAnimationFrame is required for WebXR frame pacing; also works on desktop.
        store.renderer.setAnimationLoop(() => {
            let _game_state = get(store.game_state)
            if (_game_state['state'] === store.GameStates.GAMELOST || _game_state['state'] === store.GameStates.GAMEWON) {
                store.global_updates_queue = []
                store.renderer.setAnimationLoop(null);
                return;
            }
            if (_game_state['state'] === store.GameStates.PAUSED) {
                // Keep the XR session painted, but freeze simulation.
                if (store.renderer.xr.isPresenting) {
                    store.renderer.render(store.scene, store.camera);
                }
                return;
            }
            const time_delta = store.global_clock.getDelta();
            if (store.renderer.xr.isPresenting) {
                this.xr_input_handler.update(time_delta);
            } else if (this.controller_input_handler?.connected) {
                this.controller_input_handler.update();
            }
            store.stats.begin();
            let next_updates = []
            for (let i=0; i<store.global_updates_queue.length; i++) {
                let updater = store.global_updates_queue[i]
                updater.update(time_delta)
                if (!updater.state.finished) { 
                    next_updates.push(updater);
                } else {
                    updater.state.to_delete?.forEach(to_delete => {
                        to_delete.dispose()
                    });
                }
            }
            store.global_updates_queue = next_updates
            store.renderer.render(store.scene, store.camera);
            store.stats.end();
        });
    }

    
    game_lost(){
        store.player_score = 0;
        store.player_health.set(store.initial_player_health);
        store.current_element_counts.reset();
        initialize_vars()

        dispose_group(store.scene);
        dispose_renderer(store.renderer);
    }

    game_won(){
        dispose_group(store.scene);
        dispose_renderer(store.renderer);
    }
}

function create_renderer(){
    store.renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "high-performance",
        alpha: true, // needed for immersive-ar / passthrough clear
    });
    store.renderer.outputEncoding = THREE.sRGBEncoding;
    store.renderer.shadowMap.enabled = false;
    store.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    store.renderer.setSize(window.innerWidth, window.innerHeight);
    store.renderer.xr.enabled = true;
    store.renderer.xr.setReferenceSpaceType('local-floor');
}





function init_stats() {
    store.stats = new Stats();
    store.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild( store.stats.dom );
}

function create_directional_light(){
    const light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    light.position.set(-100, 100, 100);
    light.target.position.set(0, 0, 0);
    light.castShadow = false;
    // light.shadow.bias = -0.001;
    // light.shadow.mapSize.width = 4096;
    // light.shadow.mapSize.height = 4096;
    // light.shadow.camera.near = 0.1;
    // light.shadow.camera.far = 500.0;
    // light.shadow.camera.near = 0.5;
    // light.shadow.camera.far = 500.0;
    // light.shadow.camera.left = 50;
    // light.shadow.camera.right = -50;
    // light.shadow.camera.top = 50;
    // light.shadow.camera.bottom = -50;
    return light
}





// TODO: all of this enemy info should be in the objects.js file (and rename that file to be better)
const object_type_details = {
    'mine': {
        'probability': 1,
        'extra_z_distance': 0,
        'create_function': create_mine,
    },
    'cloud': {
        'probability': 2,
        'extra_z_distance': 200,
        'create_function': create_cloud,
    },
    'enemy': {
        'probability': get(store.game_state)['level'],
        'extra_z_distance': 0,
        'create_function': create_enemy,
    },
}
function get_random_type(include_enemies) {
    let object_probabilities = {}
    let entries = Object.entries(object_type_details)
    if (!include_enemies) {
        // the entry[0] is the key, and entry[1] is the val
        entries = entries.filter(entry => entry[0] !== 'enemy')
    }
    entries = entries.filter(entry => entry[0] !== 'lab')
    for (let i=0; i<entries.length; i++) {
        let [key, entry] = entries[i]
        object_probabilities[key] = entry['probability']
    }
    let object_type = get_random_from_probilities(object_probabilities)
    return object_type
}


function create_random_sphere_quaternion(min_radians = 0.5) {
    const axis = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
    ).normalize();
    const radians = Math.max(min_radians, Math.PI * Math.random());
    return new THREE.Quaternion().setFromAxisAngle(axis, radians);
}

function create_offset_quaternion(base_quaternion, max_spread_radians) {
    const offset_axis = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
    ).normalize();
    const offset_radians = Math.random() * max_spread_radians;
    const offset = new THREE.Quaternion().setFromAxisAngle(offset_axis, offset_radians);
    return base_quaternion.clone().multiply(offset);
}

function spawn_cluster_zones(total_count, include_enemies) {
    const scattered_count = Math.floor(total_count * SCATTERED_OBJECT_FRACTION);
    let zone_budget = total_count - scattered_count;

    while (zone_budget >= 3 && include_enemies) {
        const max_enemies = Math.min(10, zone_budget);
        let enemy_count = Math.floor(Math.random() * max_enemies) + 1;
        let spawned = false;

        while (enemy_count >= 1 && !spawned) {
            const mine_count = Math.max(1, Math.round(enemy_count * MINES_PER_ENEMY));
            const cloud_count = Math.max(1, Math.round(enemy_count * CLOUDS_PER_ENEMY));
            const zone_size = enemy_count + mine_count + cloud_count;

            if (zone_size <= zone_budget) {
                spawn_zone(enemy_count, mine_count, cloud_count);
                zone_budget -= zone_size;
                spawned = true;
            } else {
                enemy_count -= 1;
            }
        }

        if (!spawned) {
            break;
        }
    }

    for (let i = 0; i < scattered_count + zone_budget; i++) {
        initialize_in_random_position(get_random_type(false));
    }
}

function spawn_zone(enemy_count, mine_count, cloud_count) {
    const center_quaternion = create_random_sphere_quaternion();
    const zone = {
        center_quaternion,
        aggro_radius: ZONE_AGGRO_RADIUS,
        spread_radians: ZONE_SPREAD_RADIANS,
    };
    store.zones.push(zone);

    for (let i = 0; i < enemy_count; i++) {
        initialize_at_quaternion(
            'enemy',
            create_offset_quaternion(center_quaternion, zone.spread_radians),
            zone
        );
    }
    for (let i = 0; i < mine_count; i++) {
        initialize_at_quaternion(
            'mine',
            create_offset_quaternion(center_quaternion, zone.spread_radians)
        );
    }
    for (let i = 0; i < cloud_count; i++) {
        initialize_at_quaternion(
            'cloud',
            create_offset_quaternion(center_quaternion, zone.spread_radians)
        );
    }
}

function spawn_objects(count, include_enemies) {
    for (let i = 0; i < count; i++) {
        initialize_in_random_position(get_random_type(include_enemies));
    }
}

function continue_spawning_objects(count, every_x_seconds) {
    const helper = (state, time_delta) => {
        let {time_since_last_spawn} = state;
        time_since_last_spawn += time_delta;
        if (time_since_last_spawn > every_x_seconds) {
            time_since_last_spawn = 0;
            const include_enemies = false;
            spawn_objects(count, include_enemies)
        }
        return {finished: false, time_since_last_spawn}
    }
    store.global_updates_queue.push(new Updater(helper, {finished: false, time_since_last_spawn: 0}))
}

function initialize_in_random_position(type_of_obj) {
    initialize_at_quaternion(type_of_obj, create_random_sphere_quaternion());
}

function initialize_at_quaternion(type_of_obj, surface_quaternion, zone = null) {
    const type_details = object_type_details[type_of_obj]
    let obj = type_details['create_function']()
    obj.keepTextRotatedWithCamera()
    let parent = new THREE.Object3D();
    obj.add_to(parent)
    store.earth.add(parent)
    obj.position.set(0, 0, earth_radius + type_details['extra_z_distance'])
    parent.quaternion.copy(surface_quaternion);
    obj.initial_rotation();
    if (type_of_obj === 'enemy') {
        obj.zone = zone;
        obj.start_moving(earth_radius)
        store.enemies.push(obj)
    } else if (type_of_obj === 'mine') {
        store.mines.push(obj)
    } else if (type_of_obj === 'cloud') {
        store.clouds.push(obj)
    } else if (type_of_obj === 'lab') {
        store.labs.push(obj)
        add_energy_effect_updater(obj)
    } else {
        console.log(type_of_obj)
    }
    parent.updateMatrixWorld(true)
}


function create_background(){
    const loader = new THREE.CubeTextureLoader();
    loader.setPath( '/sky_box_background/' )
    const texture = loader.load([
        'px.png',
        'nx.png',
        'py.png',
        'ny.png',
        'pz.png',
        'nz.png'
    ]);
    texture.encoding = THREE.sRGBEncoding;
    return texture;
}

function resize_window() {
    store.camera.aspect = window.innerWidth / window.innerHeight;
    store.camera.updateProjectionMatrix();
    store.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    store.renderer.setSize(window.innerWidth, window.innerHeight);
}


function unique(arr, key_func) {
    const ret_arr = []
    const seen = new Set();
    arr.forEach((obj) => {
        let key = key_func(obj)
        if (!seen.has(key)) {
            seen.add(key);
            ret_arr.push(obj)
        }
    })
    return ret_arr;
}

var music = new Audio('https://chem-game.s3.amazonaws.com/sounds/05 Taurus.wav')
music.volume = .1
