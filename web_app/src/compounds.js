
/*
Mercury: makes enemies crazy and attack each other
Gold: grants 2 other attacks
Silver: grants 1 other attack
Lead: some doom damage
Cyanide: poison
Chlorine: poison
Sodium: explodes on neighbors
Calcium: makes player stronger
Copper: electric shock that jumps from enemy to enemy 
*/

import * as THREE from 'three';
import {Projectile, proxy_handler} from './objects.js';


const formula_to_damage_dict = {
    'H2': 20,
    'CH4': 40,
    'NH3': 50,
    'CO': 10,
    'CN': 40,
    'H2O': 20,
    'O2': 10,
    'Au': 50,
    'Ag': 40,
    'Pb': 80,
    'Al': 90,
    'Si': 20,
    'Ca': 40,
    'Na': 90,
    'Cl': 90,
    'Mg': 60
}

const formula_to_name_dict = {
    'H2': 'Hydrogen gas',
    'CH4': 'Methane',
    'NH3': 'Ammonia',
    'CO': 'Carbon Monoxide',
    'CN': 'Cyanide',
    'H2O': 'Water',
    'O2': 'Oxygen gas',
    'Au': 'Gold',
    'Ag': 'Silver',
    'Pb': 'Lead',
    'Al': 'Aluminum',
    'Si': 'Silicon',
    'Ca': 'Calcium',
    'Na': 'Sodium',
    '2Na': 'Sodium x 2',
    '3Na': 'Sodium x 3',
    'Cl': 'Chlorine',
    '2Cl': 'Chlorine x 2',
    '3Cl': 'Chlorine x 3',
    'Mg': 'Mercury',
    'NaCl': 'Sodium Chloride (table salt)'
}

const material_map = {
    'H2': {
        'geometry': new THREE.SphereGeometry( 2, 10, 10 ),
        'material': new THREE.MeshToonMaterial({color: 0x10c42e})
    },
    'CH4': {
        'geometry': new THREE.SphereGeometry( 4, 10, 10 ),
        'material': new THREE.MeshToonMaterial({color: 0xe31b05})
    },
    'NH3': {
        'geometry': new THREE.SphereGeometry( 5, 10, 10 ),
        'material': new THREE.MeshToonMaterial({color: 0xafb538})
    },
    'CN': {
        'geometry': new THREE.SphereGeometry( 3, 10, 10 ),
        'material': new THREE.MeshToonMaterial({color: 0xebebeb})
    },
    'H2O': {
        'geometry': new THREE.SphereGeometry( 5, 10, 10 ),
        'material': new THREE.MeshToonMaterial({color: 0x26a0d4})
    },
}


export class Compound extends Projectile {
    constructor({formula, initial_pos, velocity, onclick}) {
        let geometry = material_map[formula]['geometry']
        let material = material_map[formula]['material']
        super({geometry, material, initial_pos, velocity, onclick})
        this.formula = formula
        this.dict = Compound.classmeth_parse_formula_to_dict(this.formula)
    }

    toString () {
        string = `${this.name} (${this.formula}): ${this.damage} damage. \n\tEffects: `
        for (effect in this.effects) {
            string += "\n\t\t"
            string += effect.toString()
        }
        return string
    }

    static classmeth_parse_formula_to_dict(formula) {
        let d = {}
        let current_el = ''
        let current_num = ''
        let chars = formula.split('')
        function add_to_dict(el, num) {
            if (d[el]) {
                d[el] += num
            } else {
                d[el] = num
            }
        }
        for (let c of chars) {
            if (c.toUpperCase() !== c) { // must be lowercase aka not a new element or number
                current_el += c
                continue
            }
            let num = Number(c)
            if (isNaN(num)) {  // must be a captital letter aka new element
                num = current_num ? Number(current_num) : 1;
                if (current_el) {
                    add_to_dict(current_el, num)
                    current_el = c
                    current_num = ''
                } else {
                    current_el = c
                }
            } else {
                current_num += c
            }
        }
        // do it one last time for the elements at the end
        let num = current_num ? Number(current_num) : 1;
        add_to_dict(current_el, num)
        return d
    }
    
    
    parse_formula_to_dict(self) {
        return Compound.classmeth_parse_formula_to_dict(this.formula)
    }
}

{/* <div class='button'>H2</div>
		<div class='button'>CH4</div>
		<div class='button'>NH3</div>
		<div class='button'>CN</div>
		<div class='button'>H2O</div> */}


