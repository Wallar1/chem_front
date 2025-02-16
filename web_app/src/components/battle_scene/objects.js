import * as THREE from 'three';

import { get } from 'svelte/store';

import { text_look_at } from '../../helper_functions.js';
import { store } from './store.js';


function get_all_properties(obj) {
    let result = []
    do {
        result.push(...Object.getOwnPropertyNames(obj))
    } while ((obj = Object.getPrototypeOf(obj)))
    return result;
}

function proxy_handler(pass_through_obj_name){
    /*
    Pass_through_obj_name (ex: mesh) is the name of the property/obj that is called when a property isnt found 
    */
    return {
        get(target, property) {
            if (get_all_properties(target).indexOf(property) > -1) {
                return target[property]
            } else {
                return target[pass_through_obj_name][property]
            }
        },
        set(target, property, value) {
            if (get_all_properties(target).indexOf(property) > -1) {
                return Reflect.set(target, property, value);
            } else {
                return Reflect.set(target[pass_through_obj_name], property, value);
            }
        }
    }
};

/*
we check if the box of the obj intersects with the boxes of the possible_collision_objs.
The obj would be Object3D, and possible collision objs should atleast have a mesh
*/
function check_collisions(obj, possible_collision_objs) {
    const obj_box = new THREE.Box3();
    const possible_collision_box = new THREE.Box3();
    obj_box.setFromObject(obj);
    let collisions = [];
    let is_mesh = possible_collision_objs[0] instanceof THREE.Object3D;
    for (let i = 0; i < possible_collision_objs.length; i++) {
        let possible_collision_obj = possible_collision_objs[i];
        if (!is_mesh) {
            possible_collision_obj = possible_collision_obj.mesh;
        }
        possible_collision_box.setFromObject(possible_collision_obj)
        if (obj_box.intersectsBox(possible_collision_box)) {
            collisions.push(possible_collision_objs[i]);  // push the original object, not the mesh
        }
    }
    return collisions;
}


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

class GameObj {
    add_to(parent) {
        this.parent = parent;
        parent.add(this.mesh)
    }

    dispose() {
        this.parent.remove(this.mesh);
        this.collider = null;
        this.mesh.remove(this.label)
    }

    keepTextRotatedWithCamera() {
        const self = this;
        const look_at_camera_helper = (state, time_delta) => {
            if (!self.mesh.text) return {finished: false}
            if (!self.mesh.text.centered_text) {
                // centers the text
                self.mesh.text.position.x = -1 * self.mesh.text.geometry.boundingSphere.radius;
                self.mesh.text.centered_text = true;
            }
            const cameraWorldPosition = store.camera.getWorldPosition(new THREE.Vector3())
            text_look_at(self.mesh.text.parent, cameraWorldPosition);
            return {finished: false}
        }
        let updater = new Updater(look_at_camera_helper, {finished: false});
        store.global_updates_queue.push(updater);
    }
}




class Test {
    constructor() {}

    classfunc() {
        c = Object.getPrototypeOf(this).constructor
        return new c()
    }
    
    classfunc2() {
        return new Test()
    }
}



export {
    Updater,
    GameObj,
    get_all_properties,
    proxy_handler,
    check_collisions,
};
