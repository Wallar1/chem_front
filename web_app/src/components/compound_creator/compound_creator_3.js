import * as THREE from 'three';

import {TrackballControls} from 'three/examples/jsm/controls/TrackballControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CSVLoader } from '../../../public/lib/csv_molecule_loader.js';

import {get} from 'svelte/store';
import { creator_moves_remaining, game_state, GameStates } from '../../stores.js';
import { Compound } from '../../objects.js';
import { dispose_renderer, dispose_group } from '../../helper_functions.js';


let camera, scene, renderer, labelRenderer;
let controls;

let root;

const MOLECULE_PATHS = {
    'Aspirin': 'aspirin.sdf',
    'Ethyne(Acetylene)': 'ethyne.sdf',
};

let current_molecule = 'Aspirin'

var mouse_ray = new THREE.Raycaster();
var mouse = new THREE.Vector2();


const csv_loader = new CSVLoader();

// one problem is when you do "get" it isnt reactive. You just get the value at that time. If the value changes, you need to get it again
// const atom_info = get(atoms);
// const creator_moves_remaining_count = get(creator_moves_remaining);
// const selected_atom_ = get(selected_atom);


export class CompoundCreator {
    constructor() {
        init();
        animate();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    labelRenderer.setSize( window.innerWidth, window.innerHeight );
}

var is_rotating = false;
function start_rotation() {is_rotating = true}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render( scene, camera );
    if (is_rotating) {
        root.rotation.y = root.rotation.y + .01;
    }
}

function init() {
    game_state.update(state => {
        state['state'] = GameStates.STARTING;
        return state;
    });

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x5d879c );

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 5000 );
    camera.position.z = 500;
    scene.add( camera );

    scene.add( new THREE.AmbientLight( 0x515151, 3 ) );

    root = new THREE.Group();
    scene.add( root );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.getElementById( 'canvas-container' ).appendChild( renderer.domElement );

    // TODO: what is this doing
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize( window.innerWidth, window.innerHeight );
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.getElementById( 'canvas-container' ).appendChild( labelRenderer.domElement );

    controls = new TrackballControls( camera, renderer.domElement );
    controls.minDistance = 100;
    controls.maxDistance = 1000;

    loadMolecule( MOLECULE_PATHS[current_molecule] );

    add_event_listeners()

    mouse_ray.setFromCamera( mouse, camera );

    is_rotating = false;
}

function add_event_listeners() {
    window.addEventListener('resize', onWindowResize, false );
    window.addEventListener('click', on_mouse_click, false)
    window.addEventListener('mousemove', on_mouse_move, false)
}

function remove_event_listeners() {
    window.removeEventListener('resize', onWindowResize, false);
    window.removeEventListener('mousemove', on_mouse_move, false)
    window.removeEventListener('click', on_mouse_click, false)
}


function on_mouse_move(event){
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    mouse_ray.setFromCamera( mouse, camera );
}

function recursively_get_all_scene_objects() {
    const all_scene_objects = [];
    get_scene_objects_helper(scene, all_scene_objects)
    return all_scene_objects
}

function get_scene_objects_helper(root, current_object_list) {
    if (root instanceof THREE.Mesh) {
        current_object_list.push(root)
    }
    if (root.children.length) {
        for (let c=0; c<root.children.length; c++) {
            let child = root.children[c]
            get_scene_objects_helper(child, current_object_list)
        }
    }
}

function findObjectByUUID(scene, uuid) {
    let desiredObject = null;
    scene.traverse(function(object) {
        if (object.uuid === uuid) {
            desiredObject = object;
        }
    });
    return desiredObject;
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

function on_mouse_click(event) {
    // this next line helps debug. Previously we were getting different positions because the renderer was expecting
    // a larger size (it looks for the window size) but we had another div pushing the threejs window down and smaller
    // scene.add(new THREE.ArrowHelper(mouse_ray.ray.direction, mouse_ray.ray.origin, 300, 0xff0000) );
    let all_scene_objects = recursively_get_all_scene_objects()
    // let intersects = unique(mouse_ray.intersectObjects( all_scene_objects, false ), (o) => o.object.uuid);
    let intersects = mouse_ray.intersectObjects( all_scene_objects, false );
    let intersects_with_click = intersects.filter(intersect => intersect.object.onclick) || [];
    if (intersects_with_click.length) {
        let moves_remaining = get(creator_moves_remaining) - 1
        creator_moves_remaining.set(moves_remaining)
        if (moves_remaining <= 0) {
            lose_game()
        }
        intersects_with_click[0].object.onclick()
        let all_atoms = root.children.filter(obj => obj.is_atom === true)
        let correct_atoms = all_atoms.filter(atom => atom.correct_material)
        if (all_atoms.length === correct_atoms.length) {
            win_game()
        }
    }

    // intersects_with_click.forEach(intersect => {
    //     console.log(intersect)
    //     intersect.object.onclick()
    // })
}

function loadMolecule( model ) {
    const url = 'models/sdf/' + model;

    while ( root.children.length > 0 ) {
        const object = root.children[ 0 ];
        object.parent.remove( object );
    }

    csv_loader.load( url, function ( csv ) {
        let csv_atoms = csv.atoms
        let csv_bonds = csv.bonds
        let errors_allowed = Math.ceil(csv_atoms.length / 4)
        creator_moves_remaining.set(csv_atoms.length + errors_allowed)

        const use_normal = true;
        const show_label = false;

        new Compound(root, csv_atoms, csv_bonds, use_normal, show_label);

        animate();

    } );

}

function win_game() {
    game_state.update(state => {
        state['state'] = GameStates.GAMEWON;
        return state;
    });

    // TODO: should we do this with an updater?
    start_rotation()
}

function lose_game() {
    game_state.update(state => {
        state['state'] = GameStates.GAMELOST;
        return state;
    });
}

export function dispose() {
    dispose_group(scene);
    dispose_renderer(renderer);
    remove_event_listeners()
}
