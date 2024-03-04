import * as THREE from 'three';
import { get } from 'svelte/store';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import * as AmmoLib from '../lib/ammo.js';
import {create_enemy, create_mine, create_cloud} from '../../objects.js';
import {create_compound} from '../../compounds.js';
import { key_to_compound, current_element_counts } from '../../stores.js';
import { parse_formula_to_dict, get_random_element } from '../../helper_functions.js';

import { Stats } from '../../../public/lib/stats.js'


// Tutorial for collision detection:
// https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection/Bounding_volume_collision_detection_with_THREE.js


// Tips for speeding up:
//https://attackingpixels.com/tips-tricks-optimizing-three-js-performance/
// also his 3d portfolio tutorial
// https://attackingpixels.com/three-js-timeline-career-3D-portfolio/


class Updater {
    constructor(step_function, state) {
        /*
        The idea is that an updater will run the step function every frame until some condition is met. It runs the
        function, which updates the state, which includes a variable 'finished'. Every time the game loop goes through
        the updates_queue, it will make a new queue at the end that only includes updaters that arent finished.
        */
        this.step_function = step_function;
        this.state = state;
    }

    update(time_delta){
        this.state = this.step_function(this.state, time_delta);
    }
}



// TODO: this should be part of the global state, and then we can break out the movement code into another file
var global_updates_queue = [];
var global_clock = new THREE.Clock();
// Earth settings
var earth_radius = 3000;
var camera_offset = 50;
var speed = .2;
var time_for_full_rotation = 30/speed;
var earth_initial_position = new THREE.Vector3(0,0,0)

var time_delta = 0
var gravity = new THREE.Vector3(0, -.5, 0);
var frame_rate = 60;
var world_units_scale = 1/frame_rate  // used to adjust the speed of things, because moving an obj 10 units is super fast/far 
var scene = new THREE.Scene()
var earth = create_earth();
var camera, camera_parent;  // camera_parent is used to rotate the camera around the earth
create_camera();

var mouse_ray = new THREE.Raycaster();
var mouse = new THREE.Vector2();


var collision_elements = [];  // we just have to keep track of the enemies and earth, and when the ball moves,
                            // it checks for any collisions with these elements


var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

export class BattleScene {
    constructor() {
        this.renderer = create_renderer();
        const canvas_container = document.getElementById('canvas-container')
        canvas_container.appendChild(this.renderer.domElement);

        // this.orbit_controls = new OrbitControls( camera, this.renderer.domElement );

        this.directional_light = create_directional_light();
        scene.add(this.directional_light);
        this.ambient_light = new THREE.AmbientLight(0xFFFFFF, 0.25);
        scene.add(this.ambient_light);

        scene.background = create_background();
        scene.add(earth);
    
        mouse_ray.setFromCamera( mouse, camera );

        this.renderer.render(scene, camera);

        spawn_objects()
    }

    add_event_listeners(){
        window.addEventListener('resize', () => this.resize_window(), false);
        window.addEventListener('mousemove', (event) => on_mouse_move(event), false)
        window.addEventListener('click', (event) => on_mouse_click(event), false)
        window.addEventListener('keydown', (e) => handle_keydown(e))
        document.addEventListener('keyup', (e) => handle_keyup(e))
    }

    animate(){
        requestAnimationFrame(()=>{
            this.animate()
            stats.begin();
            time_delta = global_clock.getDelta();
            this.renderer.render(scene, camera);
            let next_updates = []
            // sometimes during iteration, another updater will be added to the queue, so we cant do a forEach
            for (let i=0; i<global_updates_queue.length; i++) {
                let updater = global_updates_queue[i]
                updater.update(time_delta)
                if (!updater.state.finished) { 
                    next_updates.push(updater);
                } else {
                    updater.state.to_delete?.forEach(to_delete => {
                        to_delete.dispose()
                    });
                }
            }
            stats.end();
            global_updates_queue = next_updates
        });
    }

    resize_window() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
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

