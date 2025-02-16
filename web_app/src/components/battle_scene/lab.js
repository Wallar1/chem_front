import * as THREE from 'three';

import { store } from './store.js';
import { Updater, GameObj, proxy_handler } from './objects';
import { get_font_text_mesh } from '../../helper_functions.js';


// For now, all of the effects will last 10 seconds. This can be changed later
/*
Im setting this up so that each time you add an energy effect, it bumps the time up by 10, but also adds
an updater to decrement the time. Im hoping that makes it so you can only bump into an energy effect so
many times before it doesnt help any more. Like for the first hit, you get 10 seconds and then with 5 seconds
remaining you get a second hit, so it adds 10 seconds, but now there are 2 updaters to decrement the time. So each second,
it decrements 2 seconds, for 5 seconds. So you get 5 seconds, then 5 seconds with 2, then 5 seconds with one and it completes,
for a total of 15 seconds. Im sure there is a math equation for this. But if you got 2 right away, you would only get 10 seconds
*/
const ENERGY_EFFECT_DURATION = 10
export function add_energy_effect_updater(lab) {
    lab.collide = () => {
        let energy_type = lab.effect.type;
        store.lab_effects[energy_type] += ENERGY_EFFECT_DURATION;
        let energy_effect_decrementer = (state, time_delta) => {
            let { energy_type } = state;
            let time_remaining = Math.max(0, store.lab_effects[energy_type] - time_delta);
            store.lab_effects[energy_type] = time_remaining;
            if (time_remaining <= 0) {
                console.log(`removing ${energy_type} effect`)
                return {finished: true}
            }
            return {finished: false, energy_type: energy_type}
        }   
        console.log(`adding ${energy_type} effect`)
        let updater = new Updater(energy_effect_decrementer, {finished: false, energy_type: energy_type})
        store.global_updates_queue.push(updater)
    };
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
    constructor() {
        super();
        this.effect = energy_power_ups[Math.floor(Math.random() * energy_power_ups.length)]
        this.mesh = new THREE.Mesh( torus_geometry, this.effect['material'] );
        get_font_text_mesh(`${this.effect['type']}: ${this.effect['power']}`, this.mesh, lab_text_position)
    }

    initial_rotation() {
        this.rotateX(Math.PI/2);
    }
}


export function create_lab(arg_dict) {
    let lab = new Lab(arg_dict)
    let proxy = new Proxy(lab, proxy_handler('mesh'));
    // proxy.position.copy(arg_dict['position'])
    return proxy
}


export function delete_lab(lab) {
    store.labs = store.labs.filter(l => l != lab);
    lab.dispose();
}
