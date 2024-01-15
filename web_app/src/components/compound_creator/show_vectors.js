import * as THREE from 'three';
import {TrackballControls} from 'three/examples/jsm/controls/TrackballControls';

let camera, scene, renderer, controls, root;

export class CompoundCreator {
    constructor() {
        init();
        animate();
    }
}

function init() {
    // 1. Set Up the Basic Scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 5;

    // 2. Add Axes Helper (size 5)
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);


    // Define the start and end points of the vector
    const start = new THREE.Vector3(0, 0, 0); // Start at origin

    const tmpVec1 = new THREE.Vector3(5,5,5);
    const unit_vec = new THREE.Vector3(0, 0, 1);

    const axis = unit_vec.cross(tmpVec1);
    const radians = Math.acos(unit_vec.dot(tmpVec1.normalize()));
    console.log(radians, tmpVec1)


    // Create the geometry and line
    const vec1_material = new THREE.LineBasicMaterial({ color: 0xffffff }); // White color
    const vec1_geometry = new THREE.BufferGeometry().setFromPoints([start, tmpVec1]);
    const vec1_line = new THREE.Line(vec1_geometry, vec1_material);
    scene.add(vec1_line);

    const axis_material = new THREE.LineBasicMaterial({ color: 0x34cfeb });
    const axis_geometry = new THREE.BufferGeometry().setFromPoints([start, axis]);
    const axis_line = new THREE.Line(axis_geometry, axis_material);
    scene.add(axis_line);

    




    // 4. Set Camera Position and Render the Scene
    camera.position.set(5, 5, 5);
    camera.lookAt(scene.position);
}

// tmpVec1.subVectors( end, start );
// const axis = tmpVec2.set( 0, 1, 0 ).cross( tmpVec1 );
// const radians = Math.acos( tmpVec3.set( 0, 1, 0 ).dot( tmpVec4.copy( tmpVec1 ).normalize() ) );
// const objMatrix = new THREE.Matrix4().makeRotationAxis( axis.normalize(), radians );





// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}