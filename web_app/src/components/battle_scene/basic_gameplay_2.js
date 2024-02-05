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


var global_updates_queue = [];
var global_clock = new THREE.Clock();
// Earth settings
var earth_radius = 600;
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
console.log(mouse_ray)
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
        // camera.lookAt(new THREE.Vector3(0, 30, -100));
        // spawn_enemies()
        // spawn_mines()
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
            // // sometimes during iteration, another updater will be added to the queue, so we cant do a forEach
            // let i = 0;
            // while (i < global_updates_queue.length) {
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
                i++
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
    const far = 1000.0;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    camera_parent = new THREE.Object3D();
    earth.add(camera_parent);
    camera_parent.position.set(0, 0, 0);
    camera_parent.add(camera);
    camera.position.set(0, 0, earth_radius + 50);
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

    // function rotate_earth(state) {
    //     let new_x_rotation = (global_clock.elapsedTime % time_for_full_rotation) * 2 * Math.PI / time_for_full_rotation;
    //     let new_earth_rotation = new THREE.Vector3(new_x_rotation, earth.rotation.y, earth.rotation.z)
    //     earth.rotation.setFromVector3(new_earth_rotation)
    //     return {finished: false}
    // }
    // let updater = new Updater(rotate_earth, {})
    // global_updates_queue.push(updater)

    return earth;
}


