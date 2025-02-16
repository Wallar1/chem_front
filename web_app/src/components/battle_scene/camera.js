import * as THREE from 'three';
import { Updater } from './objects.js';
import { store } from './store.js';
import { 
    max_movement_speed, camera_offset, earth_radius,
    bottom_button,
    left_stick_left_right,
    left_stick_up_down,
    right_stick_left_right,
    right_stick_up_down,
} from './constants.js';
import { delete_lab } from './lab.js';
import { delete_cloud } from './mines_and_clouds.js';



function get_up_direction_rel_camera_parent(camera_parent, camera, earth) {
    let camera_position = camera_parent.worldToLocal(camera.getWorldPosition(new THREE.Vector3()))

    // TODO: we can probably just hardcode the earth position, since it doesnt move
    let earth_position = camera_parent.worldToLocal(earth.getWorldPosition(new THREE.Vector3()))

    return new THREE.Vector3().subVectors(earth_position, camera_position).normalize()
}


export function rotate_on_mouse_move(event) {
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    // mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    // mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    //TODO: check this at some point: https://web.dev/articles/disable-mouse-acceleration

    // the sensitivity is set so that the screen width/height is 180 degrees
    var movementX = event.movementX || event.mozMovementX || 0;
    var movementY = event.movementY || event.mozMovementY || 0;
    let ratio = window.innerWidth / window.innerHeight;
    
    let x_radians = movementX * Math.PI * ratio / window.innerWidth;
    let y_radians = movementY * Math.PI * ratio / window.innerHeight;
    rotate_camera(x_radians, y_radians)
}

export function rotate_on_controller_move(state, time_delta) {
    let event = {
        // TODO: make the multipliers settings that the player can adjust
        movementX: store.pushed_buttons['axes'][left_stick_left_right]['value'] * 20,
        movementY: store.pushed_buttons['axes'][left_stick_up_down]['value'] * -5,
    }
    rotate_on_mouse_move(event);
    return {finshed: false};
}

function rotate_camera(x_radians, y_radians) {
    /*
    Important note: an object's rotation/quaternion is relative to its parent. It is a local rotation.
    So here I get the vectors from the point of view of the camera parent.
    */
    let current_direction_vector = store.camera_parent.worldToLocal(store.camera.getWorldDirection(new THREE.Vector3()).normalize())

    let up = get_up_direction_rel_camera_parent(store.camera_parent, store.camera, store.earth);
    let right = current_direction_vector.clone().cross(up).normalize();
    
    // Limit the tilt of the camera. When the up and current_direction_vector are parallel,
    // it makes the cross product weird, so we avoid that by limiting how far the camera can tilt
    let tilt_limit = Math.PI / 12; // 15 degrees in radians
    let angle_between = current_direction_vector.angleTo(up);

    if (!((y_radians < 0 && Math.PI + y_radians - angle_between + y_radians < tilt_limit) || 
            (y_radians > 0 && angle_between - y_radians < tilt_limit))) {
        let quaternionY = new THREE.Quaternion().setFromAxisAngle(right, y_radians);
        store.camera.quaternion.premultiply(quaternionY).normalize();
    }

    let quaternionX = new THREE.Quaternion().setFromAxisAngle(up, x_radians);
    store.camera.quaternion.premultiply(quaternionX).normalize();

    store.camera.updateMatrixWorld(true)
    store.mouse_ray.setFromCamera( store.mouse, store.camera );
}


export function create_camera(){
    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 5000.0;
    store.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    store.camera_parent = new THREE.Object3D();
    store.earth.add(store.camera_parent);
    store.camera_parent.position.set(0, 0, 0);
    store.camera_parent.add(store.camera);
    store.camera.position.set(0, 0, earth_radius + camera_offset);
    store.camera.rotateX(Math.PI/2);
}

function movement_curve(x) {
    // The goal of this function is to make the movement speed increase logarithmically.
    // Initially you move quickly and then it plateaus
    // TODO: optimize this
    let ret = Math.max(0, 3 * Math.log10(x) + 3)
    return ret;
}



