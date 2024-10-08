import * as THREE from 'three';

import { get } from 'svelte/store';

import { get_random_solid_element, get_random_gas_element, get_font_text_mesh, text_look_at, dispose_material } from './helper_functions';
import { 
    current_element_counts,
    global_updates_queue,
    atoms,
    selected_atom,
} from './stores.js';


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

function add_to_global_updates_queue(updater) {
    let guq = get(global_updates_queue);
    guq.push(updater);
    global_updates_queue.set(guq);
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

    keepTextRotatedWithCamera(camera) {
        const self = this;
        const look_at_camera_helper = (state, time_delta) => {
            if (!self.mesh.text) return {finished: false}
            if (!self.mesh.text.centered_text) {
                // centers the text
                self.mesh.text.position.x = -1 * self.mesh.text.geometry.boundingSphere.radius;
                self.mesh.text.centered_text = true;
            }
            const cameraWorldPosition = camera.getWorldPosition(new THREE.Vector3())
            text_look_at(self.mesh.text.parent, cameraWorldPosition);
            return {finished: false}
        }
        let updater = new Updater(look_at_camera_helper, {finished: false});
        add_to_global_updates_queue(updater);
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





// TODO: maybe also map to a geometry and z position, so we can make the water, mine, or cloud
const element_to_material = {
    'H': new THREE.MeshStandardMaterial({color: 0xffffff,}),
    'C': new THREE.MeshStandardMaterial({color: 0x876a45,}),  // 000000
    'N': new THREE.MeshStandardMaterial({color: 0x00cde8,}),
    'O': new THREE.MeshStandardMaterial({color: 0x0000aa,}),
    'AU': new THREE.MeshStandardMaterial({color: 0xebd834,}),
    'NA': new THREE.MeshStandardMaterial({color: 0x575757,}),
    'CL': new THREE.MeshStandardMaterial({color: 0x00ff00,}),
}
const mine_geometry = new THREE.ConeGeometry( 50, 100, 32 );
const mine_piece_geometry = new THREE.SphereGeometry( 2, 10, 10 );
const mine_text_position = new THREE.Vector3(0, 60, 0)

function mine_or_cloud_onclick(element) {
    return () => {
        let added_amount = 1
        let curr_el_cnts = get(current_element_counts)
        if (curr_el_cnts[element]) {
            curr_el_cnts[element]['count'] += added_amount;
        } else {
            curr_el_cnts[element] = {'count': added_amount};
        }
        current_element_counts.set(element, curr_el_cnts[element]['count'])
    }   
}

class Mine extends GameObj {
    constructor({camera}) { 
        super();
        this.camera = camera;
        this.element = get_random_solid_element();;
        this.should_delete = false;
        this.mesh = new THREE.Mesh(mine_geometry, element_to_material[this.element]);
        this.mesh.onclick = mine_or_cloud_onclick(this.element)
        // let r = Math.ceil(Math.max(mine_geometry.parameters.height, mine_geometry.parameters.width));
        // this.collider = new THREE.Box3(new THREE.Vector3(-r, -r, -r), new THREE.Vector3(r, r, r));
        get_font_text_mesh(this.element, this.mesh, mine_text_position)

        this.hits_taken = 0;
        this.hits_possible = 3;
        this.max_atoms_added_per_hit = 10;
    }

    initial_rotation() {
        // for some reason cones start sideways, so this flips them on their base
        this.rotateX(Math.PI/2);
    }

    collide() {
        // let added_amount = Math.floor(collided_obj.damage / 10);
        // let mine_world_position = this.mesh.getWorldPosition(new THREE.Vector3());
        // for (let i = 0; i < added_amount; i++) {
        //     let piece = new CollectableMinePiece(this.camera, this.element, mine_world_position.clone());
        //     piece.collect();
        // }
        let num_sparks = 5;
        for (let j = 0; j < num_sparks; j++) {
            this.create_collision_particle();
        }
        // let curr_el_cnts = get(current_element_counts)
        // if (curr_el_cnts[this.element]) {
        //     curr_el_cnts[this.element]['count'] += added_amount;
        // } else {
        //     curr_el_cnts[this.element] = {'count': added_amount};
        // }
        let atoms_added = Math.ceil(Math.random() * this.max_atoms_added_per_hit)
        current_element_counts.update(this.element, atoms_added)
        this.hits_taken += 1;
        if (this.hits_taken >= this.hits_possible) {
            this.should_delete = true;
        }
    }

    create_collision_particle() {
        // This particle will blast out in an arc
        let particle = new MineSpark(this.element);
        particle.add_to(this.mesh);
        let radius = Math.random() * 10;
        let phi = Math.random() * Math.PI / 3;
        let theta = Math.random() * Math.PI * 2;
        let direction = new THREE.Vector3().setFromSphericalCoords(radius, phi, theta);
        let explode_helper = (state, time_delta) => {
            let {total_time, finished, particle, direction} = state;
            total_time += time_delta;
            if (total_time > .5) {
                return {to_delete: [particle], finished: true};
            }
            let gravity = new THREE.Vector3(0, -1, 0);
            direction.add(gravity.multiplyScalar(time_delta * 10));

            let new_pos = new THREE.Vector3().addVectors(particle.mesh.position, direction.clone().multiplyScalar(time_delta * 50));
            particle.mesh.position.set(new_pos.x, new_pos.y, new_pos.z);
            return {total_time, finished, direction, particle}
        }
        let updater = new Updater(explode_helper, {finished: false, total_time: 0, direction: direction, particle: particle});
        add_to_global_updates_queue(updater);
    }
}

/*
    Granite:
        Quartz (SiO₂)
        Feldspar (a group of minerals, including orthoclase (KAlSi₃O₈), plagioclase ((Na, Ca)Al₁₋₂Si₃₋₂O₈))
        Mica (muscovite (KAl₂(AlSi₃O₁₀)(OH)₂), biotite (K(Mg, Fe)₃(AlSi₃O₁₀)(OH)₂))

    Basalt:
        Plagioclase feldspar ((Na, Ca)Al₁₋₂Si₃₋₂O₈)
        Pyroxene (a group of minerals, commonly augite (Ca(Mg, Fe)Si₂O₆))
        Olivine ((Mg, Fe)₂SiO₄)

    Sandstone:
        Quartz (SiO₂)
        Feldspar (a group of minerals)
        Clay minerals

    Shale:
        Clay minerals (kaolinite (Al₂Si₂O₅(OH)₄), illite, smectite)
        Quartz (SiO₂)
        Organic materials

    Marble:
        Calcite (CaCO₃)
        Sometimes includes impurities like quartz, mica, graphite, iron oxides, and pyrite.

    Slate:
        Clay minerals
        Quartz (SiO₂)
        Mica (muscovite, biotite)
        Chlorite

    Gneiss:
        Quartz (SiO₂)
        Feldspar (orthoclase, plagioclase)
        Mica (muscovite, biotite)
        Amphibole (hornblende)

    Obsidian:
        Primarily silica (SiO₂)
        Small amounts of other minerals giving it a dark color

    Limestone:
        Calcite (CaCO₃)
        Sometimes includes impurities like aragonite, dolomite, and various fossils.

    Dolomite (Dolostone):
        Dolomite (CaMg(CO₃)₂)
        Sometimes includes calcite (CaCO₃) and other impurities.

These compositions can vary depending on the specific formation conditions and locations of the rocks.
*/

class MineSpark extends GameObj{
    constructor(element) {
        super();
        this.mesh = new THREE.Mesh(mine_piece_geometry, element_to_material[element]);
    }

    dispose() {
        this.mesh.geometry.dispose();
        dispose_material(this.mesh.material);
        this.mesh.parent = null;
        this.mesh = null;
    }
}


function create_mine(arg_dict) {
    let mine = new Mine(arg_dict)
    let proxy = new Proxy(mine, proxy_handler('mesh'));
    // proxy.position.copy(arg_dict['position'])
    return proxy
}

// class CollectableMinePiece extends GameObj {
//     constructor(camera, element, mine_world_position) {
//         super();
//         this.camera = camera;
//         this.element = element;
//         this.mesh = new THREE.Mesh(mine_piece_geometry, element_to_material[this.element]);
//         this.add_to(this.camera)
//         let mine_pos_local_to_camera = this.camera.worldToLocal(mine_world_position)
//         this.mesh.position.set(mine_pos_local_to_camera.x, mine_pos_local_to_camera.y, mine_pos_local_to_camera.z);
//     }

//     collect() {
//         // These particles will fly towards the sidebar totals
//         let collect_helper = (state, time_delta) => {
//             let {total_time, finished} = state;
//             total_time += time_delta;
//             if (total_time > 3) {
//                 return {to_delete: [this], finished: true, total_time: total_time};
//             }

//             this.mesh.position.x += time_delta * 50;
//             return {total_time, finished}
//         }
//         let updater = new Updater(collect_helper, {finished: false, total_time: 0});
//         add_to_global_updates_queue(updater);
//     }

// }



const cloud_material = new THREE.MeshStandardMaterial({color: 0xffffff,});
const cloud_geometry = new THREE.SphereGeometry( 50, 20, 20 );
const cloud_text_position = new THREE.Vector3(0, -90, 0)

class Cloud extends GameObj {
    constructor() { 
        super();
        this.element = get_random_gas_element();;
        this.should_delete = false;
        this.mesh = new THREE.Mesh(cloud_geometry, cloud_material);
        this.mesh.onclick = mine_or_cloud_onclick(this.element)
        // let r = Math.ceil(Math.max(mine_geometry.parameters.height, mine_geometry.parameters.width));
        // this.collider = new THREE.Box3(new THREE.Vector3(-r, -r, -r), new THREE.Vector3(r, r, r));
        get_font_text_mesh(this.element, this.mesh, cloud_text_position)
    }

    collide(collided_obj) {
        // let added_amount = Math.floor(collided_obj.damage / 10);
        let added_amount = 20;
        // let curr_el_cnts = get(current_element_counts)
        // if (curr_el_cnts[this.element]) {
        //     curr_el_cnts[this.element]['count'] += added_amount;
        // } else {
        //     curr_el_cnts[this.element] = {'count': added_amount};
        // }
        current_element_counts.update(this.element, added_amount)
    }

    initial_rotation() {
        this.rotateX(Math.PI/2);
    }
}

function create_cloud(arg_dict) {
    let cloud = new Cloud(arg_dict)
    let proxy = new Proxy(cloud, proxy_handler('mesh'));
    // proxy.position.copy(arg_dict['position'])
    return proxy
}


const energy_power_ups = [
    // {   
    //     'type': 'nuclear',
    //     'material': new THREE.MeshBasicMaterial( { color: 0x67d686 } ),
    //     'power': 'chain reaction',
    // },
    {
        'type': 'electrical',
        'material': new THREE.MeshBasicMaterial( { color: 0xffeb36 } ),
        'power': 'stun',
    },
    {
        'type': 'kinetic',
        'material': new THREE.MeshBasicMaterial( { color: 0x858585 } ),
        'power': 'speed boost',
    },
    {
        'type': 'thermal',
        'material': new THREE.MeshBasicMaterial( { color: 0xff5c5c } ),
        'power': 'burn over time',
    },
    {
        'type': 'chemical',
        'material': new THREE.MeshBasicMaterial( { color: 0x58e6e8 } ),
        'power': 'damage boost',
    },
    // {
    //     'type': 'sound',
    //     'material': new THREE.MeshBasicMaterial( { color: 0xe388e0 } ),
    //     'power': 'aoe pulses',
    // }
]
const torus_geometry = new THREE.TorusKnotGeometry( 50, 5, 100, 16 );
const lab_text_position = new THREE.Vector3(0, 90, 0)
class Lab extends GameObj {
    constructor({camera}) {
        super();
        this.effect = energy_power_ups[Math.floor(Math.random() * energy_power_ups.length)]
        this.mesh = new THREE.Mesh( torus_geometry, this.effect['material'] );
        get_font_text_mesh(`${this.effect['type']}: ${this.effect['power']}`, this.mesh, lab_text_position)
    }

    initial_rotation() {
        this.rotateX(Math.PI/2);
    }
}


function create_lab(arg_dict) {
    let lab = new Lab(arg_dict)
    let proxy = new Proxy(lab, proxy_handler('mesh'));
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


const SPACING = 75;
const ATOM_SIZE = 25;
const normal_material = new THREE.MeshNormalMaterial();
const label_scale = new THREE.Vector3(5/ATOM_SIZE, 5/ATOM_SIZE, 5/ATOM_SIZE)
const label_position = new THREE.Vector3(-0.5, 0, 1)

class Compound {
    constructor(root, csv_atoms, csv_bonds, use_normal=false, show_label=true) {
        this.root = root;
        this.name = 'compound name';
        this.element_counts = {};

        const bondGeometry = new THREE.BoxGeometry( 1, 1, 1 );
        const atomGeometry = new THREE.IcosahedronGeometry( 1, 3 );
        const materials = {}
        for (let i = 1; i < csv_atoms.length; i++) {
            const csv_atom = csv_atoms[i];
            const element = csv_atom.element
            if (!materials[element.toLowerCase()]) {
                let color_info = get(atoms)[element]['color']
                let color = new THREE.Color(`rgb(${color_info[0]}, ${color_info[1]}, ${color_info[2]})`);
                materials[element.toLowerCase()] = new THREE.MeshToonMaterial( { color: color } );
            }
            let atom_material;
            if (use_normal) {
                atom_material = normal_material;
            } else {
                atom_material = element_to_material[element]
            }
            const atom_obj = new THREE.Mesh( atomGeometry, atom_material );
            atom_obj.is_atom = true;
            atom_obj.position.set( ...csv_atom.coordinates );
            atom_obj.position.multiplyScalar(SPACING);
            if (show_label){
                get_font_text_mesh(element, atom_obj, label_position, label_scale)
            }
            atom_obj.scale.set( ATOM_SIZE, ATOM_SIZE, ATOM_SIZE );
            atom_obj.onclick = () => {
                if (element === get(selected_atom)) {
                    atom_obj.material = materials[element.toLowerCase()];
                    atom_obj.correct_material = true;
                }
            }
            root.add( atom_obj );
        }
        const start = new THREE.Vector3();
        const end = new THREE.Vector3();
        const bondMaterial = new THREE.MeshToonMaterial( { color: 0xffffff } );
        for (let i = 0; i < csv_bonds.length; i++) {
            const csv_bond = csv_bonds[i];
            start.set(...csv_atoms[csv_bond.atoms[0]].coordinates);
            start.multiplyScalar(SPACING);
            end.set(...csv_atoms[csv_bond.atoms[1]].coordinates);
            end.multiplyScalar(SPACING)
            const parent_object = new THREE.Object3D();
            parent_object.position.copy( start );
            parent_object.position.lerp( end, 0.5 );
            parent_object.scale.set( 5, 5, start.distanceTo( end ) );
            parent_object.lookAt( end );
            parent_object.scale.set( 5, 5, start.distanceTo( end ) );
            root.add( parent_object );
            if (csv_bond.count === 1) {
                const object = new THREE.Mesh( bondGeometry, bondMaterial );
                parent_object.add( object );
            } else if (csv_bond.count === 2) {
                const object = new THREE.Mesh( bondGeometry, bondMaterial );
                object.position.y = 1;
                parent_object.add( object );
                const object2 = new THREE.Mesh( bondGeometry, bondMaterial );
                object2.position.y = -1;
                parent_object.add( object2 );
            } else if (csv_bond.count === 3) {
                const object = new THREE.Mesh( bondGeometry, bondMaterial );
                object.position.y = 2;
                parent_object.add( object );
                const object2 = new THREE.Mesh( bondGeometry, bondMaterial );
                parent_object.add( object2 );
                const object3 = new THREE.Mesh( bondGeometry, bondMaterial );
                object3.position.y = -2;
                parent_object.add( object3 );
            } else {
                throw new Error('Too many bonds!');
            }
        }
    }
}


export {
    Updater,
    add_to_global_updates_queue,
    GameObj,
    Projectile,
    get_all_properties,
    proxy_handler,
    check_collisions,
    Mine,
    create_mine,
    create_cloud,
    create_lab,
    energy_power_ups,
    Axe,
    Compound,
};
