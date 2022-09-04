import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as compounds from './compounds.js'

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
var world_units_scale = 0.05  // used to adjust the speed of things, because moving an obj 10 units is super fast/far 
var scene = new THREE.Scene()
var camera = create_camera();
var mouse_ray = new THREE.Raycaster();
var mouse = new THREE.Vector2();

// Earth settings
var earth_radius = 60;
var time_for_full_rotation = 30;
var earth = create_earth(earth_radius);


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
        camera.lookAt(new THREE.Vector3(0, 0, -100));
        spawn_enemies()
        fire_enemy_projectile()
        this.animate();
    }

    animate(){
        requestAnimationFrame(()=>{
            this.animate()
            time_delta = global_clock.getDelta();
            this.renderer.render(scene, camera);
            let next_updates = []
            while (true) {
                // we have to do this pop thing, because sometimes during iteration, another updater will be added to
                // the queue, and I want to make sure to get it. Doing a forEach doesnt allow new updaters to be added
                let updater = global_updates_queue.pop()
                if (updater === undefined) {
                    break;
                }
                updater.update()
                if (!updater.state.finished) { 
                    next_updates.push(updater);
                } else {
                    updater.state.to_delete?.forEach(to_delete => to_delete.dispose());
                }
            }
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
        antialias: true,
    });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    camera.position.set(0, 20, 10);
    return camera
}

function create_directional_light(){
    const light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    light.position.set(-100, 100, 100);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 50;
    light.shadow.camera.right = -50;
    light.shadow.camera.top = 50;
    light.shadow.camera.bottom = -50;
    return light
}

