import * as THREE from 'three';
import { get } from 'svelte/store';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import * as AmmoLib from '../lib/ammo.js';
import {create_enemy, create_mine} from '../../objects.js';
import {create_compound} from '../../compounds.js';
import { selected_compound, current_element_counts } from '../../stores.js';
import { parse_formula_to_dict } from '../../helper_functions.js';

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

    update(){
        this.state = this.step_function(this.state);
    }
}


var global_updates_queue = [];
var global_clock = new THREE.Clock();
var time_delta = 0
var gravity = new THREE.Vector3(0, -.5, 0);
var frame_rate = 60;
var world_units_scale = 1/frame_rate  // used to adjust the speed of things, because moving an obj 10 units is super fast/far 
var scene = new THREE.Scene()
var camera = create_camera();
var mouse_ray = new THREE.Raycaster();
var mouse = new THREE.Vector2();

// Earth settings
var earth_radius = 60;
var speed = 1;
var time_for_full_rotation = 30/speed;
var earth_initial_position = new THREE.Vector3(0,0,0)
var earth = create_earth();

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
        window.addEventListener('resize', () => this.resize_window(), false);
        window.addEventListener('mousemove', (event) => on_mouse_move(event), false)
        window.addEventListener('click', (event) => on_mouse_click(event), false)

        this.renderer.render(scene, camera);
        camera.lookAt(new THREE.Vector3(0, 30, -100));
        // spawn_enemies()
        // spawn_mines()
        spawn_objects()
        this.animate();
    }

    animate(){
        requestAnimationFrame(()=>{
            this.animate()
            stats.begin();
            time_delta = global_clock.getDelta();
            this.renderer.render(scene, camera);
            let next_updates = []
            // sometimes during iteration, another updater will be added to the queue, so we cant do a forEach
            let i = 0;
            let updater;
            while (i < global_updates_queue.length) {
                updater = global_updates_queue[i]
                updater.update()
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
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 55, 60)
    return camera
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
        new THREE.MeshStandardMaterial({
            color: 0x086100,
        })
    );
    earth.position.copy(earth_initial_position)
    earth.castShadow = false;
    earth.receiveShadow = true;
    
    let collider = new THREE.Sphere(earth_initial_position, earth_radius);
    // ONLY COMMENTING THIS NEXT LINE OUT BECAUSE I NEED TO ADJUST THE PROJECTILE ANGLE
    // collision_elements.push(collider)

    function rotate_earth(state) {
        let new_x_rotation = (global_clock.elapsedTime % time_for_full_rotation) * 2 * Math.PI / time_for_full_rotation;
        let new_earth_rotation = new THREE.Vector3(new_x_rotation, earth.rotation.y, earth.rotation.z)
        earth.rotation.setFromVector3(new_earth_rotation)
        return {finished: false}
    }
    let updater = new Updater(rotate_earth, {})
    global_updates_queue.push(updater)

    return earth;
}

function spawn_objects() {
    function add_enemy_every_5_seconds({already_added_enemy, last_initial_position, last_initial_rotation, last_enemy}) {
        let mod_5 = Math.floor(global_clock.elapsedTime) % 6 === 0  // spawn every 6 seconds
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

                let type_of_object = Math.ceil(Math.random() * 2)
                // 5 for half of the enemy size, since I guess the center point is the center of the cube,
                // whereas the center of the cone is the base? idk
                // also we have to do it before we call earth.worldToLocal below, because that makes everything confusing
                let extra_z_distance = type_of_object === 1 ? 5 : 0
                let initial_z = earth_initial_position.z - z_diff - extra_z_distance
                let world_initial_pos = new THREE.Vector3(x_diff, earth_initial_position.y, initial_z)
                let initial_enemy_position = earth.worldToLocal(world_initial_pos)

                if (type_of_object === 1) {
                    last_enemy = add_enemy_to_earth(initial_enemy_position, -y_rotation_angle)
                } else if (type_of_object === 2) {
                    last_enemy = add_mine_to_earth(initial_enemy_position, -y_rotation_angle)
                }
                // last_enemy = add_enemy_to_earth(initial_enemy_position, -y_rotation_angle)
                already_added_enemy = true
            }
        } else if (!mod_5) {
            already_added_enemy = false
        }
        return {already_added_enemy, last_initial_position, last_initial_rotation, last_enemy, finished: false}
    }
    let updater = new Updater(add_enemy_every_5_seconds, {})
    global_updates_queue.push(updater)
}


function add_mine_to_earth(position, y_rotation_angle){
    let enemy = create_mine({position})
    // we add the enemy first to get it into earth's relative units
    enemy.add_to(earth)
    enemy.rotateX(-earth.rotation.x - Math.PI / 2)
    enemy.rotateZ(y_rotation_angle)

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

function on_mouse_move(event){
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
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
function on_mouse_click(event) {
    // COMMENTED OUT because I dont care about the color changes, it was just a POC
    // let intersects = unique(mouse_ray.intersectObjects( scene.children ), (o) => o.object.uuid);
    // let intersects_with_click = intersects.filter(intersect => intersect.object.onclick);
    // if (intersects_with_click.length) {
    //     intersects_with_click.forEach(intersect => intersect.object.onclick(intersect))
    // } else {
    //     fire_player_weapon();
    // }
    fire_player_weapon();
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


function fire_player_weapon(){
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
    let compound = get(selected_compound)
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