class HydrogenGas extends Compound {
    constructor({initial_pos, velocity, onclick}) {
        let formula = 'H2'
        super({formula, initial_pos, velocity, onclick})
        this.name = 'Hydrogen Gas'
        this.damage = 20
        this.effects = []
    }
}

class Methane extends Compound {
    constructor({initial_pos, velocity, onclick}) {
        let formula = 'CH4'
        super({formula, initial_pos, velocity, onclick})
        this.name = 'Methane'
        this.damage = 30
        this.effects = []
    }
}

class Ammonia extends Compound {
    constructor({initial_pos, velocity, onclick}) {
        let formula = 'NH3'
        super({formula, initial_pos, velocity, onclick})
        this.name = 'Ammonia'
        this.damage = 30
        this.effects = []
    }
}

class Cyanide extends Compound {
    constructor({initial_pos, velocity, onclick}) {
        let formula = 'CN'
        super({formula, initial_pos, velocity, onclick})
        this.name = 'Cyanide'
        this.damage = 50
        this.effects = []
    }
}

class Water extends Compound {
    constructor({initial_pos, velocity, onclick}) {
        let formula = 'H2O'
        super({formula, initial_pos, velocity, onclick})
        this.name = 'Water'
        this.damage = 50
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

export function create_compound(compound_name, arg_dict) {
    let klass = compound_name_to_class[compound_name]
    let projectile = new klass(arg_dict)
    let proxy = new Proxy(projectile, proxy_handler('mesh'))
    proxy.position.copy(arg_dict['initial_pos'])
    return proxy
}

function poison({dmg, enemy, framerate, initial_time, total_time, seconds_between_poison, number_of_ticks}) {
    if (!initial_time) initial_time = global_clock.elapsedTime
    if (!total_time) total_time = 0;
    total_time += global_clock.elapsedTime - initial_time;
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

// class Cyanide extends Compound {
//     constructor(enemy){
//         this.formula = 'CN'
//         this.name = 'Cyanide'
//         this.effects = [Poison(compound=self, enemy=enemy, damage=2)]
//         this.damage = 20
//     }
// }


// class Lead extends Compound {
//     constructor(enemy){
//         this.formula = 'Pb'
//         this.name = 'Lead'
//         this.effects = [Doom(compound=self, enemy=enemy, damage=20)]
//         this.damage = 30
//     }
// }


// class Chlorine extends Compound {
//     constructor(enemy){
//         this.formula = 'Cl'
//         this.name = 'Chlorine'
//         this.effects = []
//         this.damage = 10
//     }
// }













// import json
// import time
    
/*
class JsonSerializable(object){
    # https://yzhong-cs.medium.com/serialize-and-deserialize-complex-json-in-python-205ecc636caa
    function toJSON(){
        return json.dumps(default=lambda o: o.__dict__, sort_keys=True, indent=4)


    @classmethod
    def fromJSON(cls, json_data){
        return cls(**json_data)
    
    
    
    def slow_print(text){
        time.sleep(0)
        print(text)
    
    
    def get_coefficient(string){
        coefficient = '0'
        start = 0
        chars = list(string)
        for idx, c in enumerate(chars){
            try{
                int(c)
                coefficient += c
            except Exception{
                start = idx
                break
        # do the max of 1 and int(coefficient) because no coefficient is assumed to be 1
        return max(1, int(coefficient)), ''.join(chars[start:])
    
    
    def measure_performance(func){
        def wrapper(*args, **kwargs){
            start = time.monotonic_ns()
            return_value = func(*args, **kwargs)
            end = time.monotonic_ns()
            print('{} function took {} nanoseconds to run'.format(func.__name__, end - start))
            return return_value
        return wrapper
    
    
    def least_common_multiple(num_arr){
        # lazy method is just return the multiple of all of the numbers, which is not an LCM, but it works the same
        return reduce(lambda serialized, num: serialized * num, num_arr, 1)
    
        # lcm = 1
        # # make sure they are all not 1, because if so, the lcm is just 1
        # if max(num_arr) == 1{
        #     return 1
    
        # def all_nums_are_factors(num_arr){
        #     for num in num_arr{
        #         if lcm % num != 0{
        #             return False
        #     return True
    
        # # some random upper bound so we dont run to infinity if this code is wrong
        # while lcm < 1000{
        #     lcm += 1
        #     if all_nums_are_factors(num_arr){
        #         return lcm
        # raise Exception("Least common multiple was not found")
    
    
    # def find_random_compound(self, elements, compounds){
    #     element_counts = {}
    #     for element in elements{
    #         element_counts[]
    #     possible_compounds = []
    #     for compound in compounds{
    #         pass
*/