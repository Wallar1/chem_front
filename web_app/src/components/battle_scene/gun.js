import * as THREE from 'three';
import { get } from 'svelte/store';
import { store } from './store.js';
import { Updater } from './objects.js';
import { create_projectile, blast_projectile } from './projectile.js';
import { parse_formula_to_dict } from '../../helper_functions.js';



export function create_gun(){
    const gun_geometry = new THREE.CylinderGeometry( 1, 1, 5, 10 );
    const gun_material = new THREE.MeshToonMaterial( {color: 0x737373} );
    const gun_mesh = new THREE.Mesh( gun_geometry, gun_material );
    store.gun = new THREE.Object3D();
    store.gun.add(gun_mesh)
    store.camera.add(store.gun)
    store.gun.position.set(-10, 0, -5)
    store.gun.rotateX(Math.PI/2)
    gun_mesh.position.set(5, 0, 0)
}


function check_if_weapon_can_fire_and_get_new_counts(compound) {
    let element_counts = get(store.current_element_counts)
    let entries = Object.entries(parse_formula_to_dict(compound));
    for (let i=0; i<entries.length; i++) {
        let [element, count_needed] = entries[i];
        if (element_counts[element] === undefined || element_counts[element]['count'] - count_needed < 0) {
            return false
        }
        element_counts[element]['count'] = element_counts[element]['count'] - count_needed
    }

    for (let i=0; i<Object.keys(element_counts).length; i++) {
        let element = Object.keys(element_counts)[i];
        store.current_element_counts.set(element, element_counts[element]['count'])
        console.log(get(store.current_element_counts))
    }
    return true
}



export function try_to_fire_player_weapon(compound){
    const initial_pos = store.gun.localToWorld(new THREE.Vector3(0, -20, 0));

    const onclick = (target) => {
        // this is just a POC. It doesnt work because all of the projectiles use the same material
        // target.object.material.color.set('#eb4034')
    }
    let params = {'parent': store.scene, initial_pos, onclick}
    let weapon_will_fire = check_if_weapon_can_fire_and_get_new_counts(compound);
    if (!weapon_will_fire) return;
    let projectile = create_projectile(compound, params)
    if (store.lab_effects['chemical'] > 0) {
        projectile.damage *= 2;
    }
    store.scene.add(projectile.mesh)
    let initial_time = store.global_clock.elapsedTime
    let direction = store.camera.getWorldDirection(new THREE.Vector3())
    let updater = new Updater(blast_projectile, {projectile: projectile, initial_time, direction})
    store.global_updates_queue.push(updater)

    play_gun_animation()
}


const gun_sound = new Audio('https://chem-game.s3.amazonaws.com/sounds/bloop.mp3')
function play_gun_animation() {
    gun_sound.fastSeek(0);
    gun_sound.play();
    // const gun_recoil_helper = (state, time_delta) => {
        
    // }
}