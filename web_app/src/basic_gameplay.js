import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as compounds from './compounds.js'
// import * as AmmoLib from '../lib/ammo.js';
import {create_projectile, create_enemy, Enemy, get_all_properties} from './objects.js';

import { Stats } from '../public/lib/stats.js'


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
var time_for_full_rotation = 30;
var earth_initial_position = new THREE.Vector3(0,0,0)
var earth = create_earth();

var collision_elements = [];  // we just have to keep track of the enemies and earth, and when the ball moves,
                              // it checks for any collisions with these elements


var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

export class BasicGameplay {
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
        spawn_enemies()
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
    
    let collision_sphere = new THREE.Sphere(earth_initial_position, earth_radius);
    // ONLY COMMENTING THIS NEXT LINE OUT BECAUSE I NEED TO ADJUST THE PROJECTILE ANGLE
    // collision_elements.push(collision_sphere)

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

function spawn_enemies() {
    function add_enemy_every_5_seconds({already_added_enemy, last_initial_position, last_initial_rotation, last_enemy}) {
        let mod_5 = Math.floor(global_clock.elapsedTime) % 3 === 0
        if (mod_5 && !already_added_enemy) {
            let position = Math.floor(Math.random() * 3) - 1  // -1,0,1 for the lanes
            let y_rotation_angle = Math.PI/10 * position
            let x_diff = earth_radius * Math.sin(y_rotation_angle)
            // so if the position is 0, the x_diff will be 0
            // if the position is 1 with a rotation angle of 30 degrees, the x_diff will be like 15
            let z_diff = earth_radius * Math.cos(y_rotation_angle)
            // 5 for half of the enemy size
            let initial_z = earth_initial_position.z - z_diff - 5

            let world_initial_pos = new THREE.Vector3(x_diff, earth_initial_position.y, initial_z)
            let initial_enemy_position = earth.worldToLocal(world_initial_pos)

            last_enemy = add_enemy_to_earth(initial_enemy_position, -y_rotation_angle)
            already_added_enemy = true
        } else if (!mod_5) {
            already_added_enemy = false
        }
        return {already_added_enemy, last_initial_position, last_initial_rotation, last_enemy, finished: false}
    }
    let updater = new Updater(add_enemy_every_5_seconds, {})
    global_updates_queue.push(updater)
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
    let intersects = unique(mouse_ray.intersectObjects( scene.children ), (o) => o.object.uuid);
    let intersects_with_click = intersects.filter(intersect => intersect.object.onclick);
    if (intersects_with_click.length) {
        intersects_with_click.forEach(intersect => intersect.object.onclick(intersect))
    } else {
        fire_player_weapon();
    }
}


var projectile_radius = 5;
var sphere_geometry = new THREE.SphereGeometry( projectile_radius, 10, 10 );
var toon_material = new THREE.MeshToonMaterial({color: 0xffff00})

function fire_player_weapon(){
    const initial_pos = camera.position.clone()
    initial_pos.y -= 10
    initial_pos.z -= 15
    const velocity = mouse_ray.ray.direction.clone();
    velocity.multiplyScalar(8);
    velocity.y += 4
    const onclick = (target) => {
        // this is just a POC. It doesnt work because all of the projectiles use the same material
        target.object.material.color.set('#eb4034')
    }
    let params = {'geometry': sphere_geometry, 'material': toon_material, 'parent': scene,
                  initial_pos, velocity, onclick}
    let projectile = create_projectile(params)
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
    if (!initial_time) {
        initial_time = global_clock.elapsedTime
    }
    let mesh = projectile.mesh
    if (!total_time) total_time = 1;
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
        console.log(total_time, collisions)
        return {finished, to_delete: [projectile]}
    }
    return {projectile, total_time, finished, initial_time}
}
