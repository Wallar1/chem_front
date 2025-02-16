import { get } from 'svelte/store';
import * as THREE from 'three';
import { store } from './store.js'
import {jump, rotate_on_mouse_move} from './camera.js';
import { try_to_fire_player_weapon } from './gun.js';
import { movement_keys, space, tab, meta_key } from './constants.js';


export function init_pressed_keys() {
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    const back = new THREE.Vector3(0, 0, 1);
    const left = new THREE.Vector3(-1, 0, 0);
    store.pressed_keys = {
        'w': {
            'pressed': 0,
            'direction': forward,
        },
        's': {
            'pressed': 0,
            'direction': back,
        },
        'a': {
            'pressed': 0,
            'direction': left,
        },
        'd': {
            'pressed': 0,
            'direction': right,
        },
        ' ': {
            'pressed': 0
        }
    }
}



export class InputHandler {
    on_mouse_move(event){
        rotate_on_mouse_move(event)
    }

    on_mouse_click(event) {
        // this next line helps debug. Previously we were getting different positions because the renderer was expecting
        // a larger size (it looks for the window size) but we had another div pushing the threejs window down and smaller
        // scene.add(new THREE.ArrowHelper(mouse_ray.ray.direction, mouse_ray.ray.origin, 300, 0xff0000) );
        
        
        // let children = []
        // for (let c=0; c<scene.children.length; c++) {
        //     children.push(scene.children[c])
        // }
        // for (let e=0; e<earth.children.length; e++) {
        //     children.push(earth.children[e])
        // }
        // let intersects = unique(mouse_ray.intersectObjects( children, false ), (o) => o.object.uuid);
        // let intersects_with_click = intersects.filter(intersect => intersect.object.onclick);
        // if (intersects_with_click.length) {
        //     intersects_with_click.forEach(intersect => intersect.object.onclick())  // removed interesct, i dont think it did anything
        // }
    
        let compound = get(store.key_to_compound)[get(store.selected_compound_index)]
        try_to_fire_player_weapon(compound)
    }

    on_keydown(e) {
        e.preventDefault();
        e.stopPropagation();
        let keys_to_compound = get(store.key_to_compound)
        if (Object.keys(keys_to_compound).includes(e.key)) {
            let compound = keys_to_compound[e.key]
            try_to_fire_player_weapon(compound)
        } else if (e.key === tab || e.key === meta_key) {
            store.axe.try_to_swing();
        } else if (['ArrowRight', 'ArrowLeft'].indexOf(e.key) > -1) {
            console.log('arrow hit')
            // TODO: should I iterate over max_number_possible_for_each_compound to skip the compounds that cant be created yet?
            let _selected_compound_index = parseInt(get(store.selected_compound_index))
            let max_keys = Object.keys(keys_to_compound).length
            if (e.key === 'ArrowLeft') {
                _selected_compound_index = _selected_compound_index < 1 ? max_keys : _selected_compound_index - 1;
            } else if (e.key === 'ArrowRight') {
                _selected_compound_index = _selected_compound_index >= max_keys ? 1 : _selected_compound_index + 1;
            }
            console.log(String(_selected_compound_index))
            store.selected_compound_index.set(String(_selected_compound_index))
        } else if (movement_keys.includes(e.key)) {
            store.pressed_keys[e.key]['pressed'] = Math.min(5, store.pressed_keys[e.key]['pressed'] + 1);
        } else if (e.key === space) {
            if (store.pressed_keys[space]['pressed'] === 0) {
                store.pressed_keys[space]['pressed'] = 1;
                jump();
            }
        }
    }

    on_keyup(e) {
        e.stopPropagation()
        if (movement_keys.includes(e.key)) {
            store.pressed_keys[e.key]['pressed'] = 0;
        }
    }
}