const object_type_details = {
    'mine': {
        'probability': 1,
        'extra_z_distance': 0,
        'add_function': add_mine_to_earth,
    },
    'cloud': {
        'probability': 2,
        'extra_z_distance': 10,
        'add_function': add_cloud_to_earth,
    },
    'enemy': {
        'probability': 8,
        'extra_z_distance': 5,
        'add_function': add_enemy_to_earth
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
    function add_enemy_every_5_seconds({already_added_enemy, last_enemy}) {
        let mod_5 = Math.floor(global_clock.elapsedTime) % 5 === 0  // spawn every 6 seconds
        if (mod_5 && !already_added_enemy) {
            for (let position = -1; position <= 1; position++){ // -1,0,1 for the lanes
                if (Math.ceil(Math.random() * 3) !== 3) { // only spawn an enemy/mine 1/3 of the time
                    continue;
                }
                let y_rotation_angle = Math.PI/10 * position
                let x_diff = earth_radius * Math.sin(y_rotation_angle)
                // so if the position is 0, the x_diff will be 0
                // if the position is 1 with a rotation angle of 30 degrees, the x_diff will be like 15
                let z_diff = earth_radius * Math.cos(y_rotation_angle)

                let type_of_object;
                if (global_clock.elapsedTime < mod_5 * 3) { // just to make sure the first couple spawn is a mine/cloud
                    type_of_object = object_type_details['cloud'];
                } else {
                    type_of_object = get_random_type()
                }
                // for the enemies, 5 is for half of the enemy size, since I guess the center point is the
                // center of the cube, whereas the center of the cone is the base? idk
                // also we have to do it before we call earth.worldToLocal below, because that makes everything confusing
                let initial_z = earth_initial_position.z - z_diff - type_of_object['extra_z_distance']
                let world_initial_pos = new THREE.Vector3(x_diff, earth_initial_position.y, initial_z)
                let initial_enemy_position = earth.worldToLocal(world_initial_pos)

                last_enemy = type_of_object['add_function'](initial_enemy_position, -y_rotation_angle)
                already_added_enemy = true
            }
        } else if (!mod_5) {
            already_added_enemy = false
        }
        return {already_added_enemy, last_enemy, finished: false}
    }
    let updater = new Updater(add_enemy_every_5_seconds, {})
    global_updates_queue.push(updater)
}


function delete_mine({mine, initial_time}) {
    if (global_clock.elapsedTime - initial_time > time_for_full_rotation || mine.should_delete) {
        return {mine, finished: true, to_delete: [mine]}
    }
    return {mine, finished: false, initial_time: initial_time}
}

function add_mine_to_earth(position, y_rotation_angle){
    let mine = create_mine({position})
    // we add the mine first to get it into earth's relative units
    mine.add_to(earth)
    mine.rotateX(-earth.rotation.x - Math.PI / 2)
    mine.rotateZ(y_rotation_angle)

    collision_elements.push(mine)

    let updater = new Updater(delete_mine, {mine: mine, finished: false, initial_time: global_clock.elapsedTime})
    global_updates_queue.push(updater)
    return mine
}

function add_cloud_to_earth(position, y_rotation_angle) {
    // const onclick = (target) => {
    //     // this is just a POC. It doesnt work because all of the projectiles use the same material
    //     // target.object.material.color.set('#eb4034')
    //     console.log('clicked cloud')
    // }
    let cloud = create_cloud({position})
    // we add the enemy first to get it into earth's relative units
    cloud.add_to(earth)
    cloud.rotateZ(y_rotation_angle)
    cloud.rotateX(-earth.rotation.x - Math.PI / 2)
    
    let updater = new Updater(delete_mine, {mine: cloud, finished: false, initial_time: global_clock.elapsedTime})
    global_updates_queue.push(updater)
    return cloud
}

let enemy_geometry = new THREE.BoxGeometry( 10, 10, 10 );
let enemy_material = new THREE.MeshStandardMaterial({color: 0xeb4034,});

function add_enemy_to_earth(position, y_rotation_angle){
    let enemy = create_enemy({position, 'geometry': enemy_geometry, 'material': enemy_material})
    // we add the enemy first to get it into earth's relative units
    enemy.add_to(earth)
    enemy.rotateX(-earth.rotation.x)
    enemy.rotateY(y_rotation_angle)

    collision_elements.push(enemy)

    function delete_enemy({enemy, initial_time}) {
        if (global_clock.elapsedTime - initial_time > time_for_full_rotation || enemy.should_delete) {
            return {enemy, finished: true, to_delete: [enemy]}
        }
        return {enemy, finished: false, initial_time: initial_time}
    }
    
    let updater = new Updater(delete_enemy, {enemy: enemy, finished: false, initial_time: global_clock.elapsedTime})
    global_updates_queue.push(updater)
    return enemy
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

function get_up_direction() {
    let camera_position = camera_parent.worldToLocal(camera.getWorldPosition(new THREE.Vector3()))

    // // TODO: we can probably just hardcode the earth position, since it doesnt move
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
    // let current_direction_vector = camera.getWorldDirection(new THREE.Vector3()).normalize();
    let current_direction_vector = camera_parent.worldToLocal(camera.getWorldDirection(new THREE.Vector3()).normalize())

    let up = get_up_direction();
    let right = current_direction_vector.clone().cross(up).normalize();
    // console.log(earth_position, camera.position, up, right, current_direction_vector)
    
    // Limit the tilt of the camera. When the up and current_direction_vector are parallel,
    // it makes the cross product weird, so we avoid that by limiting how far the camera can tilt
    let tilt_limit = Math.PI / 12; // 15 degrees in radians
    let angle_between = current_direction_vector.angleTo(up);

    if (!((y_radians < 0 && Math.PI + y_radians - angle_between + y_radians < tilt_limit) || 
            (y_radians > 0 && angle_between - y_radians < tilt_limit))) {
        let quaternionY = new THREE.Quaternion().setFromAxisAngle(right, y_radians);
        camera.quaternion.premultiply(quaternionY).normalize();
    }

    // let localUp = camera.worldToLocal(up.clone());
    let quaternionX = new THREE.Quaternion().setFromAxisAngle(up, x_radians);
    camera.quaternion.premultiply(quaternionX).normalize();
    // console.log(quaternionX, x_radians)

    camera.updateMatrixWorld(true)

    // console.log(x_radians, y_radians)
    mouse_ray.setFromCamera( mouse, camera );
    // var distance = 100; // You can adjust this distance
    // var direction = mouse_ray.ray.direction.multiplyScalar(distance);
    // var targetPosition = new THREE.Vector3().copy(camera.parent.position).add(direction);
    // camera.lookAt(targetPosition);
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
const max_movement_speed = 50;

const forward = new THREE.Vector3(0, 0, -1);
const right = new THREE.Vector3(1, 0, 0);
const back = new THREE.Vector3(0, 0, 1);
const left = new THREE.Vector3(-1, 0, 0);

const pressed_keys = {
    'ArrowUp': {
        'pressed': 0,
        'direction': forward,
    },
    'ArrowDown': {
        'pressed': 0,
        'direction': back,
    },
    'ArrowLeft': {
        'pressed': 0,
        'direction': left,
    },
    'ArrowRight': {
        'pressed': 0,
        'direction': right,
    },
}


// function get_force_vector_relative_to_camera_direction(key) {
//     normal_vec = pressed_keys[key]['direction']
//     let current_direction_vector = camera.getWorldDirection(new THREE.Vector3())
//     // Note: cross sets the vector to the result and returns itself, dot just returns the magnitude of the similarity
//     // this gives you a normal vector to the direction of the bond and the vertical
//     // which is used as the axis to rotate around.
//     let axis_of_rotation = normal_vec.clone().cross(current_direction_vector).normalize()
//     // this gives you the radians between the distance vector (current_direction_vector) and the normal vec axis
//     // it works because normalizing the vector makes its magnitude 1, and the normal vec has a magnitude of 1, so mag x mag x cos(angle) = 1 x 1 x cos(angle)
//     // and then we take the acos, which gives us just the angle (in radians)
//     const radians = Math.acos(normal_vec.dot(current_direction_vector.normalize()));
//     return normal_vec.clone().applyAxisAngle(axis_of_rotation, radians);
// }

function camera_direction_to_earth_direction(vector, scale) {
    // we need to translate a direction like "right", which is from the perspective of the camera,
    // to a direction from the perspective of the parent
    let clone = vector.clone().multiplyScalar(scale)
    camera.localToWorld(clone)
    return earth.worldToLocal(clone)
}

function move_camera(state, time_delta) {
    let movement_vector_rel_camera = new THREE.Vector3(0, 0, 0);
    // let gravity_vector = get_up_direction().multiplyScalar(gravity)
    // movement_vector.add(gravity_vector)
    for (let key in pressed_keys) {
        if (pressed_keys[key]['pressed']) {
            let movement_force_scalar = movement_curve(pressed_keys[key]['pressed'])
            let added_direction = pressed_keys[key]['direction'].clone().multiplyScalar(movement_force_scalar)
            // let added_direction = camera_direction_to_earth_direction(pressed_keys[key]['direction'], movement_force_scalar)
            movement_vector_rel_camera.add(added_direction)
        }
        // } else {
        //     movement_vector.add(pressed_keys[key]['direction'].clone().multiplyScalar(drag))
        // }
    }
    // let camera_position = camera_parent.worldToLocal(camera.getWorldPosition(new THREE.Vector3()))
    
    let up_rel_parent = new THREE.Vector3().subVectors(earth.getWorldPosition(new THREE.Vector3()), camera.getWorldPosition(new THREE.Vector3())).normalize()
    let movement_rel_parent = new THREE.Vector3().subVectors(camera.localToWorld(movement_vector_rel_camera.clone()), camera.getWorldPosition(new THREE.Vector3())).normalize()
    // movement_vector_rel_camera.applyQuaternion(camera.quaternion)
    // movement_vector_rel_camera.add(camera.position)

    // let up_rel_parent = get_up_direction()
    let rotation_axis = movement_rel_parent.clone().cross(up_rel_parent).normalize()
    // rotation_axis = camera_parent.worldToLocal(camera.localToWorld(rotation_axis)) - camera_parent.position
    // let right_rel_camera = right.clone().applyQuaternion(camera.quaternion).normalize();
    let movement_speed = Math.min(movement_vector_rel_camera.length(), 50)
    if (movement_speed > 0) {
        let drag = movement_vector_rel_camera.clone().negate().normalize().multiplyScalar(Math.sqrt(movement_speed))
        movement_vector_rel_camera.add(drag)
    }

    // TODO: use slerp somehow
    let radians = Math.PI * movement_speed * time_delta / 18;
    if (radians > 0) {
        let quaternion = new THREE.Quaternion().setFromAxisAngle(rotation_axis, radians)
        camera_parent.quaternion.premultiply(quaternion);
        camera_parent.updateMatrixWorld(true)
    }
    return {finished: false}
}

let move_camera_updater = new Updater(move_camera, {})
global_updates_queue.push(move_camera_updater)

// function test() {
//     console.log('test')
//     let current_direction_vector = camera.getWorldDirection(new THREE.Vector3()).normalize();
//     let camera_world_position = camera.getWorldPosition(new THREE.Vector3())
//     // // TODO: we can probably just hardcode the earth position, since it doesnt move
//     let earth_world_position = earth.getWorldPosition(new THREE.Vector3())
//     let up = new THREE.Vector3().subVectors(camera_world_position, earth_world_position).normalize()
//     let forward = current_direction_vector.clone().projectOnPlane(up).normalize();
//     let right = forward.clone().cross(up).normalize();
//     const movement_radians = Math.PI / 2
//     // console.log(right, camera_parent.position, camera.position)
//     let quaternion = new THREE.Quaternion().setFromAxisAngle(right, movement_radians);
//     camera_parent.quaternion.premultiply(quaternion);
//     camera_parent.updateMatrixWorld(true)
// }


function handle_keydown(e) {
    // TODO: change the movement keys to wasd, and the shooting keys to 12345
    const movement_keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
    let keys_to_compound = get(key_to_compound)
    if (Object.keys(keys_to_compound).includes(e.key)) {
        let compound = keys_to_compound[e.key]
        try_to_fire_player_weapon(compound)
    } else if (movement_keys.includes(e.key)) {
        pressed_keys[e.key]['pressed'] += 1;
        // test()
        // if (movement_key_pressed_time <= max_movement_speed - 1) {
        //     movement_key_pressed_time += 1;
        // }
    } 
}

function handle_keyup(e) {
    const movement_keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
    if (movement_keys.includes(e.key)) {
        pressed_keys[e.key]['pressed'] = 0;
    }
    // if (movement_keys.includes(e.key) && movement_key_pressed_time >= 1) {
    //     movement_key_pressed_time -= drag;
    // }
}

function check_if_weapon_can_fire_and_get_new_counts(compound) {
    let element_counts = get(current_element_counts)
    let entries = Object.entries(parse_formula_to_dict(compound));
    for (let i=0; i<entries.length; i++) {
        let [element, count_needed] = entries[i];
        if (element_counts[element] === undefined || element_counts[element] - count_needed < 0) {
            return [false, {}]
        }
        element_counts[element] = element_counts[element] - count_needed
    }
    return [true, element_counts]
}

function try_to_fire_player_weapon(compound){
    const initial_pos = camera.position.clone()
    initial_pos.y -= 10
    initial_pos.z -= 15
    const velocity = mouse_ray.ray.direction.clone();
    velocity.multiplyScalar(8 * speed);
    velocity.y += (5 * speed)
    const onclick = (target) => {
        // this is just a POC. It doesnt work because all of the projectiles use the same material
        // target.object.material.color.set('#eb4034')
    }
    let params = {'parent': scene, initial_pos, velocity, onclick}
    let [can_fire_weapon, new_counts] = check_if_weapon_can_fire_and_get_new_counts(compound);
    if (!can_fire_weapon) return;
    let projectile = create_compound(compound, params)
    current_element_counts.set(new_counts)
    scene.add(projectile.mesh)
    let updater = new Updater(blast_projectile, {projectile: projectile})
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

function blast_projectile({projectile, total_time, initial_time}){
    if (!initial_time) initial_time = global_clock.elapsedTime
    if (!total_time) total_time = 1;
    let mesh = projectile.mesh
    // xf = x0 + v0t + .5at^2
    let v0t = projectile.velocity.clone().multiplyScalar(total_time)
    let at2 = gravity.clone().multiplyScalar(total_time ** 2).multiplyScalar(0.5)
    let added = v0t.add(at2).multiplyScalar(world_units_scale)
    total_time += global_clock.elapsedTime - initial_time;
    mesh.position.add(added)

    let collisions = projectile.check_collisions(collision_elements);
    collisions.forEach(collided_obj => collided_obj.collide(projectile));

    let finished = false;
    if (total_time > 100 || collisions.length) {
        finished = true
        return {finished, to_delete: [projectile]}
    }
    return {projectile, total_time, finished, initial_time}
}
