import * as THREE from 'three';
import { get } from 'svelte/store';

import { Compound } from '../../compounds.js';
import { dispose_renderer, dispose_group } from '../../helper_functions.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CraigDragControls } from './craig_drag_controls.js';
import { CSVLoader } from '../../../public/lib/csv_molecule_loader.js';
import { store } from './store.js';


function initialize_vars(){
    store.draggable_objects = [];
    store.global_clock = new THREE.Clock();
    create_camera();
    store.mouse_ray = new THREE.Raycaster();
    store.mouse = new THREE.Vector2();
}

var moving_audio = new Audio('https://chem-game.s3.amazonaws.com/sounds/bloop.mp3');
var add_molecule_audio = new Audio('https://chem-game.s3.amazonaws.com/sounds/punchy-taps-ui-4-183899.mp3');

export class BalanceEquationScene {
    constructor() {
        store.element_counts.set(window.structuredClone(store.initial_element_counts))
        initialize_vars();
        store.game_state.update(state => {
            state['state'] = store.GameStates.STARTING;
            return state;
        });
        create_renderer();
        // this.orbit_controls = new OrbitControls( store.camera, renderer.domElement );

        store.scene = new THREE.Scene()
        store.scene.background = new THREE.Color(0xabcdef);

        this.directional_light = create_directional_light();
        store.scene.add(this.directional_light);
        this.ambient_light = new THREE.AmbientLight(0xFFFFFF, 0.5);
        store.scene.add(this.ambient_light);
    
        store.mouse_ray.setFromCamera( store.mouse, store.camera );

        store.renderer.render(store.scene, store.camera);
        spawn_initial_objects();
        this.drag_controls = new CraigDragControls(
            store.renderer,
            store.camera,
            on_mouse_down_callback,
            on_mouse_up_callback
        );
        this.animate();
    }

    // TODO: is this standard for every scene? Maybe this is a utility function
    animate(){
        requestAnimationFrame(()=>{
            if (get(store.game_state)['state'] === store.GameStates.GAMELOST) {
                store.global_updates_queue.set([])
                return;
            } else if (get(store.game_state)['state'] === store.GameStates.GAMEWON) {
                store.global_updates_queue.set([])
                return;
            }
            this.animate()
            time_delta = store.global_clock.getDelta();
            store.renderer.render(store.scene, store.camera);
            let next_updates = []
            // sometimes during iteration, another updater will be added to the queue, so we cant do a forEach
            // maybe we should pre-pend the new updaters to the beginning of the queue so they will process in the next frame
            let guq = get(store.global_updates_queue);
            for (let i=0; i<guq.length; i++) {
                let updater = guq[i]
                updater.update(time_delta)
                if (!updater.state.finished) { 
                    next_updates.push(updater);
                } else {
                    updater.state.to_delete?.forEach(to_delete => {
                        to_delete.dispose()
                    });
                }
            }
            store.global_updates_queue.set(next_updates)
        });
    }

    add_molecule_in_play(molecule_name, x, y) {
        add_molecule_audio.fastSeek(0)
        add_molecule_audio.play()
        let pos = screen_pos_to_world_pos(x, y)
        let molecule_group = create_molecule_group(molecule_name, pos);
        store.draggable_objects.update(
            (current_draggable_objs) => {
                current_draggable_objs.push(molecule_group);
                console.log(current_draggable_objs)
                return current_draggable_objs
            }
        );
    }
}

function csv_atoms_to_atom_counts(csv_atoms) {
    // csv_atoms are an array of {'coordinates': atom_or_bond.slice(0,3), 'element': atom_or_bond[3]};
    // but we just need to count the elements
    let atom_counts = {};
    // Note we start at index 1 because we skip the first row of the csv
    for (let i=1; i<csv_atoms.length; i++) {
        if (atom_counts[csv_atoms[i]['element']]) {
            atom_counts[csv_atoms[i]['element']] += 1;
        } else {
            atom_counts[csv_atoms[i]['element']] = 1;
        }
    }
    return atom_counts;
}

// TODO: we could cache this, or hardcode it
function update_element_counts(selected, add_or_subtract) {
    /*
    selected: the molecule group that will be clicked on
    add_or_subtract: either +1 to add, or -1 to subtract
    */
    let side = check_left_or_right(selected)
    let csv_atoms = cached_atoms_and_bonds[selected.name]['atoms']
    let atom_counts = csv_atoms_to_atom_counts(csv_atoms);
    let _element_counts = get(store.element_counts);
    for (let [element, count] of Object.entries(atom_counts)) {
        let current_count = _element_counts[side][element] ?  _element_counts[side][element] : 0;
        let new_count = current_count + (add_or_subtract * count);
        _element_counts[side][element] = new_count;
    }
    store.element_counts.set(_element_counts)
}

