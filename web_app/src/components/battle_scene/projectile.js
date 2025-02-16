import * as THREE from 'three';

import { Updater, check_collisions, GameObj, proxy_handler } from './objects';
import { store } from './store.js';
import { projectile_material_map, formula_to_damage_dict } from '../../compounds.js';
import { earth_radius, burn_duration, burn_pulse_damage, stun_time } from './constants.js';


var size = new THREE.Vector3(50, 50, 50)
var box = new THREE.Box3(size.negate(), size)
class ProjectileBase extends GameObj {
    constructor({geometry, material, initial_pos, velocity, onclick}) {
        super();
        this.mesh = new THREE.Mesh(geometry, material)
        this.velocity = velocity
        this.mesh.onclick = onclick
        this.radius = geometry.parameters.radius;
        // this.collider = new THREE.Sphere(initial_pos, this.radius);
        this.health_impact = 20;
    }

    check_collisions(collision_elements) {
        return check_collisions(this.mesh, collision_elements)
    }

    // check_collisions(collision_elements) {
    //     let collided_objs = []
    //     collision_elements.forEach(obj => {
    //         let length = this.mesh.getWorldPosition(new THREE.Vector3()).distanceTo(obj.mesh.getWorldPosition(new THREE.Vector3()))
    //         // console.log(length, this.radius + 50)
    //         if (length < this.radius + 50) { // 50 is the radius of the enemy
    //             console.log('collision')
    //             collided_objs.push(obj);
    //         }
    //     })
    //     // let world_pos = new THREE.Vector3();
    //     // let pos_in_world = new THREE.Vector3();
    //     // let collided_objs = []
    //     // this.collider.set(this.mesh.position, this.radius)
    //     // collision_elements.forEach(obj => {
    //     //     // obj.getWorldPosition(pos_in_world);
    //     //     // obj.collider.setFromCenterAndSize(pos_in_world, size)
    //     //     console.log(obj.mesh)
    //     //     box.setFromObject(obj.mesh)
    //     //     console.log(box.clone())
    //     //     if (this.collider.intersectsBox(box)) {
    //     //         collided_objs = [obj];
    //     //         return  // this just returns out of the foreach
    //     //     }
    //     //     // else if (obj.collision_sphere) {
    //     //     //     obj.mesh.getWorldPosition(world_pos);
    //     //     //     obj.collision_sphere.set(world_pos, obj.radius)
    //     //     //     if (obj.collision_sphere.intersectsSphere(projectile.collision_sphere)) {
    //     //     //         collided_objs = [obj];
    //     //     //         return  // this just returns out of the foreach
    //     //     //     }
    //     //     // } else {
    //     //     //     console.log('did we set another type of collider shape?')
    //     //     // }
    //     // })
    //     return collided_objs
    // }
}


export function blast_projectile(state, time_delta){
    let {projectile, total_time, initial_time, direction} = state
    if (!projectile) {
        console.log(state)
    }
    if (!total_time) total_time = 1;
    let mesh = projectile.mesh

    total_time = store.global_clock.elapsedTime - initial_time;

    const earth_world_pos = store.earth.getWorldPosition(new THREE.Vector3())
    const mesh_world_pos = mesh.getWorldPosition(new THREE.Vector3())
    let world_vec_to_earth = new THREE.Vector3().subVectors(earth_world_pos, mesh_world_pos)
    let below_earth = world_vec_to_earth.length() < earth_radius - 50;
    if (below_earth || total_time > 2) {
        return {finished: true, to_delete: [projectile]}
    }
    const gravity = mesh.parent.worldToLocal(world_vec_to_earth.normalize()).multiplyScalar(time_delta * 7)
    direction = direction.normalize().multiplyScalar(time_delta * 100 * Math.pow(total_time, 5) + 20).add(gravity)
    mesh.position.add(direction)

    let collisions = projectile.check_collisions(store.enemies);
    collisions.forEach(collided_obj => {
        collided_obj.collide(projectile);
        if (store.lab_effects['electrical'] > 0) {
            const stun_update_helper = (state, time_delta) => {
                let {total_time} = state;
                total_time += time_delta;
                if (total_time >= stun_time) {
                    collided_obj.movement_updater.state.stunned = false;
                    return {finished: true}
                }
                collided_obj.movement_updater.state.stunned = true;
                return {finished: false, projectile, total_time: total_time}
            }
            let stun_updater = new Updater(stun_update_helper, {finished: false, total_time: 0})
            store.global_updates_queue.push(stun_updater)
        }
        if (store.lab_effects['thermal'] > 0) {
            const burn_update_helper = (state, time_delta) => {
                let {pulses_remaining, total_time} = state;
                total_time += time_delta;
                let damage_pulses = pulses_remaining.filter(pulse => total_time >= pulse)
                pulses_remaining = pulses_remaining.filter(pulse => total_time < pulse)
                for (let i=0; i<damage_pulses.length; i++) {
                    collided_obj.take_damage(burn_pulse_damage);
                }

                if (pulses_remaining.length === 0 | collided_obj.should_delete) {
                    return {finished: true}
                }
                return {finished: false, projectile, total_time: total_time, pulses_remaining: pulses_remaining}
            }
            const pulses_remaining = Array.from({ length: burn_duration }, (val, idx) => idx + 1);
            let burn_updater = new Updater(burn_update_helper, {finished: false, total_time: 0, pulses_remaining: pulses_remaining})
            store.global_updates_queue.push(burn_updater)
        }
    });

    if (collisions.length) {
        return {finished: true, to_delete: [projectile]}
    }
    return {projectile, total_time, finished: false, initial_time, direction}
}


