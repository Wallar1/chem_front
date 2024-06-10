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

        const text_parent = new THREE.Object3D();
        const text_container = new THREE.Object3D(); // this is what we rotate. Allows us to center the text inside
        text_container.add(text)
        text_parent.add(text_container);
        text_parent.position.set(position.x, position.y, position.z);
        // we later move the text further in order to account for its size (from the bounding box). But we need
        // to move the parent and not the text so the rotation isnt messed up. See keepTextRotatedWithCamera
        text.centered_text = false;
        parent.add(text_parent);
        parent.text = text;
    } );
}


export function text_look_at(text_container, world_position_to_look_at) {
    const _world_pos_to_look_at = world_position_to_look_at.clone();
    text_container.updateWorldMatrix(true, false);

    const text_world_position = new THREE.Vector3();
    text_world_position.setFromMatrixPosition(text_container.matrixWorld);

    // TODO: we should probably pass in the world position so this is variable
    const up = text_world_position;

    const forward = new THREE.Vector3().subVectors(_world_pos_to_look_at, text_world_position).normalize();
    if (forward.lengthSq() === 0) {
        // If the target is the same as the position, don't change rotation
        console.warn('THREE.Object3D.lookAt: target is the same as the position.');
        return;
    }

    const right = new THREE.Vector3().crossVectors(up, forward).normalize();
    // if (right.lengthSq() === 0) {
    //     // If the up vector is parallel to the forward vector, choose an arbitrary up
    //     // TODO: validate this code
    //     if (Math.abs(this.up.z) === 1) {
    //         right.set(1, 0, 0);
    //     } else {
    //         right.set(0, 0, 1);
    //     }
    //     right.crossVectors(this.up, forward).normalize();
    // }

    const new_up = new THREE.Vector3().crossVectors(forward, right);

    const new_matrix = new THREE.Matrix4();

    // if (text.isCamera || text.isLight) {
    //     new_matrix.lookAt(text_world_position, _world_pos_to_look_at, text.up);
    // }

    new_matrix.makeBasis(right, new_up, forward);
    text_container.quaternion.setFromRotationMatrix(new_matrix);

    // TODO: we kind of know that the text will have a parent, but Im leaving the if statement just in case
    if (text_container.parent) {
        /* we just subtract out the effect of all of the previous rotations, so that only the new rotation applies.
         this just uses the matrix to store and manipulate the rotations, im not sure why we dont do it on quaternions
         Note it is equivalent to:
            if (parent) {
                new_matrix.extractRotation(text.parent.matrixWorld);
                _q1.setFromRotationMatrix(new_matrix);
                text.quaternion.premultiply(_q1.invert());
            }
        */
        const inverted_parent_rotation = text_container.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
        text_container.quaternion.premultiply(inverted_parent_rotation);
    }
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