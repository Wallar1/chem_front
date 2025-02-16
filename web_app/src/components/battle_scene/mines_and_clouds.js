import * as THREE from 'three';

import { store } from './store';
import { GameObj, proxy_handler, Updater } from './objects.js';
import { element_to_material } from '../../compounds.js';
import { 
    get_font_text_mesh,
    get_random_solid_element,
    get_random_gas_element,
    dispose_material
} from '../../helper_functions.js';


const mine_geometry = new THREE.ConeGeometry( 50, 100, 32 );
const mine_piece_geometry = new THREE.SphereGeometry( 2, 10, 10 );
const mine_text_position = new THREE.Vector3(0, 60, 0)


function mine_or_cloud_onclick(element) {
    return () => {
        let added_amount = 1
        let curr_el_cnts = get(store.current_element_counts)
        if (curr_el_cnts[element]) {
            curr_el_cnts[element]['count'] += added_amount;
        } else {
            curr_el_cnts[element] = {'count': added_amount};
        }
        store.current_element_counts.set(element, curr_el_cnts[element]['count'])
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
            // this.create_collision_particle();
        }
        // let curr_el_cnts = get(store.current_element_counts)
        // if (curr_el_cnts[this.element]) {
        //     curr_el_cnts[this.element]['count'] += added_amount;
        // } else {
        //     curr_el_cnts[this.element] = {'count': added_amount};
        // }
        let atoms_added = Math.ceil(Math.random() * this.max_atoms_added_per_hit)
        store.current_element_counts.update(this.element, atoms_added)
        this.hits_taken += 1;
        if (this.hits_taken >= this.hits_possible) {
            delete_mine(this);
        }

    }



    // TODO hitting the mines is causing the game to freeze somehow. Something might not be deleting correctly





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
        store.global_updates_queue.push(updater);
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


export function create_mine(arg_dict) {
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
//         global_updates_queue.push(updater);
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
        // let curr_el_cnts = get(store.current_element_counts)
        // if (curr_el_cnts[this.element]) {
        //     curr_el_cnts[this.element]['count'] += added_amount;
        // } else {
        //     curr_el_cnts[this.element] = {'count': added_amount};
        // }
        store.current_element_counts.update(this.element, added_amount)
    }

    initial_rotation() {
        this.rotateX(Math.PI/2);
    }
}

export function create_cloud(arg_dict) {
    let cloud = new Cloud(arg_dict)
    let proxy = new Proxy(cloud, proxy_handler('mesh'));
    // proxy.position.copy(arg_dict['position'])
    return proxy
}


export function delete_mine(mine) {
    store.mines = store.mines.filter(m => m != mine);
    mine.dispose()
}

export function delete_cloud(cloud) {
    store.clouds = store.clouds.filter(c => c != cloud);
    cloud.dispose();
}