function create_earth(earth_radius){
    const earth = new THREE.Mesh(
        new THREE.SphereGeometry( earth_radius, 20, 20 ),
        new THREE.MeshStandardMaterial({
            color: 0x086100,
        })
    );
    earth.position.set(0, -35, -50)
    earth.castShadow = false;
    earth.receiveShadow = true;    
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

// function spawn_enemies() {
//     function add_enemy_every_5_seconds({already_added_enemy, last_initial_position, last_initial_rotation, last_enemy}) {
//         let mod_5 = Math.floor(global_clock.elapsedTime) % 5 === 0
//         if (mod_5 && !already_added_enemy) {
//             const x = 0;  // distance away from the center for each lane
//             let position = Math.floor(Math.random() * 3) - 1  // numbers -1, 0, 1 representing the lanes
//             let x_position = x * position
//             let origin = new THREE.Vector2(0, 0)
//             // mult the ratio of the (x / radius) against the fact that cosine goes from 0 to 1 between 0 and pi/2 rads
//             let radians = (x_position / 30) * (Math.PI / 2)
//             let z_position = -65 * Math.cos(radians)  // 65 because radius is 60, and enemy height is 10 (so halfway)
//             // because we moved 5.xx seconds out of 30 (the time_for_full_rotation), the angle ~ (5/30) * 2pi radians
//             let rotate_angle = global_clock.elapsedTime * Math.PI / 30

//             let initial_enemy_position, initial_enemy_rotation;
//             if (last_initial_position) {
//                 // we start from this position, and then rotate it. MaxTODO: we can just get that transform and apply it
//                 // note: we can only rotate the vector in 2d using this way
//                 let vector_to_rotate = new THREE.Vector2(last_initial_position.y, last_initial_position.z)
//                 vector_to_rotate.rotateAround(origin, rotate_angle)
//                 initial_enemy_position = new THREE.Vector3(x_position, vector_to_rotate.x, vector_to_rotate.y)
//             } else {
//                 initial_enemy_position = new THREE.Vector3(x_position, 0, z_position)
//             }

//             if (last_initial_rotation) {
//                 initial_enemy_rotation = new THREE.Vector3(last_initial_rotation.x, 
//                                                             last_initial_rotation.y,
//                                                             last_initial_rotation.z);
//             } else {
//                 // MaxTODO Y needs to be some ratio of x/r and use sine and cosine to have it tilt on the earth
//                 // depending on the position (-1, 0, or 1) for the lanes
//                 // this also means we have to move the position down a bit for the curve.
//                 initial_enemy_rotation = new THREE.Vector3(0, radians, 0);
//             }

//             last_initial_rotation = initial_enemy_rotation.clone()
//             last_initial_position = initial_enemy_position.clone()
//             last_enemy = add_enemy_to_earth(initial_enemy_position, initial_enemy_rotation)
//             already_added_enemy = true
//         } else if (!mod_5) {
//             already_added_enemy = false
//         }
//         return {already_added_enemy, last_initial_position, last_initial_rotation, last_enemy, finished: false}
//     }
//     let updater = new Updater(add_enemy_every_5_seconds, {})
//     global_updates_queue.push(updater)
// }

function spawn_enemies() {
    function add_enemy_every_5_seconds({already_added_enemy, last_initial_position, last_initial_rotation, last_enemy}) {
        let mod_5 = Math.floor(global_clock.elapsedTime) % 5 === 0
        if (mod_5 && !already_added_enemy) {
            // TODO: figure out why 125 is fine
            let initial_enemy_position = earth.worldToLocal(new THREE.Vector3(0, -35, -115))
            let initial_enemy_rotation = new THREE.Quaternion();
            
            // earth.getWorldQuaternion(initial_enemy_rotation)
            last_enemy = add_enemy_to_earth(initial_enemy_position, initial_enemy_rotation)
            already_added_enemy = true
        } else if (!mod_5) {
            already_added_enemy = false
        }
        return {already_added_enemy, last_initial_position, last_initial_rotation, last_enemy, finished: false}
    }
    let updater = new Updater(add_enemy_every_5_seconds, {})
    global_updates_queue.push(updater)
}

function add_enemy_to_earth(position, rotation){
    let enemy = new THREE.Mesh(
        // new THREE.PlaneGeometry(100, 80, 10, 10),
        new THREE.BoxGeometry( 10, 10, 10 ),
        new THREE.MeshStandardMaterial({
            color: 0xeb4034,
        })
    );
    // console.log(position, rotation)
    earth.add(enemy)  // we add the enemy first to get it into earth's relative units
    enemy.rotateX(-earth.rotation.x)
    console.log(enemy.rotation)
    enemy.position.x = position.x
    enemy.position.y = position.y
    enemy.position.z = position.z
    // enemy.rotateY(rotation.y)
    // enemy.rotateZ(rotation.z)
    function craig({enemy, initial_time}) {
        if (global_clock.elapsedTime - initial_time > 10) {
            console.log('deleting enemy')
            return {enemy, finished: true, to_delete: [enemy]}
        }
        return {enemy, finished: false, initial_time: initial_time}
    }
    
    let updater = new Updater(craig, {enemy: enemy, finished: false, initial_time: global_clock.elapsedTime})
    global_updates_queue.push(updater)

    enemy.dispose = () => {scene.remove(enemy)}
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
class Projectile extends THREE.Object3D {
    constructor(geometry, material, initial_pos, velocity, onclick) {
        super();
        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.position.x = initial_pos.x
        this.mesh.position.y = initial_pos.y
        this.mesh.position.z = initial_pos.z
        this.velocity = velocity
        this.mesh.onclick = onclick
    }

    dispose() {
        scene.remove(this.mesh);
    }
}

var sphere_geometry = new THREE.SphereGeometry( 5, 10, 10 );
var toon_material = new THREE.MeshToonMaterial({color: 0xffff00})

function fire_player_weapon(){
    const initial_pos = new THREE.Vector3(0, 20, 0);
    // const velocity = new THREE.Vector3(0, 5, 5);
    console.log(mouse_ray)
    const velocity = mouse_ray.ray.direction.clone().multiplyScalar(8);
    const onclick = (projectile) => {
        projectile.mesh.material.color.set('#eb4034')
    }
    let projectile = new Projectile(sphere_geometry, toon_material, initial_pos, velocity, onclick)
    scene.add(projectile.mesh)
    let updater = new Updater(blast_projectile, {projectile: projectile})
    global_updates_queue.push(updater)
}

function fire_enemy_projectile(){
    const initial_pos = new THREE.Vector3(0, 20, -200);
    const velocity = new THREE.Vector3(0, 5, 5);
    const onclick = (projectile) => {
        projectile.mesh.material.color.set('#eb4034')
    }
    let projectile = new Projectile(sphere_geometry, toon_material, initial_pos, velocity, onclick)
    scene.add(projectile.mesh)
    let updater = new Updater(blast_projectile, {projectile: projectile})
    global_updates_queue.push(updater)
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
    let finished = true;
    if (total_time < 100 && mesh.position.z < 100 && mesh.position.y > -100) {
        finished = false;
    } else {
        return {finished, to_delete: [projectile]}
    }
    return {projectile, total_time, finished, initial_time}
}