export function move_camera(state, time_delta) {
    let movement_vector_rel_camera = new THREE.Vector3(0, 0, 0);
    for (const axis of [right_stick_left_right, right_stick_up_down]) {
        let value = store.pushed_buttons['axes'][axis]['value'];
        let direction;
        if (Math.abs(value) < 0.00001) {
            continue;
        } else if (value < 0) {
            direction = store.pushed_buttons['axes'][axis]['direction'][0];
        } else {
            direction = store.pushed_buttons['axes'][axis]['direction'][1];
        }
        let added_direction = direction.clone().multiplyScalar(Math.abs(value) * 10);
        movement_vector_rel_camera.add(added_direction)
    }
    // movement_keys.forEach(key => {
    //     if (store.pressed_keys[key]['pressed']) {
    //         let movement_force_scalar = movement_curve(store.pressed_keys[key]['pressed'])
    //         let added_direction = store.pressed_keys[key]['direction'].clone().multiplyScalar(movement_force_scalar)
    //         movement_vector_rel_camera.add(added_direction)
    //     }
    // })

    const earth_world_pos = store.earth.getWorldPosition(new THREE.Vector3())
    const camera_world_pos = store.camera.getWorldPosition(new THREE.Vector3())
    let up_rel_parent = new THREE.Vector3().subVectors(earth_world_pos, camera_world_pos).normalize()
    store.current_direction_vector.add(movement_vector_rel_camera)
    const current_dir_to_world = store.camera.localToWorld(store.current_direction_vector.clone())
    let movement_rel_parent = new THREE.Vector3().subVectors(current_dir_to_world, camera_world_pos).normalize()
    let rotation_axis = movement_rel_parent.clone().cross(up_rel_parent).normalize()

    let len = store.current_direction_vector.length()
    if (len > 1) {
        let drag = store.current_direction_vector.clone().normalize().multiplyScalar(len/5)
        store.current_direction_vector.sub(drag)
    } else {
        store.current_direction_vector.set(0, 0, 0)
    }
    let _max_movement_speed = store.lab_effects['kinetic'] > 0 ? max_movement_speed * 2 : max_movement_speed;
    let movement_speed = Math.min(store.current_direction_vector.length(), _max_movement_speed)

    // TODO: use slerp somehow
    let radians = Math.PI * movement_speed * time_delta / 180;
    if (radians > 0) {
        let quaternion = new THREE.Quaternion().setFromAxisAngle(rotation_axis, radians)
        store.camera_parent.quaternion.premultiply(quaternion);
        store.camera_parent.updateMatrixWorld(true)
    }
    return {finished: false}
}


function jump_curve(x) {
    // A jump will last pi/3 seconds
    return Math.sin(3*x)
}

export function jump(state, time_delta) {
    function jump_helper(func_state, func_time_delta){
        let {finished, initial_time, has_collided} = func_state
        store.camera.position.z = earth_radius + camera_offset + jump_curve(store.global_clock.elapsedTime - initial_time) * 150;
        // if (!has_collided) {
        //     has_collided = check_camera_intersects(clouds, 'cloud') | check_camera_intersects(labs, 'lab');
        // }
        has_collided = check_camera_intersects(store.clouds, 'cloud') | check_camera_intersects(store.labs, 'lab');

        if (store.global_clock.elapsedTime - initial_time > Math.PI/3) {
            finished = true
            store.pushed_buttons['buttons'][bottom_button]['pressed'] = 0;
        }
        return {finished, initial_time, has_collided}
    }
    let jump_updater = new Updater(jump_helper, {initial_time: store.global_clock.elapsedTime, finished: false, has_collided: false})
    store.global_updates_queue.push(jump_updater)
}

export function check_camera_intersects(array_of_possible_intersections, type_of_obj) {
    let camera_world_position = store.camera.getWorldPosition(new THREE.Vector3())
    const camera_box = new THREE.Box3().setFromCenterAndSize(camera_world_position, new THREE.Vector3(100, 100, 100))
    const box = new THREE.Box3()
    let has_collided = false;
    for (let i=0; i<array_of_possible_intersections.length; i++) {
        let possible_intersected_obj = array_of_possible_intersections[i]
        box.setFromObject(possible_intersected_obj.mesh)
        if (camera_box.intersectsBox(box)) {
            possible_intersected_obj.collide()
            has_collided = true;
            console.log(type_of_obj)
            if (type_of_obj === 'lab') {
                delete_lab(possible_intersected_obj)
            } else if (type_of_obj === 'cloud') {
                delete_cloud(possible_intersected_obj)
            }
        }
    }
    return has_collided;
}