    camera_parent = new THREE.Object3D();
    earth.add(camera_parent);
    camera_parent.position.set(0, 0, 0);
    camera_parent.add(camera);
    camera.position.set(0, 0, earth_radius + camera_offset);
    camera.rotateX(Math.PI/2);
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

function create_earth(){
    const earth = new THREE.Mesh(
        new THREE.SphereGeometry( earth_radius, 20, 20 ),
        // new THREE.MeshStandardMaterial({
        //     color: 0x086100,
        // })
        new THREE.MeshNormalMaterial()
    );
    earth.position.copy(earth_initial_position)
    earth.castShadow = false;
    earth.receiveShadow = true;
    
    let collider = new THREE.Sphere(earth_initial_position, earth_radius);
    // ONLY COMMENTING THIS NEXT LINE OUT BECAUSE I NEED TO ADJUST THE PROJECTILE ANGLE
    // collision_elements.push(collider)
    return earth;
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
        'extra_z_distance': 10,
        'create_function': create_cloud,
    },
    'enemy': {
        'probability': 4,
        'extra_z_distance': 50,
        'create_function': create_enemy,
    }
}
function get_random_type() {
    let object_probabilities = {}
    let entries = Object.entries(object_type_details)
    for (let i=0; i<entries.length; i++) {
        let [key, entry] = entries[i]
        object_probabilities[key] = entry['probability']
    }
    let object_type = get_random_element(object_probabilities)
    return object_type_details[object_type]
}


function spawn_objects() {
    for (let i=0; i<150; i++) {
        initialize_in_random_position(get_random_type())
        // initialize_in_random_position(object_type_details['enemy'])
    }
}

// function add_enemy_movement_updater(enemy) {
//     function move_enemy(state, time_delta) {
//         /*
//         The up direction is the plane's normal (the plane that is tangent to the earth at the enemy's position).
//         We get the direction to the player and then project it onto the plane, and then move one step in that direction
//         */
//         let {enemy} = state

//         // rotate the enemy parent to move the enemy close to the camera
//         let camera_world_pos = camera.getWorldPosition(new THREE.Vector3())
//         let camera_position_rel_enemy_parent = enemy.parent.worldToLocal(camera_world_pos)  // redundant? The parent is at the world position
//         let direction_to_camera = new THREE.Vector3().subVectors(camera_position_rel_enemy_parent, enemy.position).normalize()
//         let up = enemy.parent.worldToLocal(enemy.getWorldPosition(new THREE.Vector3()))
//         direction_to_camera.projectOnPlane(up.normalize()).normalize()
//         let axis_of_rotation = new THREE.Vector3().crossVectors(up, direction_to_camera).normalize()
//         let radians = Math.PI * time_delta/ 100;
//         let quaternion = new THREE.Quaternion().setFromAxisAngle(axis_of_rotation, radians)
//         enemy.parent.quaternion.premultiply(quaternion);
//         enemy.parent.updateMatrixWorld(true)

//         // rotate the enemy to face the camera
//         /*
//         The forward direction should be the z axis, and it should lie on a plane to the earth.
//         we need to get the camera position, project it onto that plane, and then rotate the enemy to look at that point
//         by getting the dot product to give us the radians to rotate and then rotating around the up axis
//         we have up and direction_to_camera
//         */
//         // Forward direction relative to the enemy (not their local space, but literally from the enemy)
//         const enemy_forward = new THREE.Vector3(0, 0, -1);
//         // Apply the object's rotation to the forward vector
//         const enemy_forward_rel_parent = enemy_forward.applyQuaternion(enemy.quaternion);
//         // Get the angle between the forward vector and the direction to the camera
//         up = enemy.position.clone().normalize()
//         direction_to_camera = new THREE.Vector3().subVectors(camera_position_rel_enemy_parent, enemy.position).normalize()
//         up = enemy.parent.worldToLocal(enemy.getWorldPosition(new THREE.Vector3()))
//         direction_to_camera.projectOnPlane(up.normalize()).normalize()
//         const angle = enemy_forward_rel_parent.angleTo(direction_to_camera);
//         // console.log(angle, Math.acos(enemy_forward_rel_parent.dot(direction_to_camera)))
//         if (angle > 0.01 ) {
//             let quaternion2 = new THREE.Quaternion().setFromAxisAngle(up, .01)
//             enemy.quaternion.premultiply(quaternion2);
//             enemy.updateMatrixWorld(true);
//         }
//         return state
//     }
//     let updater = new Updater(move_enemy, {enemy})
//     global_updates_queue.push(updater)
// }


