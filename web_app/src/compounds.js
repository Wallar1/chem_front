
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
import { get_font_text_mesh } from './helper_functions.js';



const element_to_likelihood = {
    'H': 40,
    'C': 9,
    'N': 9,
    'O': 10,
    'Au': 1,
    'Ag': 2,
    'Pb': 2,
    'Al': 5,
    'Si': 3,
    'Ca': 4,
    'Na': 7,
    'Cl': 6,
    'Mg': 1
}



export const formula_to_damage_dict = {
    'H2': 10,
    'CH4': 40,
    'NH3': 50,
    'CO': 30,
    'CN': 40,
    'H2O': 40,
    'O2': 10,
    'Au': 80,
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

export const projectile_material_map = {
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


// TODO: maybe also map to a geometry and z position, so we can make the water, mine, or cloud
export const element_to_material = {
    'H': new THREE.MeshStandardMaterial({color: 0xffffff,}),
    'C': new THREE.MeshStandardMaterial({color: 0x876a45,}),  // 000000
    'N': new THREE.MeshStandardMaterial({color: 0x00cde8,}),
    'O': new THREE.MeshStandardMaterial({color: 0x0000aa,}),
    'AU': new THREE.MeshStandardMaterial({color: 0xebd834,}),
    'NA': new THREE.MeshStandardMaterial({color: 0x575757,}),
    'CL': new THREE.MeshStandardMaterial({color: 0x00ff00,}),
}





const SPACING = 75;
const ATOM_SIZE = 25;
const normal_material = new THREE.MeshNormalMaterial();
const label_scale = new THREE.Vector3(5/ATOM_SIZE, 5/ATOM_SIZE, 5/ATOM_SIZE)
const label_position = new THREE.Vector3(-0.5, 0, 1)

export class Compound {
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