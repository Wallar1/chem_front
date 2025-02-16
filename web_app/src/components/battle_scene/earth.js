import * as THREE from 'three';

import { store } from './store.js';
import { earth_radius } from './constants';

const earth_initial_position = new THREE.Vector3(0, 0 , 0);

export function create_earth(){
    store.earth = new THREE.Mesh(
        new THREE.SphereGeometry( earth_radius, 200, 200 ),
        // new THREE.MeshStandardMaterial({
        //     color: 0x086100,
        // })
        new THREE.MeshToonMaterial({color: 0x086100,})
    );
    store.earth.position.copy(earth_initial_position)
    store.earth.castShadow = false;
    store.earth.receiveShadow = true;
    
    let collider = new THREE.Sphere(earth_initial_position, earth_radius);
    // ONLY COMMENTING THIS NEXT LINE OUT BECAUSE I NEED TO ADJUST THE PROJECTILE ANGLE
    // collision_elements.push(collider)
}