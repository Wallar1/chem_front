import * as THREE from 'three';
import { get } from 'svelte/store';

import { Compound } from '../../objects.js';
import { game_state, GameStates, global_updates_queue, element_counts, initial_element_counts, sides, compounds_in_scene } from '../../stores.js';
import { dispose_renderer, dispose_group } from '../../helper_functions.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CraigDragControls } from '../../craig_drag_controls.js';
import { CSVLoader } from '../../../public/lib/csv_molecule_loader.js';

var global_clock,
    time_delta,
    scene,
    renderer,
    camera,
    mouse_ray,
    mouse,
    draggable_objects;


function initialize_vars(){
    draggable_objects = [];
    global_clock = new THREE.Clock();
    create_camera();
    mouse_ray = new THREE.Raycaster();
    mouse = new THREE.Vector2();
}

export class BalanceEquationScene {
    constructor() {
        element_counts.set(window.structuredClone(initial_element_counts))
        initialize_vars();
        renderer = create_renderer();
        // this.orbit_controls = new OrbitControls( camera, renderer.domElement );

        scene = new THREE.Scene()
        scene.background = new THREE.Color(0xabcdef);

        this.directional_light = create_directional_light();
        scene.add(this.directional_light);
        this.ambient_light = new THREE.AmbientLight(0xFFFFFF, 0.5);
        scene.add(this.ambient_light);
    
        mouse_ray.setFromCamera( mouse, camera );

        renderer.render(scene, camera);
        spawn_initial_objects();
        this.drag_controls = new CraigDragControls(
            renderer, camera, draggable_objects, on_mouse_down_callback, on_mouse_up_callback
        );
        this.animate();
    }

    // TODO: is this standard for every scene? Maybe this is a utility function
    animate(){
        requestAnimationFrame(()=>{
            if (get(game_state)['state'] === GameStates.GAMELOST) {
                global_updates_queue.set([])
                return;
            } else if (get(game_state)['state'] === GameStates.GAMEWON) {
                global_updates_queue.set([])
                return;
            }
            this.animate()
            time_delta = global_clock.getDelta();
            renderer.render(scene, camera);
            let next_updates = []
            // sometimes during iteration, another updater will be added to the queue, so we cant do a forEach
            // maybe we should pre-pend the new updaters to the beginning of the queue so they will process in the next frame
            let guq = get(global_updates_queue);
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
            global_updates_queue.set(next_updates)
        });
    }

    add_molecule_in_play(molecule_name, x, y) {
        let pos = screen_pos_to_world_pos(x, y)
        create_molecule_group(molecule_name, pos);
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
    let _element_counts = get(element_counts);
    for (let [element, count] of Object.entries(atom_counts)) {
        let current_count = _element_counts[side][element] ?  _element_counts[side][element] : 0;
        let new_count = current_count + (add_or_subtract * count);
        _element_counts[side][element] = new_count;
    }
    element_counts.set(_element_counts)
}

function on_mouse_down_callback(selected) {
    update_element_counts(selected, -1)
}

function on_mouse_up_callback(selected) {
    update_element_counts(selected, 1)
}

function create_renderer(){
    const canvas_container = document.getElementById('canvas-container');
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas_container.firstChild,
        antialias: false,
        powerPreference: "high-performance",
    });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = false;
    // renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas_container.offsetWidth, canvas_container.offsetHeight);
    return renderer
}

function create_camera(){
    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 5000.0;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 0, 1000);
    camera.lookAt(0, 0, 0);
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
    let _compounds_in_scene = get(compounds_in_scene);
    for (let side of [sides.LEFT, sides.RIGHT]) {
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
                if (side === sides.LEFT) {
                    let side_x_multiplier = -1;
                    // reversing so that the molecules appear over the correct buttons
                    let positions_reversed = x_positions[_compounds_in_scene[side].length].slice().reverse();
                    x = positions_reversed[i] * side_x_multiplier;
                } else {
                    let side_x_multiplier = 1;
                    x = x_positions[_compounds_in_scene[side].length][i] * side_x_multiplier;
                }
                
                pos = screen_pos_to_world_pos(x, y)
                create_molecule_group(compound, pos);
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
    draggable_objects.push(molecule_group);
    scene.add(molecule_group);
    molecule_group.position.set(position.x, position.y, position.z);
    update_element_counts(molecule_group, 1)
}


export function end_scene(){
    dispose_group(scene);
    dispose_renderer(renderer);
}


function check_left_or_right(obj) {
    return obj.position.x < 0 ? sides.LEFT : sides.RIGHT;
}

function screen_pos_to_world_pos(x, y) {
    // x and y need to be between -1 and 1 (normalized device coordinates)
    // x goes from left to right -1 to 1, but y goes from bottom to top -1 to 1
    // this totally assumes that the camera is looking at 0, 0, 0 and that is the center of the scene
    let screen_pos = new THREE.Vector2(x, y);
    let ray_caster = new THREE.Raycaster();
    let plane = new THREE.Plane();
    ray_caster.setFromCamera( screen_pos, camera );
    const normal_towards_camera = new THREE.Vector3(0, 0, 1);
    let intersection_point = new THREE.Vector3();
    plane.set(normal_towards_camera, 0)
    ray_caster.ray.intersectPlane( plane, intersection_point );
    return intersection_point;
}
