// import * as FontLoaderJs from 'three/addons/loaders/FontLoader.js';
import * as THREE from 'three';

const loader = new THREE.FontLoader();
export function get_font_text_mesh(characters, parent, position, scale) {
    loader.load( 'helvetiker_regular.typeface.json', function ( font ) {
        const matLite = new THREE.MeshBasicMaterial( {
            color: 0x006699,
            side: THREE.DoubleSide
        } );
        const shapes = font.generateShapes( characters, 5 );
        const geometry = new THREE.ShapeGeometry( shapes );
        if (scale) {
            geometry.scale(scale.x, scale.y, scale.z);
        } else {
            geometry.scale(5, 5, 0);
        }

        const text = new THREE.Mesh( geometry, matLite );

        parent.add(text)
        text.position.set(position.x, position.y, position.z)
        // console.log(text)
        // text.position.y += 60  // to put it over the mine
        // text.position.x -= 2  // to center it
        // render();
        return text
    } );
}


export function get_random_element(available_elements=None) {
    /*
    I just create some ranges using the likelihoods like H will go from 0 - 30 and Au will go from 30 - 32, and then I pick a random
    number from 0 - 32 and wherever it lands, I return that element
    */
    // change this to a store
    if (!available_elements) {
        available_elements = {
            'H': 25,
            'C': 11,
            'N': 9,
            'O': 10,
            'Au': 1,
        }
    }
    let ranges = []  // gets populated like [['Au',min, max], ['H', min, max]]
    let current_min = 0;
    for (const [el, likelihood] of Object.entries(available_elements)) {
        ranges.push([el, current_min, current_min + likelihood])
        current_min += likelihood
    }
    let r = Math.floor(Math.random() * (current_min + 1))
    for (let i=0; i<ranges.length; i++) {
        let [el, min, max] = ranges[i]
        if (r >= min && r <= max) {
            return el
        }
    }
    return 'There was an error'
}

export function get_random_gas_element() {
    return get_random_element({'H': 25, 'O': 10, 'N': 9})
}

export function get_random_solid_element() {
    return get_random_element({'C': 11, 'Au': 1})
}


export function parse_formula_to_dict(formula) {
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



export function dispose_material(material) {
    console.log('disposing material')
    material.dispose();
    // Dispose textures
    for (const key of Object.keys(material)) {
        const value = material[key];
        if (value && typeof value === 'object' && 'minFilter' in value) {
            value.dispose();
        }
    }
}

// Dispose of the current group and any associated resources
export function dispose_group(group) {
    if (group) {
        // Traverse the group to dispose geometries, materials, and textures
        group.traverse(object => {
            if (object.isMesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (object.material.isMaterial) {
                        dispose_material(object.material);
                    } else {
                        // An array of materials
                        for (const material of object.material) dispose_material(material);
                    }
                }
            }
        });
        if (group.parent) {
            group.parent.remove(group);
        }
    }
}


// Remove the renderer's DOM element and dispose the renderer
export function dispose_renderer(renderer) {
    if (renderer) {
        renderer.domElement.remove();
        renderer.dispose();
    }
}

export function have_same_sign(a, b) {
    // ^ is XOR. If the first bit is 1 and the second bit is 0, then the result is 1. But if they have the same bit,
    // then the result is 0, meaning they have the same sign
    return (a ^ b) >= 0;
}