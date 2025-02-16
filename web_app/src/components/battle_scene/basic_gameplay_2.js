import * as THREE from 'three';
import { get } from 'svelte/store';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import * as AmmoLib from '../lib/ammo.js';
import { Updater } from './objects.js';
import { create_mine, create_cloud } from './mines_and_clouds.js';
import { inialize_axe } from './axe.js';
import { create_lab, add_energy_effect_updater } from './lab.js';
import { create_enemy } from './enemies.js';
import { ContollerInputHandler, init_pushed_buttons } from './input_handler_for_controllers.js';
import { store } from './store.js';
import { earth_radius, initial_object_count, include_enemies, count_to_spawn, seconds_between_spawns } from './constants.js';
import { create_earth } from './earth.js';
import { create_camera, move_camera, rotate_on_controller_move } from './camera.js';
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




function initialize_vars(){
    store.global_clock = new THREE.Clock();
    store.mouse_ray = new THREE.Raycaster();
    store.mouse = new THREE.Vector2();
    store.enemies = [];
    store.clouds = [];
    store.mines = [];
    store.labs = [];
    store.lab_effects = {'nuclear': 0, 'electrical': 0, 'kinetic': 0, 'thermal': 0, 'chemical': 0, 'sound': 0};
    store.current_direction_vector = new THREE.Vector3(0, 0, 0);
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
        init_pushed_buttons();
        
        const canvas_container = document.getElementById('canvas-container')
        canvas_container.appendChild(store.renderer.domElement);

        store.scene = new THREE.Scene()

        // this.orbit_controls = new OrbitControls( store.camera, store.renderer.domElement );

        store.scene.add(create_directional_light());
        store.scene.add(new THREE.AmbientLight(0xFFFFFF, 0.25));

        store.scene.background = create_background();
        store.scene.add(store.earth);
    
        store.mouse_ray.setFromCamera( store.mouse, store.camera );

        store.renderer.render(store.scene, store.camera);

        spawn_objects(initial_object_count, include_enemies)
        continue_spawning_objects(count_to_spawn, seconds_between_spawns)

        music.play();

        // this.input_handler = new InputHandler();
        this.controller_input_handler = new ContollerInputHandler();
    }

    add_event_listeners(){
        // window.addEventListener('resize', resize_window, false);
        // window.addEventListener('mousemove', this.input_handler.on_mouse_move, false)
        // window.addEventListener('click', this.input_handler.on_mouse_click, false)
        // window.addEventListener('keydown', this.input_handler.on_keydown)
        // document.addEventListener('keyup', this.input_handler.on_keyup)

        window.addEventListener("gamepadconnected", (e) => {
            console.log(e)
            console.log(
                e.gamepad.index,
                e.gamepad.id,
                e.gamepad.buttons,
                e.gamepad.axes,
            );
            this.controller_input_handler.connect(e);
            let move_camera_updater = new Updater(move_camera, {})
            store.global_updates_queue.push(move_camera_updater)
            let rotate_camera_updater = new Updater(rotate_on_controller_move, {})
            store.global_updates_queue.push(rotate_camera_updater);
        });
    }

    remove_event_listeners(){
        // window.removeEventListener('resize', resize_window, false);
        // window.removeEventListener('mousemove', this.input_handler.on_mouse_move, false)
        // window.removeEventListener('click', this.input_handler.on_mouse_click, false)
        // window.removeEventListener('keydown', this.input_handler.on_keydown)
        // document.removeEventListener('keyup', this.input_handler.on_keyup)


        window.addEventListener("gamepaddisconnected", (e) => {
            console.log(
                "Gamepad disconnected from index %d: %s",
                e.gamepad.index,
                e.gamepad.id,
            );
        });
    }

    animate(){
        requestAnimationFrame(()=>{
            let _game_state = get(store.game_state)
            if (_game_state['state'] === store.GameStates.GAMELOST || _game_state['state'] === store.GameStates.GAMEWON) {
                store.global_updates_queue = []
                return;
            }
            if (this.controller_input_handler?.connected) {
                this.controller_input_handler.update();
            }
            this.animate()
            store.stats.begin();
            const time_delta = store.global_clock.getDelta();
            store.renderer.render(store.scene, store.camera);
            let next_updates = []
            // TODO: should there be a way of searching through the global updates queue and deleting effects if they get overridden?
            // sometimes during iteration, another updater will be added to the queue, so we cant do a forEach
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
            store.stats.end();
            store.global_updates_queue = next_updates
        });
    }

    
    game_lost(){
        player_score = 0;
        player_health = initial_player_health;
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
    });
    store.renderer.outputEncoding = THREE.sRGBEncoding;
    store.renderer.shadowMap.enabled = false;
    // store.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    store.renderer.setPixelRatio(window.devicePixelRatio);
    store.renderer.setSize(window.innerWidth, window.innerHeight);
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
    'lab': {
        'probability': 1,
        'extra_z_distance': 40,
        'create_function': create_lab,
    }
}
function get_random_type(include_enemies) {
    let object_probabilities = {}
    let entries = Object.entries(object_type_details)
    if (!include_enemies) {
        // the entry[0] is the key, and entry[1] is the val
        entries = entries.filter(entry => entry[0] !== 'enemy')
    }
    for (let i=0; i<entries.length; i++) {
        let [key, entry] = entries[i]
        object_probabilities[key] = entry['probability']
    }
    let object_type = get_random_from_probilities(object_probabilities)
    return object_type
}


function spawn_objects(count, include_enemies) {
    for (let i=0; i<count; i++) {
        initialize_in_random_position(get_random_type(include_enemies))
        // initialize_in_random_position(object_type_details['mine'])
    }
    // initialize_in_random_position('cloud')
    // initialize_in_random_position('mine')
    // initialize_in_random_position('enemy')
    // initialize_in_random_position('lab')
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
    const type_details = object_type_details[type_of_obj]
    let obj = type_details['create_function']()
    obj.keepTextRotatedWithCamera()
    let parent = new THREE.Object3D();
    obj.add_to(parent)
    store.earth.add(parent)
    obj.position.set(0, 0, earth_radius + type_details['extra_z_distance'])
    // let random_rotation_axis = new THREE.Vector3(1,0,0)
    // let radians = 0;
    let random_rotation_axis = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize()
    let radians = Math.max(0.5, Math.PI * Math.random());
    let quaternion = new THREE.Quaternion().setFromAxisAngle(random_rotation_axis, radians)
    parent.quaternion.multiply(quaternion);
    obj.initial_rotation();
    if (type_of_obj === 'enemy') {
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
