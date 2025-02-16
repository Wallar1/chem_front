import * as THREE from 'three';
import {store} from './store.js';
import { Updater, check_collisions } from './objects.js';


export function inialize_axe(){
    store.axe = new Axe();
    store.axe.mesh.position.set(0, 50, -50)
    store.axe.mesh.rotateX(-Math.PI/4)
    store.camera.add(store.axe)
    store.axe.position.set(20, 0, 0)
}


var audio1 = new Audio('https://chem-game.s3.amazonaws.com/sounds/Digging A 10.wav');
var audio2 = new Audio('https://chem-game.s3.amazonaws.com/sounds/Digging A 04.wav')
var last_played_axe_hit = audio2;

const axe_geometry = new THREE.CylinderGeometry( 5, 5, 100, 10 );
const axe_material = new THREE.MeshToonMaterial( {color: 0x7a5930} );

export class Axe extends THREE.Object3D {
    constructor() {
        super();
        this.mesh = new THREE.Mesh(axe_geometry, axe_material);
        this.add(this.mesh);
        this.is_swinging = false;
    }

    check_collisions(collision_elements) {
        return check_collisions(this.mesh, collision_elements)
    }

    try_to_swing() {
        if (!this.is_swinging) {
            let swing_axe_updater = new Updater(this.swing_axe(), {finished: false, total_radians: 0, direction: -1, has_collided: false})
            store.global_updates_queue.push(swing_axe_updater)
        }
    }

    swing_axe() {
        return (state, time_delta) => {
            let {total_radians, finished, direction, has_collided} = state
            this.is_swinging = true;
            let change_direction = false;
        
            const speed_multiplier = 3;
            let radians = speed_multiplier * Math.PI * time_delta;
        
            if (total_radians + radians >= Math.PI) {
                finished = true;
                radians = Math.PI - total_radians;
                total_radians = Math.PI;
            } else if (total_radians < Math.PI/2 && total_radians + radians >= Math.PI/2) {
                radians = Math.PI/2 - total_radians;
                change_direction = true;
                total_radians = Math.PI/2;
            } else {
                total_radians += radians;
            }
            let axis = new THREE.Vector3(1, 0, 0)
        
            let quaternion = new THREE.Quaternion().setFromAxisAngle(axis, radians * direction)
            store.axe.quaternion.premultiply(quaternion)
            store.axe.updateMatrixWorld(true)
        
            if (!has_collided) {
                let collisions = store.axe.check_collisions(store.mines);
                for (let i=0; i<collisions.length; i++) {
                    let mine = collisions[i];
                    mine.collide(store.axe);
                    has_collided = true;
                    // alternate the axe hit sounds
                    if (last_played_axe_hit === audio2) {
                        audio1.fastSeek(0)
                        audio1.play()
                        last_played_axe_hit = audio1;
                    } else {
                        audio2.fastSeek(0)
                        audio2.play()
                        last_played_axe_hit = audio2;
                    }
                }
            }
        
            if (finished) {
                this.is_swinging = false
            }
            if (change_direction) {
                direction = 1;
            }
            return {total_radians, finished, direction, has_collided}
        }
    }

    // check_collisions(collision_elements) {
    //     const mine_box = new THREE.Box3();
    //     const axe_box = new THREE.Box3();
    //     axe_box.setFromObject(this.mesh);
    //     let collisions = [];
    //     for (let i = 0; i < collision_elements.length; i++) {
    //         let obj = collision_elements[i];
    //         mine_box.setFromObject(obj.mesh)
    //         if (axe_box.intersectsBox(mine_box)) {
    //             collisions.push(obj);
    //         }
    //     }
    //     return collisions;
    // }

    // collide(collided_obj) {
    //     let added_amount = Math.floor(collided_obj.damage / 10);
    //     let curr_el_cnts = get(current_element_counts)
    //     if (curr_el_cnts[this.element]) {
    //         curr_el_cnts[this.element] += added_amount;
    //     } else {
    //         curr_el_cnts[this.element] = added_amount;
    //     }
    //     current_element_counts.set(curr_el_cnts)
    // }
}

// TODO: is this good? Since axe is an object3d, maybe i dont need it to have a proxy
// function create_axe(arg_dict) {
//     let axe = new Axe(arg_dict)
//     let proxy = new Proxy(axe, proxy_handler('mesh'));
//     // proxy.position.copy(arg_dict['position'])
//     return proxy
// }