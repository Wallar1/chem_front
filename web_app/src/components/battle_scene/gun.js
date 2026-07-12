import * as THREE from 'three';
import { get } from 'svelte/store';
import { store } from './store.js';
import { Updater } from './objects.js';
import { create_projectile, blast_projectile } from './projectile.js';
import { parse_formula_to_dict } from '../../helper_functions.js';
import { has_upgrade, UPGRADE_IDS } from '../../upgrades.js';


const MUZZLE_LOCAL_POS = new THREE.Vector3(0, -20, 0);
const CHARGE_INDICATOR_BASE_RADIUS = 2.5;

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

    const charge_geometry = new THREE.SphereGeometry(CHARGE_INDICATOR_BASE_RADIUS, 24, 16);
    const charge_material = new THREE.MeshBasicMaterial({
        color: 0x7cf0ff,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
    });
    store.charge_indicator = new THREE.Mesh(charge_geometry, charge_material);
    store.charge_indicator.position.copy(MUZZLE_LOCAL_POS);
    store.charge_indicator.visible = false;
    store.gun.add(store.charge_indicator);
    store._charge_updater = null;
}

export function start_flask_charge_indicator() {
    if (!store.charge_indicator) return;
    if (store._charge_updater) {
        store._charge_updater.state.active = false;
        store._charge_updater = null;
    }
    store.charge_indicator.visible = true;
    store.charge_indicator.scale.setScalar(1);
    store.charge_indicator.material.opacity = 0.35;

    const updater = new Updater((state) => {
        if (!state.active || !store.charge_indicator) {
            return { finished: true };
        }
        const charge = Math.min(1, (performance.now() - state.started_at) / 1000);
        // Matches projectile growth: diameter 1x → 2x
        store.charge_indicator.scale.setScalar(1 + charge);
        store.charge_indicator.material.opacity = 0.35 + charge * 0.4;
        return state;
    }, {
        finished: false,
        active: true,
        started_at: performance.now(),
    });
    store._charge_updater = updater;
    store.global_updates_queue.push(updater);
}

export function stop_flask_charge_indicator() {
    if (store._charge_updater) {
        store._charge_updater.state.active = false;
        store._charge_updater = null;
    }
    if (store.charge_indicator) {
        store.charge_indicator.visible = false;
        store.charge_indicator.scale.setScalar(1);
    }
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


function get_shot_directions(base_direction) {
    if (!has_upgrade(UPGRADE_IDS.SEPARATING_FUNNEL)) {
        return [base_direction.clone()];
    }

    const up = store.camera.up.clone().normalize();
    const split_radians = THREE.MathUtils.degToRad(1);
    const left = base_direction.clone().applyAxisAngle(up, split_radians).normalize();
    const right = base_direction.clone().applyAxisAngle(up, -split_radians).normalize();
    return [left, right];
}


function spawn_projectile({compound, initial_pos, direction, lateral_offset, size_mult, damage_mult}) {
    const onclick = () => {};
    const params = {'parent': store.scene, initial_pos, onclick};
    const projectile = create_projectile(compound, params);
    projectile.damage *= damage_mult;
    if (store.lab_effects['chemical'] > 0) {
        projectile.damage *= 2;
    }
    projectile.mesh.scale.setScalar(size_mult);
    if (lateral_offset) {
        projectile.mesh.position.add(lateral_offset);
    }
    store.scene.add(projectile.mesh);
    const initial_time = store.global_clock.elapsedTime;
    const updater = new Updater(blast_projectile, {
        projectile,
        initial_time,
        direction: direction.clone(),
    });
    store.global_updates_queue.push(updater);
}


/**
 * @param {string} compound
 * @param {{ charge?: number }} [options] charge in [0, 1]; only used with Erlenmeyer Flask
 */
export function try_to_fire_player_weapon(compound, options = {}){
    const charge = Math.min(1, Math.max(0, options.charge ?? 0));
    const has_flask = has_upgrade(UPGRADE_IDS.ERLENMEYER_FLASK);
    const size_mult = has_flask ? 1 + charge : 1;
    const damage_mult = has_flask ? 1 + charge : 1;

    const initial_pos = store.gun.localToWorld(MUZZLE_LOCAL_POS.clone());
    stop_flask_charge_indicator();
    const weapon_will_fire = check_if_weapon_can_fire_and_get_new_counts(compound);
    if (!weapon_will_fire) return;

    const base_direction = store.camera.getWorldDirection(new THREE.Vector3()).normalize();
    const directions = get_shot_directions(base_direction);
    const right = new THREE.Vector3().crossVectors(base_direction, store.camera.up).normalize();
    const split_spacing = Math.max(1.2, (projectile_base_radius(compound) * size_mult) * 0.9);

    directions.forEach((direction, index) => {
        let lateral_offset = null;
        if (directions.length > 1) {
            const side = index === 0 ? -1 : 1;
            lateral_offset = right.clone().multiplyScalar(side * split_spacing * 0.5);
        }
        spawn_projectile({
            compound,
            initial_pos: initial_pos.clone(),
            direction,
            lateral_offset,
            size_mult,
            damage_mult,
        });
    });

    play_gun_animation()
}


function projectile_base_radius(compound) {
    const radii = { H2: 2, CH4: 4, NH3: 5, CN: 3, H2O: 5 };
    return radii[compound] ?? 3;
}


const gun_sound = new Audio('https://chem-game.s3.amazonaws.com/sounds/bloop.mp3')
function play_gun_animation() {
    gun_sound.fastSeek(0);
    gun_sound.play();
    // const gun_recoil_helper = (state, time_delta) => {
        
    // }
}
