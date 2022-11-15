import * as THREE from 'three';


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


var size = new THREE.Vector3(10, 10, 10)
class Projectile {
    constructor({geometry, material, initial_pos, velocity, onclick}) {
        // super();
        this.mesh = new THREE.Mesh(geometry, material)
        this.velocity = velocity
        this.mesh.onclick = onclick
        this.radius = geometry.parameters.radius;
        this.collision_sphere = new THREE.Sphere(initial_pos, this.radius);
    }

    dispose() {
        this.parent.remove(this.mesh);
    }

    check_collisions(collision_elements) {
        let world_pos = new THREE.Vector3();
        let pos_in_world = new THREE.Vector3();
        let collided_objs = []
        // console.log(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z)
        this.collision_sphere.set(this.mesh.position, this.radius)
        // console.log(this.collision_sphere.center.x, this.collision_sphere.center.y, this.collision_sphere.center.z)
        collision_elements.forEach(obj => {
            if (obj.collision_box) {
                // console.log(obj.collision_box)
                obj.getWorldPosition(pos_in_world);
                obj.collision_box.setFromCenterAndSize(pos_in_world, size)
                if (this.collision_sphere.intersectsBox(obj.collision_box)) {
                    collided_objs = [obj];
                    return  // this just returns out of the foreach
                }
            } 
            // else if (obj.collision_sphere) {
            //     obj.mesh.getWorldPosition(world_pos);
            //     obj.collision_sphere.set(world_pos, obj.radius)
            //     if (obj.collision_sphere.intersectsSphere(projectile.collision_sphere)) {
            //         collided_objs = [obj];
            //         return  // this just returns out of the foreach
            //     }
            // } else {
            //     console.log('did we set another type of collider shape?')
            // }
        })
        return collided_objs
    }
}

function create_projectile(arg_dict) {
    let projectile = new Projectile(arg_dict)
    let proxy = new Proxy(projectile, proxy_handler('mesh'))
    proxy.position.copy(arg_dict['initial_pos'])
    return proxy
}


class Enemy {
    constructor({geometry, material}) {
        // super();
        this.should_delete = false;
        this.mesh = new THREE.Mesh(geometry, material);
        let r = Math.ceil(Math.max(geometry.parameters.height, geometry.parameters.width) / 2);
        this.collision_box = new THREE.Box3(new THREE.Vector3(-r, -r, -r), new THREE.Vector3(r, r, r));
    }

    add_to(parent) {
        this.parent = parent;
        parent.add(this.mesh)
    }

    dispose() {
        this.parent.remove(this.mesh);
        this.collision_box = null;
    }

    collide() {
        this.should_delete = true;
    }
}



function create_enemy(arg_dict) {
    let enemy = new Enemy(arg_dict)
    let proxy = new Proxy(enemy, proxy_handler('mesh'))
    proxy.position.copy(arg_dict['position'])

    return proxy
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


export {create_enemy, create_projectile, Enemy, get_all_properties};