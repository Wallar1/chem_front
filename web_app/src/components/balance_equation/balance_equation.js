import * as THREE from 'three';
import { get } from 'svelte/store';

import {Compound, Updater, add_to_global_updates_queue} from '../../objects.js';
import { game_state, GameStates, global_updates_queue, reactant_counts, balance_rotations, sides } from '../../stores.js';
import { dispose_renderer, dispose_scene, get_font_text_mesh } from '../../helper_functions.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CraigDragControls } from '../../craig_drag_controls.js';
import { CSVLoader } from '../../../public/lib/csv_molecule_loader.js';

var global_clock,
    time_delta,
    scene,
    renderer,
    camera,
    mouse_ray,
    mouse;
var draggable_objects = [];


function initialize_vars(){
    global_clock = new THREE.Clock();
    create_camera();
    mouse_ray = new THREE.Raycaster();
    mouse = new THREE.Vector2();
}

export class BalanceEquationScene {
    constructor() {
        initialize_vars();
        renderer = create_renderer();
        // this.orbit_controls = new OrbitControls( camera, renderer.domElement );
        const canvas_container = document.getElementById('canvas-container')
        canvas_container.appendChild(renderer.domElement);

        scene = new THREE.Scene()
        scene.background = new THREE.Color(0xabcdef);

        this.directional_light = create_directional_light();
        scene.add(this.directional_light);
        this.ambient_light = new THREE.AmbientLight(0xFFFFFF, 0.5);
        scene.add(this.ambient_light);
    
        mouse_ray.setFromCamera( mouse, camera );

        renderer.render(scene, camera);
        spawn_initial_objects();
        let craig_drag_controls = new CraigDragControls(
            renderer, camera, draggable_objects, on_mouse_down_callback, on_mouse_up_callback
        );
        this.animate();
    }

    // TODO: is this standard for every scene? Maybe this is a utility function
    animate(){
        requestAnimationFrame(()=>{
            if (get(game_state)['state'] === GameStates.GAMEOVER) {
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
function update_reactant_counts(selected, add_or_subtract) {
    /*
    selected: the molecule group that will be clicked on
    add_or_subtract: either +1 to add, or -1 to subtract
    */
    let side = check_left_or_right(selected)
    let csv_atoms = cached_atoms_and_bonds[selected.name]['atoms']
    let atom_counts = csv_atoms_to_atom_counts(csv_atoms);
    let _reactant_counts = get(reactant_counts);
    for (let [element, count] of Object.entries(atom_counts)) {
        let current_count = _reactant_counts[side][element] ?  _reactant_counts[side][element] : 0;
        let new_count = current_count + (add_or_subtract * count);
        _reactant_counts[side][element] = new_count;
    }
    reactant_counts.set(_reactant_counts)
}

function on_mouse_down_callback(selected) {
    update_reactant_counts(selected, -1)
}

function on_mouse_up_callback(selected) {
    update_reactant_counts(selected, 1)
}

function create_renderer(){
    const renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "high-performance",
    });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = false;
    // renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
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



const atom_material = new THREE.MeshStandardMaterial({color: 0xffffff,});
const atom_geometry = new THREE.SphereGeometry( 50, 20, 20 );
const atom_text_position = new THREE.Vector3(-10, -80, 0)

const cached_atoms_and_bonds = {}

function spawn_initial_objects(){
    const csv_loader = new CSVLoader();
    let rand_pos;
    let carbon_dioxide_path = 'models/sdf/carbon_dioxide.sdf';
    csv_loader.load( carbon_dioxide_path, function ( csv ) {
        let compound = 'carbon_dioxide'
        cached_atoms_and_bonds[compound] = {
            'atoms': csv.atoms,
            'bonds': csv.bonds,
        }
        // one in play
        rand_pos = new THREE.Vector3(100*5, 0, 0);
        create_molecule_group(compound, rand_pos);
        // one below to add to the scene
        rand_pos = new THREE.Vector3(100*5, -500, 0);
        create_molecule_group(compound, rand_pos);
    })

    let ethane_path = 'models/sdf/ethane.sdf';
    csv_loader.load( ethane_path, function ( csv ) {
        let compound = 'ethane'
        cached_atoms_and_bonds[compound] = {
            'atoms': csv.atoms,
            'bonds': csv.bonds,
        }
        // one starts off in play
        rand_pos = new THREE.Vector3(100, 0, 0);
        create_molecule_group(compound, rand_pos);
        // one you can add to the scene
        rand_pos = new THREE.Vector3(100, -500, 0);
        create_molecule_group(compound, rand_pos);
        console.log(cached_atoms_and_bonds)
    })
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
    update_reactant_counts(molecule_group, 1)
}


function end_scene(){
    dispose_scene();
    dispose_renderer();
}


function check_left_or_right(obj) {
    return obj.position.x < 0 ? sides.LEFT : sides.RIGHT;
}
