import * as THREE from 'three';

import {TrackballControls} from 'three/examples/jsm/controls/TrackballControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CSVLoader } from '../../../public/lib/csv_molecule_loader.js';

import {get} from 'svelte/store';
import { atoms, creator_moves_remaining, selected_atom } from '../../stores.js';


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
const SPACING = 75;
const ATOM_SIZE = 25;

const normalMaterial = new THREE.MeshNormalMaterial();

let errors_allowed = 5;

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
    animate()
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render( scene, camera );
}

function init() {

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
    window.addEventListener( 'resize', onWindowResize );
    window.addEventListener('click', (event) => on_mouse_click(event), false)
    window.addEventListener('mousemove', (event) => on_mouse_move(event), false)
    mouse_ray.setFromCamera( mouse, camera );
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
        creator_moves_remaining.set(get(creator_moves_remaining) - 1)
        intersects_with_click[0].object.onclick()
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
        creator_moves_remaining.set(csv_atoms.length + errors_allowed)

        const bondGeometry = new THREE.BoxGeometry( 1, 1, 1 );
        const atomGeometry = new THREE.IcosahedronGeometry( 1, 3 );
        const materials = {}
        for (let i = 1; i < csv_atoms.length; i++) {
            const csv_atom = csv_atoms[i];
            const element = csv_atom.element.toLowerCase()
            if (!materials[element]) {
                let color_info = get(atoms)[element.toUpperCase()]['color']
                let color = new THREE.Color(`rgb(${color_info[0]}, ${color_info[1]}, ${color_info[2]})`);
                materials[element] = new THREE.MeshToonMaterial( { color: color } );
            }
            const atom_obj = new THREE.Mesh( atomGeometry, normalMaterial );
            atom_obj.position.set( ...csv_atom.coordinates );
            atom_obj.position.multiplyScalar(SPACING);
            atom_obj.scale.set( ATOM_SIZE, ATOM_SIZE, ATOM_SIZE );
            atom_obj.onclick = () => {
                if (element === get(selected_atom).toLowerCase()) {
                    atom_obj.material = materials[element];
                }
            }
            root.add( atom_obj );
        }
        const start = new THREE.Vector3();
        const end = new THREE.Vector3();
        const bondMaterial = new THREE.MeshToonMaterial( { color: 0xffffff } );
        for (let i = 0; i < csv_bonds.length; i++) {
            const csv_bond = csv_bonds[i];
            start.set(...csv_atoms[csv_bond.atoms[0]].coordinates);
            start.multiplyScalar(SPACING);
            end.set(...csv_atoms[csv_bond.atoms[1]].coordinates);
            end.multiplyScalar(SPACING)
            const parent_object = new THREE.Object3D();
            parent_object.position.copy( start );
            parent_object.position.lerp( end, 0.5 );
            parent_object.scale.set( 5, 5, start.distanceTo( end ) );
            parent_object.lookAt( end );
            parent_object.scale.set( 5, 5, start.distanceTo( end ) );
            root.add( parent_object );
            if (csv_bond.count === 1) {
                const object = new THREE.Mesh( bondGeometry, bondMaterial );
                parent_object.add( object );
            } else if (csv_bond.count === 2) {
                const object = new THREE.Mesh( bondGeometry, bondMaterial );
                object.position.y = 1;
                parent_object.add( object );
                const object2 = new THREE.Mesh( bondGeometry, bondMaterial );
                object2.position.y = -1;
                parent_object.add( object2 );
            } else if (csv_bond.count === 3) {
                const object = new THREE.Mesh( bondGeometry, bondMaterial );
                object.position.y = 2;
                parent_object.add( object );
                const object2 = new THREE.Mesh( bondGeometry, bondMaterial );
                parent_object.add( object2 );
                const object3 = new THREE.Mesh( bondGeometry, bondMaterial );
                object3.position.y = -2;
                parent_object.add( object3 );
            } else {
                throw new Error('Too many bonds!');
            }
        }

        // geometryAtoms.computeBoundingBox();
        // geometryAtoms.boundingBox.getCenter( offset ).negate();

        // geometryAtoms.translate( offset.x, offset.y, offset.z );
        // geometryBonds.translate( offset.x, offset.y, offset.z );

        // let positions = geometryAtoms.getAttribute( 'position' );
        // const colors = geometryAtoms.getAttribute( 'color' );

        // const position = new THREE.Vector3();
        // const color = new THREE.Color();

        // for ( let i = 0; i < positions.count; i ++ ) {

        //     position.x = positions.getX( i );
        //     position.y = positions.getY( i );
        //     position.z = positions.getZ( i );

        //     color.r = colors.getX( i );
        //     color.g = colors.getY( i );
        //     color.b = colors.getZ( i );

        //     const material = new THREE.MeshPhongMaterial( { color: color } );

        //     const object = new THREE.Mesh( sphereGeometry, material );
        //     object.position.copy( position );
        //     object.position.multiplyScalar( 75 );
        //     object.scale.multiplyScalar( 25 );
        //     root.add( object );

        //     const atom = json.atoms[ i ];

        //     const text = document.createElement( 'div' );
        //     text.className = 'label';
        //     text.style.color = 'rgb(' + atom[ 3 ][ 0 ] + ',' + atom[ 3 ][ 1 ] + ',' + atom[ 3 ][ 2 ] + ')';
        //     text.textContent = atom[ 4 ];

        //     const label = new CSS2DObject( text );
        //     label.position.copy( object.position );
        //     root.add( label );

        // }

        // positions = geometryBonds.getAttribute( 'position' );

        // const start = new THREE.Vector3();
        // const end = new THREE.Vector3();

        // for ( let i = 0; i < positions.count; i += 2 ) {

        //     start.x = positions.getX( i );
        //     start.y = positions.getY( i );
        //     start.z = positions.getZ( i );

        //     end.x = positions.getX( i + 1 );
        //     end.y = positions.getY( i + 1 );
        //     end.z = positions.getZ( i + 1 );

        //     start.multiplyScalar( 75 );
        //     end.multiplyScalar( 75 );

        //     const object = new THREE.Mesh( boxGeometry, new THREE.MeshPhongMaterial( { color: 0xffffff } ) );
        //     object.position.copy( start );
        //     object.position.lerp( end, 0.5 );
        //     object.scale.set( 5, 5, start.distanceTo( end ) );
        //     object.lookAt( end );
        //     root.add( object );

        // }

        animate();

    } );

}