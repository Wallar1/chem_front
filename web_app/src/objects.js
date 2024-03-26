import * as THREE from 'three';
import { get } from 'svelte/store';

import { get_random_solid_element, get_random_gas_element, get_font_text_mesh } from './helper_functions';
import { current_element_counts } from './stores.js';


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


class GameObj {
    add(obj) {
        this.mesh.add(obj)
    }

    dispose() {
        this.parent.remove(this.mesh);
        this.collider = null;
        this.mesh.remove(this.label)
    }
}


var size = new THREE.Vector3(50, 50, 50)
var box = new THREE.Box3(size.negate(), size)
class Projectile extends GameObj {
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


const health_bar_material = new THREE.MeshToonMaterial( {color: 0x00ff00} );
let enemy_geometry = new THREE.BoxGeometry( 100, 100, 100 );
let enemy_material = new THREE.MeshStandardMaterial({color: 0xeb4034,});

class Enemy extends GameObj {
    constructor() {
        super();
        this.should_delete = false;
        this.mesh = new THREE.Mesh(enemy_geometry, enemy_material);
        let r = Math.ceil(Math.max(enemy_geometry.parameters.height, enemy_geometry.parameters.width) / 2);
        // this.collider = new THREE.Box3(new THREE.Vector3(-r, -r, -r), new THREE.Vector3(r, r, r));

        this.full_health = 100;
        this.health = 100;

        // we cant have a global health bar geometry because we need to scale it
        let health_bar_geometry = new THREE.CylinderGeometry( 10, 10, 100, 10 );
        this.health_bar = new THREE.Mesh( health_bar_geometry, health_bar_material );
        this.mesh.add(this.health_bar)
        this.health_bar.rotateZ(Math.PI/2)
        this.health_bar.position.z = -55;
    }

    add_to(parent) {
        this.parent = parent;
        parent.add(this.mesh)
    }

    initial_rotation() {
        // Otherwise the health bar is upside down
        this.rotateX(Math.PI);
        // this.forward = new THREE.Vector3(-1, 0, 0);
    }

    take_damage(dmg) {
        this.health -= dmg
        if (this.health <= 0) {
            this.should_delete = true;
            return
        }
        this.health_bar.scale.set(1, this.health/this.full_health, 1)
    }

    collide(collided_obj) {
        this.take_damage(collided_obj.damage)
    }

    check_collisions(collision_elements) {
        return check_collisions(this.mesh, collision_elements)
    }
}


function create_enemy(arg_dict) {
    let enemy = new Enemy(arg_dict)
    let proxy = new Proxy(enemy, proxy_handler('mesh'));
    // proxy.position.copy(arg_dict['position'])

    return proxy
}


// TODO: maybe also map to a geometry and z position, so we can make the water, mine, or cloud
const element_to_material = {
    'H': new THREE.MeshStandardMaterial({color: 0xffffff,}),
    'C': new THREE.MeshStandardMaterial({color: 0x000000,}),
    'N': new THREE.MeshStandardMaterial({color: 0x00cde8,}),
    'O': new THREE.MeshStandardMaterial({color: 0xffffff,}),
    'Au': new THREE.MeshStandardMaterial({color: 0xebd834,}),
}
const mine_geometry = new THREE.ConeGeometry( 50, 100, 32 );

function mine_or_cloud_onclick(element) {
    return () => {
        let added_amount = 1
        let curr_el_cnts = get(current_element_counts)
        if (curr_el_cnts[element]) {
            curr_el_cnts[element] += added_amount;
        } else {
            curr_el_cnts[element] = added_amount;
        }
        current_element_counts.set(curr_el_cnts)
    }   
}

class Mine extends GameObj {
    constructor() { 
        super();
        this.element = get_random_solid_element();;
        this.should_delete = false;
        this.mesh = new THREE.Mesh(mine_geometry, element_to_material[this.element]);
        this.mesh.onclick = mine_or_cloud_onclick(this.element)
        // let r = Math.ceil(Math.max(mine_geometry.parameters.height, mine_geometry.parameters.width));
        // this.collider = new THREE.Box3(new THREE.Vector3(-r, -r, -r), new THREE.Vector3(r, r, r));
        get_font_text_mesh(this.element, this)
    }

    add_to(parent) {
        this.parent = parent;
        parent.add(this.mesh)
    }

    initial_rotation() {
        // for some reason cones start sideways, so this flips them on their base
        this.rotateX(Math.PI/2);
    }

    collide() {
        // let added_amount = Math.floor(collided_obj.damage / 10);
        const added_amount = 5;
        let curr_el_cnts = get(current_element_counts)
        if (curr_el_cnts[this.element]) {
            curr_el_cnts[this.element] += added_amount;
        } else {
            curr_el_cnts[this.element] = added_amount;
        }
        current_element_counts.set(curr_el_cnts)
    }
}


function create_mine(arg_dict) {
    let mine = new Mine(arg_dict)
    let proxy = new Proxy(mine, proxy_handler('mesh'));
    // proxy.position.copy(arg_dict['position'])
    return proxy
}



const cloud_material = new THREE.MeshStandardMaterial({color: 0xffffff,});
const cloud_geometry = new THREE.SphereGeometry( 50, 20, 20 );

class Cloud extends GameObj {
    constructor() { 
        super();
        this.element = get_random_gas_element();;
        this.should_delete = false;
        this.mesh = new THREE.Mesh(cloud_geometry, cloud_material);
        this.mesh.onclick = mine_or_cloud_onclick(this.element)
        // let r = Math.ceil(Math.max(mine_geometry.parameters.height, mine_geometry.parameters.width));
        // this.collider = new THREE.Box3(new THREE.Vector3(-r, -r, -r), new THREE.Vector3(r, r, r));
        get_font_text_mesh(this.element, this)
    }

    add_to(parent) {
        this.parent = parent;
        parent.add(this.mesh)
    }

    collide(collided_obj) {
        // let added_amount = Math.floor(collided_obj.damage / 10);
        let added_amount = 10;
        let curr_el_cnts = get(current_element_counts)
        if (curr_el_cnts[this.element]) {
            curr_el_cnts[this.element] += added_amount;
        } else {
            curr_el_cnts[this.element] = added_amount;
        }
        current_element_counts.set(curr_el_cnts)
    }

    initial_rotation() {
        return;
    }
}


function create_cloud(arg_dict) {
    let cloud = new Cloud(arg_dict)
    let proxy = new Proxy(cloud, proxy_handler('mesh'));
    // proxy.position.copy(arg_dict['position'])
    return proxy
}


const axe_geometry = new THREE.CylinderGeometry( 5, 5, 100, 10 );
const axe_material = new THREE.MeshToonMaterial( {color: 0x7a5930} );

class Axe extends THREE.Object3D {
    constructor() {
        super();
        this.mesh = new THREE.Mesh(axe_geometry, axe_material);
        this.add(this.mesh);
    }
    check_collisions(collision_elements) {
        return check_collisions(this.mesh, collision_elements)
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


export {create_enemy, Projectile, Enemy, get_all_properties, proxy_handler, Mine, create_mine, create_cloud, Axe};