function add_enemy_movement_updater(enemy) {
    function move_enemy(state, time_delta) {
        /*
        The up direction is the plane's normal (the plane that is tangent to the earth at the enemy's position).
        We get the direction to the player and then project it onto the plane, and then move one step in that direction
        */
        let {enemy} = state

        let camera_world_pos = camera.getWorldPosition(new THREE.Vector3())
        let enemy_world_pos = enemy.getWorldPosition(new THREE.Vector3())
        // rotate the enemy parent to move the enemy close to the camera
        let up_local_parent = new THREE.Vector3(0, 0, earth_radius + object_type_details['enemy']['extra_z_distance'])
        let dir_to_camera_world = new THREE.Vector3().subVectors(camera_world_pos, enemy_world_pos)
        let dir_to_camera_local_parent = enemy.parent.worldToLocal(dir_to_camera_world.clone()).normalize()
        let axis_of_rotation = new THREE.Vector3().crossVectors(up_local_parent, dir_to_camera_local_parent).normalize()
        let radians = Math.PI * time_delta/ 100;
        let quaternion = new THREE.Quaternion().setFromAxisAngle(axis_of_rotation, radians)
        enemy.parent.quaternion.multiply(quaternion);
        enemy.parent.updateMatrixWorld(true)


        // rotate the enemy to face the camera
        // Forward direction relative to the enemy (not their local space, but literally from the enemy)
        const enemy_forward = new THREE.Vector3(0, 1, 0);
        // Apply the object's rotation to the forward vector
        const forward_relative_to_world = enemy.localToWorld(enemy_forward.clone())
        // Get the angle between the forward vector and the direction to the camera
        const up = new THREE.Vector3(0, 0, -1);
        const up_in_world = enemy.localToWorld(up.clone())
        const project_dir_in_world = dir_to_camera_world.clone().projectOnPlane(up_in_world.normalize())
        const added = enemy.getWorldPosition(new THREE.Vector3()).add(project_dir_in_world)

        const local_added = enemy.worldToLocal(added)
        const local_forward = enemy.worldToLocal(forward_relative_to_world)
        const angle = local_added.angleTo(local_forward)
        
        const cross = new THREE.Vector3().crossVectors(local_forward, local_added)

        if (angle > 0.01 ) {
            // let quaternion2 = new THREE.Quaternion().setFromAxisAngle(enemy.localToWorld(up.clone()), .01)
            // enemy.quaternion.premultiply(quaternion2);
            enemy.rotateZ(Math.sign(cross.z) * .02)
            enemy.updateMatrixWorld(true);
        }
        return state
    }
    let updater = new Updater(move_enemy, {enemy})
    global_updates_queue.push(updater)
}


function initialize_in_random_position(type_of_obj) {
    let obj = type_of_obj['create_function']()
    let parent = new THREE.Object3D();
    obj.add_to(parent)
    earth.add(parent)
    obj.position.set(0, 0, earth_radius + type_of_obj['extra_z_distance'])
    // let random_rotation_axis = new THREE.Vector3(1,0,0)
    // let radians = 0;
    let random_rotation_axis = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize()
    let radians = Math.max(0.5, Math.PI * Math.random());
    let quaternion = new THREE.Quaternion().setFromAxisAngle(random_rotation_axis, radians)
    parent.quaternion.multiply(quaternion);
    obj.initial_rotation();
    if (type_of_obj['create_function'] === create_enemy) {
        add_enemy_movement_updater(obj)
    }
    parent.updateMatrixWorld(true)
}


// function add_mine_to_earth(){
//     let mine = create_mine({})
//     // we add the mine first to get it into earth's relative units
//     mine.add_to(earth)

//     collision_elements.push(mine)

//     return mine
// }

// function add_cloud_to_earth() {
//     // const onclick = (target) => {
//     //     // this is just a POC. It doesnt work because all of the projectiles use the same material
//     //     // target.object.material.color.set('#eb4034')
//     //     console.log('clicked cloud')
//     // }
//     let cloud = create_cloud({})
//     // we add the enemy first to get it into earth's relative units
//     cloud.add_to(earth)


//     return cloud
// }



// function add_enemy_to_earth(){
//     let enemy = create_enemy({'geometry': enemy_geometry, 'material': enemy_material})
//     // give it a parent to make the rotations easier
//     initialize_in_random_position(enemy)

//     collision_elements.push(enemy)

//     return enemy
// }

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

function get_up_direction() {
    let camera_position = camera_parent.worldToLocal(camera.getWorldPosition(new THREE.Vector3()))

    // TODO: we can probably just hardcode the earth position, since it doesnt move
    let earth_position = camera_parent.worldToLocal(earth.getWorldPosition(new THREE.Vector3()))

    return new THREE.Vector3().subVectors(earth_position, camera_position).normalize()
}