export class Projectile extends ProjectileBase {
    constructor({formula, initial_pos, velocity, onclick}) {
        let geometry = projectile_material_map[formula]['geometry']
        let material = projectile_material_map[formula]['material']
        super({geometry, material, initial_pos, velocity, onclick})
        this.formula = formula
    }

    toString () {
        string = `${this.name} (${this.formula}): ${this.damage} damage. \n\tEffects: `
        for (effect in this.effects) {
            string += "\n\t\t"
            string += effect.toString()
        }
        return string
    }
}

{/* <div class='button'>H2</div>
		<div class='button'>CH4</div>
		<div class='button'>NH3</div>
		<div class='button'>CN</div>
		<div class='button'>H2O</div> */}


class HydrogenGas extends Projectile {
    constructor({initial_pos, velocity, onclick}) {
        let formula = 'H2'
        super({formula, initial_pos, velocity, onclick})
        this.name = 'Hydrogen Gas'
        this.damage = formula_to_damage_dict[this.formula]
        this.effects = []
    }
}

class Methane extends Projectile {
    constructor({initial_pos, velocity, onclick}) {
        let formula = 'CH4'
        super({formula, initial_pos, velocity, onclick})
        this.name = 'Methane'
        this.damage = formula_to_damage_dict[this.formula]
        this.effects = []
    }
}

class Ammonia extends Projectile {
    constructor({initial_pos, velocity, onclick}) {
        let formula = 'NH3'
        super({formula, initial_pos, velocity, onclick})
        this.name = 'Ammonia'
        this.damage = formula_to_damage_dict[this.formula]
        this.effects = []
    }
}

class Cyanide extends Projectile {
    constructor({initial_pos, velocity, onclick}) {
        let formula = 'CN'
        super({formula, initial_pos, velocity, onclick})
        this.name = 'Cyanide'
        this.damage = formula_to_damage_dict[this.formula]
        this.effects = []
    }
}

class Water extends Projectile {
    constructor({initial_pos, velocity, onclick}) {
        let formula = 'H2O'
        super({formula, initial_pos, velocity, onclick})
        this.name = 'Water'
        this.damage = formula_to_damage_dict[this.formula]
        this.effects = []
    }
}

const compound_name_to_class = {
    'H2': HydrogenGas,
    'CH4': Methane,
    'NH3': Ammonia,
    'CN': Cyanide,
    'H2O': Water,
}

export function create_projectile(compound_name, arg_dict) {
    let klass = compound_name_to_class[compound_name]
    let projectile = new klass(arg_dict)
    let proxy = new Proxy(projectile, proxy_handler('mesh'))
    proxy.position.copy(arg_dict['initial_pos'])
    return proxy
}

function poison({dmg, enemy, framerate, initial_time, total_time, seconds_between_poison, number_of_ticks}) {
    if (!initial_time) initial_time = store.global_clock.elapsedTime
    if (!total_time) total_time = 0;
    total_time += store.global_clock.elapsedTime - initial_time;
    let half_frame_rate = framerate / 2
    let should_tick = Math.round((total_time * half_frame_rate) % (seconds_between_poison * half_frame_rate)) === 0
    if (should_tick) {
        enemy.take_damage(dmg)
        number_of_ticks -= 1
        initial_time = total_time
    }
    let finished = false;
    if (number_of_ticks <= 0) {
        finished = true
        return {finished}
    }
    return {dmg, enemy, framerate, initial_time, total_time, seconds_between_poison, number_of_ticks}
}