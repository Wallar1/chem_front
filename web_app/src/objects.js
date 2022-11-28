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


var size = new THREE.Vector3(10, 10, 10)
class Projectile extends GameObj {
    constructor({geometry, material, initial_pos, velocity, onclick}) {
        super();
        this.mesh = new THREE.Mesh(geometry, material)
        this.velocity = velocity
        this.mesh.onclick = onclick
        this.radius = geometry.parameters.radius;
        this.collider = new THREE.Sphere(initial_pos, this.radius);
        this.health_impact = 20;
    }

    check_collisions(collision_elements) {
        let world_pos = new THREE.Vector3();
        let pos_in_world = new THREE.Vector3();
        let collided_objs = []
        this.collider.set(this.mesh.position, this.radius)
        collision_elements.forEach(obj => {
            if (obj.collider instanceof THREE.Box3) {
                obj.getWorldPosition(pos_in_world);
                obj.collider.setFromCenterAndSize(pos_in_world, size)
                if (this.collider.intersectsBox(obj.collider)) {
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


const health_bar_material = new THREE.MeshToonMaterial( {color: 0x00ff00} );

class Enemy extends GameObj {
    constructor({geometry, material}) {
        super();
        this.should_delete = false;
        this.mesh = new THREE.Mesh(geometry, material);
        let r = Math.ceil(Math.max(geometry.parameters.height, geometry.parameters.width) / 2);
        this.collider = new THREE.Box3(new THREE.Vector3(-r, -r, -r), new THREE.Vector3(r, r, r));

        this.full_health = 100;
        this.health = 100;

        let health_bar_geometry = new THREE.CylinderGeometry( 1, 1, 10, 10 );
        this.health_bar = new THREE.Mesh( health_bar_geometry, health_bar_material );
        this.mesh.add(this.health_bar)
        this.health_bar.rotateZ(Math.PI/2)
        this.health_bar.position.z = -8;
    }

    add_to(parent) {
        this.parent = parent;
        parent.add(this.mesh)
    }

    take_damage(dmg) {
        this.health -= dmg
        if (this.health <= 30) {
            this.should_delete = true;
            return
        }
        this.health_bar.geometry.scale(1, this.health/this.full_health, 1)
    }

    collide(collided_obj) {
        this.take_damage(collided_obj.damage)
    }
}


function create_enemy(arg_dict) {
    let enemy = new Enemy(arg_dict)
    let proxy = new Proxy(enemy, proxy_handler('mesh'));
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


export {create_enemy, Projectile, Enemy, get_all_properties, proxy_handler};