function on_mouse_move(event){
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    // mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    // mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;



    //check this at some point: https://web.dev/articles/disable-mouse-acceleration

    // the sensitivity is set so that the screen width/height is 180 degrees
    var movementX = event.movementX || event.mozMovementX || 0;
    var movementY = event.movementY || event.mozMovementY || 0;
    let ratio = window.innerWidth / window.innerHeight;
    
    let x_radians = movementX * Math.PI * ratio / window.innerWidth;
    let y_radians = movementY * Math.PI * ratio / window.innerHeight;

    /*
    Important note: an object's rotation/quaternion is relative to its parent. It is a local rotation.
    So here I get the vectors from the point of view of the camera parent.
    */
    let current_direction_vector = camera_parent.worldToLocal(camera.getWorldDirection(new THREE.Vector3()).normalize())

    let up = get_up_direction();
    let right = current_direction_vector.clone().cross(up).normalize();
    
    // Limit the tilt of the camera. When the up and current_direction_vector are parallel,
    // it makes the cross product weird, so we avoid that by limiting how far the camera can tilt
    let tilt_limit = Math.PI / 12; // 15 degrees in radians
    let angle_between = current_direction_vector.angleTo(up);

    if (!((y_radians < 0 && Math.PI + y_radians - angle_between + y_radians < tilt_limit) || 
            (y_radians > 0 && angle_between - y_radians < tilt_limit))) {
        let quaternionY = new THREE.Quaternion().setFromAxisAngle(right, y_radians);
        camera.quaternion.premultiply(quaternionY).normalize();
    }

    let quaternionX = new THREE.Quaternion().setFromAxisAngle(up, x_radians);
    camera.quaternion.premultiply(quaternionX).normalize();

    camera.updateMatrixWorld(true)

    mouse_ray.setFromCamera( mouse, camera );
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
var audio = new Audio('sound.mov');
function on_mouse_click(event) {
    // this next line helps debug. Previously we were getting different positions because the renderer was expecting
    // a larger size (it looks for the window size) but we had another div pushing the threejs window down and smaller
    // scene.add(new THREE.ArrowHelper(mouse_ray.ray.direction, mouse_ray.ray.origin, 300, 0xff0000) );
    let children = []
    for (let c=0; c<scene.children.length; c++) {
        children.push(scene.children[c])
    }
    for (let e=0; e<earth.children.length; e++) {
        children.push(earth.children[e])
    }
    let intersects = unique(mouse_ray.intersectObjects( children, false ), (o) => o.object.uuid);
    let intersects_with_click = intersects.filter(intersect => intersect.object.onclick);
    if (intersects_with_click.length) {
        // audio.play();
        intersects_with_click.forEach(intersect => intersect.object.onclick())  // removed interesct, i dont think it did anything
    }
}

function movement_curve(x) {
    // The goal of this function is to make the movement speed increase logarithmically.
    // Initially you move quickly and then it plateaus
    // TODO: optimize this
    let ret = Math.max(0, 3 * Math.log10(x) + 3)
    return ret;
}




let current_direction_vector = new THREE.Vector3(0, 0, 0);
const max_movement_speed = 10;

const forward = new THREE.Vector3(0, 0, -1);
const right = new THREE.Vector3(1, 0, 0);
const back = new THREE.Vector3(0, 0, 1);
const left = new THREE.Vector3(-1, 0, 0);

const movement_keys = ['w', 's', 'a', 'd']
const pressed_keys = {
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

function move_camera(state, time_delta) {
    let movement_vector_rel_camera = new THREE.Vector3(0, 0, 0);
    movement_keys.forEach(key => {
        if (pressed_keys[key]['pressed']) {
            let movement_force_scalar = movement_curve(pressed_keys[key]['pressed'])
            let added_direction = pressed_keys[key]['direction'].clone().multiplyScalar(movement_force_scalar)
            movement_vector_rel_camera.add(added_direction)
        }
    })
    
    let up_rel_parent = new THREE.Vector3().subVectors(earth.getWorldPosition(new THREE.Vector3()), camera.getWorldPosition(new THREE.Vector3())).normalize()
    current_direction_vector.add(movement_vector_rel_camera)
    let movement_rel_parent = new THREE.Vector3().subVectors(camera.localToWorld(current_direction_vector.clone()), camera.getWorldPosition(new THREE.Vector3())).normalize()
    let rotation_axis = movement_rel_parent.clone().cross(up_rel_parent).normalize()

    let len = current_direction_vector.length()
    if (len > 1) {
        let drag = current_direction_vector.clone().normalize().multiplyScalar(len/20)
        current_direction_vector.sub(drag)
    } else {
        current_direction_vector.set(0, 0, 0)
    }
    let movement_speed = Math.min(current_direction_vector.length(), max_movement_speed)

    // TODO: use slerp somehow
    let radians = Math.PI * movement_speed * time_delta / 180;
    if (radians > 0) {
        let quaternion = new THREE.Quaternion().setFromAxisAngle(rotation_axis, radians)
        camera_parent.quaternion.premultiply(quaternion);
        camera_parent.updateMatrixWorld(true)
    }
    return {finished: false}
}

let move_camera_updater = new Updater(move_camera, {})
global_updates_queue.push(move_camera_updater)


function jump_curve(x) {
    // A jump will last pi/3 seconds
    return Math.sin(3*x)
}

function jump(state, time_delta) {
    function jump_helper(func_state, func_time_delta){
        camera.position.z = earth_radius + camera_offset + jump_curve(global_clock.elapsedTime - func_state.initial_time) * 150;
        if (global_clock.elapsedTime - func_state.initial_time > Math.PI/3) {
            func_state['finished'] = true
            pressed_keys[' ']['pressed'] = 0;
        }
        return func_state
    }
    let jump_updater = new Updater(jump_helper, {initial_time: global_clock.elapsedTime, finished: false})
    global_updates_queue.push(jump_updater)
}


function handle_keydown(e) {      
    const space = ' '
    let keys_to_compound = get(key_to_compound)
    if (Object.keys(keys_to_compound).includes(e.key)) {
        let compound = keys_to_compound[e.key]
        try_to_fire_player_weapon(compound)
    } else if (movement_keys.includes(e.key)) {
        pressed_keys[e.key]['pressed'] = Math.min(5, pressed_keys[e.key]['pressed'] + 1);
    } else if (e.key === space) {
        if (pressed_keys[space]['pressed'] === 0) {
            pressed_keys[space]['pressed'] = 1;
            jump();
        }
    }
}

function handle_keyup(e) {
    if (movement_keys.includes(e.key)) {
        pressed_keys[e.key]['pressed'] = 0;
    }
}

function check_if_weapon_can_fire_and_get_new_counts(compound) {
    let element_counts = get(current_element_counts)
    let entries = Object.entries(parse_formula_to_dict(compound));
    for (let i=0; i<entries.length; i++) {
        let [element, count_needed] = entries[i];
        // if (element_counts[element] === undefined || element_counts[element] - count_needed < 0) {
        //     return [false, {}]
        // }
        element_counts[element] = element_counts[element] - count_needed
    }
    return [true, element_counts]
}

function try_to_fire_player_weapon(compound){
    const initial_pos = camera.getWorldPosition(new THREE.Vector3())

    const onclick = (target) => {
        // this is just a POC. It doesnt work because all of the projectiles use the same material
        // target.object.material.color.set('#eb4034')
    }
    let params = {'parent': scene, initial_pos, onclick}
    let [can_fire_weapon, new_counts] = check_if_weapon_can_fire_and_get_new_counts(compound);
    if (!can_fire_weapon) return;
    let projectile = create_compound(compound, params)
    current_element_counts.set(new_counts)
    scene.add(projectile.mesh)
    let initial_time = global_clock.elapsedTime
    let direction = camera.getWorldDirection(new THREE.Vector3())
    let updater = new Updater(blast_projectile, {projectile: projectile, initial_time, direction})
    global_updates_queue.push(updater)
}

function fire_enemy_projectile(){
    // const initial_pos = new THREE.Vector3(0, 20, -200);
    // const velocity = new THREE.Vector3(0, 5, 5);
    // const onclick = (projectile) => {
    //     projectile.mesh.material.color.set('#eb4034')
    // }
    // let projectile = new Projectile(sphere_geometry, toon_material, initial_pos, velocity, onclick)
    // scene.add(projectile.mesh)
    // let updater = new Updater(blast_projectile, {projectile: projectile})
    // global_updates_queue.push(updater)
}

function blast_projectile({projectile, total_time, initial_time, direction}, time_delta){
    if (!total_time) total_time = 1;
    let mesh = projectile.mesh

    total_time = global_clock.elapsedTime - initial_time;
    let added = direction.clone().normalize().multiplyScalar(time_delta * 100 * Math.pow(total_time, 5) + 20)
    mesh.position.add(added)

    let collisions = projectile.check_collisions(collision_elements);
    collisions.forEach(collided_obj => collided_obj.collide(projectile));

    let finished = false;
    if (total_time > 10 || collisions.length) {
        finished = true
        return {finished, to_delete: [projectile]}
    }
    return {projectile, total_time, finished, initial_time, direction}
}
