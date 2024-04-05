import * as THREE from 'three';
import { get } from 'svelte/store';

// import {Updater, add_to_global_updates_queue} from '../../objects.js';
import { game_state, GameStates, global_updates_queue } from '../../stores.js';
import { dispose_renderer, dispose_scene } from '../../helper_functions.js';


var global_clock,
    time_delta,
    scene,
    renderer,
    camera,
    mouse_ray,
    mouse,
    stats;


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
        const canvas_container = document.getElementById('canvas-container')
        canvas_container.appendChild(renderer.domElement);

        scene = new THREE.Scene()

        this.directional_light = create_directional_light();
        scene.add(this.directional_light);
        this.ambient_light = new THREE.AmbientLight(0xFFFFFF, 0.25);
        scene.add(this.ambient_light);
    
        mouse_ray.setFromCamera( mouse, camera );

        renderer.render(scene, camera);
        spawn_objects()
    }

    add_event_listeners(){
        window.addEventListener('resize', resize_window, false);
        window.addEventListener('mousemove', on_mouse_move, false)
        window.addEventListener('click', on_mouse_click, false)
        window.addEventListener('keydown', handle_keydown)
        document.addEventListener('keyup', handle_keyup)
    }

    remove_event_listeners(){
        window.removeEventListener('resize', resize_window, false);
        window.removeEventListener('mousemove', on_mouse_move, false)
        window.removeEventListener('click', on_mouse_click, false)
        window.removeEventListener('keydown', handle_keydown)
        document.removeEventListener('keyup', handle_keyup)
    }

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
            stats.end();
            global_updates_queue.set(next_updates)
        });
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


function on_mouse_move(event){
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}


function spawn_objects(){
}


function end_scene(){
    dispose_scene();
    dispose_renderer();
}