function on_mouse_down_callback(selected) {
    moving_audio.fastSeek(0)
    moving_audio.play()
    update_element_counts(selected, -1)
}

function on_mouse_up_callback(selected) {
    update_element_counts(selected, 1)
}

function create_renderer(){
    const canvas_container = document.getElementById('canvas-container');
    store.renderer = new THREE.WebGLRenderer({
        canvas: canvas_container.firstChild,
        antialias: false,
        powerPreference: "high-performance",
    });
    store.renderer.outputEncoding = THREE.sRGBEncoding;
    store.renderer.shadowMap.enabled = false;
    // store.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    store.renderer.setPixelRatio(window.devicePixelRatio);
    store.renderer.setSize(canvas_container.offsetWidth, canvas_container.offsetHeight);
}

function create_camera(){
    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 5000.0;
    store.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    store.camera.position.set(0, 0, 1000);
    store.camera.lookAt(0, 0, 0);
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

const cached_atoms_and_bonds = {}

function spawn_initial_objects(){
    const csv_loader = new CSVLoader();
    let pos;
    let _compounds_in_scene = get(store.compounds_in_scene);
    for (let side of [store.sides.LEFT, store.sides.RIGHT]) {
        for (let i=0; i<_compounds_in_scene[side].length; i++) {
            let compound = _compounds_in_scene[side][i];
            let path = `models/sdf/${compound.replace(' ', '_')}.sdf`;
            csv_loader.load( path, function ( csv ) {
                cached_atoms_and_bonds[compound] = {
                    'atoms': csv.atoms,
                    'bonds': csv.bonds,
                }
                let y = .1
                /* I want them to be put evenly between the range of .2 and .8. So if there
                is one, it will go to .5. If there are two, they will go to .4 and .6 etc.
                In the future I might do the math, but for now it is hardcoded */
                const x_positions = {
                    1: [.5],
                    2: [.4, .7],
                    3: [.3, .5, .7],
                }
                let x;
                if (side === store.sides.LEFT) {
                    let side_x_multiplier = -1;
                    // reversing so that the molecules appear over the correct buttons
                    let positions_reversed = x_positions[_compounds_in_scene[side].length].slice().reverse();
                    x = positions_reversed[i] * side_x_multiplier;
                } else {
                    let side_x_multiplier = 1;
                    x = x_positions[_compounds_in_scene[side].length][i] * side_x_multiplier;
                }
                
                pos = screen_pos_to_world_pos(x, y)
                let molecule_group = create_molecule_group(compound, pos);
                non_deletable_objs.update(current_non_deletable_objs => {
                    console.log(current_non_deletable_objs)
                    current_non_deletable_objs.push(molecule_group)
                    return current_non_deletable_objs
                })
            })
        }
    }
}

function create_molecule_group(molecule_name, position) {
    let atoms = cached_atoms_and_bonds[molecule_name]['atoms']
    let bonds = cached_atoms_and_bonds[molecule_name]['bonds']
    let molecule_group = new THREE.Group();
    molecule_group.name = molecule_name;
    new Compound(molecule_group, atoms, bonds);
    store.scene.add(molecule_group);
    molecule_group.position.set(position.x, position.y, position.z);
    update_element_counts(molecule_group, 1)
    return molecule_group;
}


export function end_scene(GameState){
    store.game_state.update(state => {
        state['state'] = GameState;
        return state;
    });
    dispose_group(store.scene);
    dispose_renderer(renderer);
}


function check_left_or_right(obj) {
    return obj.position.x < 0 ? store.sides.LEFT : store.sides.RIGHT;
}

function screen_pos_to_world_pos(x, y) {
    // x and y need to be between -1 and 1 (normalized device coordinates)
    // x goes from left to right -1 to 1, but y goes from bottom to top -1 to 1
    // this totally assumes that the camera is looking at 0, 0, 0 and that is the center of the scene
    let screen_pos = new THREE.Vector2(x, y);
    let ray_caster = new THREE.Raycaster();
    let plane = new THREE.Plane();
    ray_caster.setFromCamera( screen_pos, store.camera );
    const normal_towards_camera = new THREE.Vector3(0, 0, 1);
    let intersection_point = new THREE.Vector3();
    plane.set(normal_towards_camera, 0)
    ray_caster.ray.intersectPlane( plane, intersection_point );
    return intersection_point;
}
