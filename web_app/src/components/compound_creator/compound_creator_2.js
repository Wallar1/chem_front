import * as THREE from 'three';
import {TrackballControls} from 'three/examples/jsm/controls/TrackballControls';
import { PDBLoader } from 'three/examples/jsm/loaders/PDBLoader.js';
import { CSS3DRenderer, CSS3DObject, CSS3DSprite } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

/*
Notes about a pdb file:
in the atom section (HETATM for heterogenous atom), it shows the name of the atom, the residue, and the position of the atom relative to the center
in the bond section (CONECT) it shows the atom and then which other atoms it is bonded to. Ex: 1 2 3 4 means atom 1 is connected to 2, 3, and 4.
*/


let camera, scene, renderer, controls, root;

const MOLECULE_PATHS = {
    'Caffeine': 'caffeine.pdb',
};

const loader = new PDBLoader();
const colorSpriteMap = {};
const baseSprite = document.createElement( 'img' );
const SPACING = 75;  // this is the distance between the atoms, and the length of the bonds

const objects = [];
const tmpVec1 = new THREE.Vector3();
const tmpVec2 = new THREE.Vector3();
const tmpVec3 = new THREE.Vector3();
const tmpVec4 = new THREE.Vector3();
const offset = new THREE.Vector3();

let current_molecule = 'Caffeine'


export class CompoundCreator {
    constructor() {
        init();
        animate();
    }
}


function init() {
    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 2000)
    camera.position.z = 700;

    scene = new THREE.Scene();

    root = new THREE.Object3D();
    scene.add(root);

    renderer = new CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 5;

    baseSprite.src = 'ball.png'
    baseSprite.onload = function() {
        loadMolecule(MOLECULE_PATHS[current_molecule])
    }

    window.addEventListener('resize', onWindowResize)
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function colorify(ctx, width, height, color) {
    const r = color.r, g = color.g, b = color.b;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0, l = data.length; i < l; i += 4) {
        data[i + 0] *= r;
        data[i + 1] *= g;
        data[i + 2] *= b;
    }
    ctx.putImageData( imageData, 0, 0);
}

function imageToCanvas(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, image.width, image.height);
    return canvas
}


function addBondClassStyles (el) {
    /*
    Adds these styles inline, because svelte is funky and if the element doesnt exist yet, it doesnt add the style.
    There might be a better way
    .bond {
        width: 5px;
        background: rgb(242, 242, 242);
        display: block;
    */
   el.style.width = '5px';
   el.style.background = 'rgb(242, 242, 242)';
   el.style.display = 'block';
}

function resetObjects() {
    for (let i = 0; i< objects.length; i++) {
        const object = objects[i];
        object.parent.remove(object);
    }
    objects.length = 0;
}

function loadMolecule(model) {
    const model_file_path = 'models/pdb/' + model;

    loader.load(model_file_path, function(pdb) {
        const geometryAtoms = pdb.geometryAtoms;
        const geometryBonds = pdb.geometryBonds;
        const json = pdb.json;

        geometryAtoms.computeBoundingBox();
        geometryAtoms.boundingBox.getCenter(offset).negate();
        geometryAtoms.translate(offset.x, offset.y, offset.z);
        geometryBonds.translate(offset.x, offset.y, offset.z);

        const positionAtoms = geometryAtoms.getAttribute('position');
        const colorAtoms = geometryAtoms.getAttribute('color');
        const position = new THREE.Vector3();
        const color = new THREE.Color();

        for (let i=0; i< positionAtoms.count; i++) {
            position.fromBufferAttribute(positionAtoms, i);
            color.fromBufferAttribute(colorAtoms, i);

            const atomJSON = json.atoms[i];
            const element = atomJSON[4];

            if (!colorSpriteMap[element]) {
                const canvas = imageToCanvas(baseSprite);
                const context = canvas.getContext('2d');

                colorify(context, canvas.width, canvas.height, color);

                const dataUrl = canvas.toDataURL();
                colorSpriteMap[element] = []
                colorSpriteMap[element][0] = dataUrl;

                const blank_canvas = imageToCanvas(baseSprite);
                const blank_context = blank_canvas.getContext('2d');
                colorify(blank_context, blank_canvas.width, blank_canvas.height, new THREE.Color(0.1, 0.1, 0.1));
                const blank_dataUrl = blank_canvas.toDataURL();
                colorSpriteMap[element][1] = blank_dataUrl;
            }

            const colorSprite = colorSpriteMap[element][0];
            const blankSprite = colorSpriteMap[element][1]
            const atom = document.createElement('img');
            atom.src = blankSprite;
            atom.addEventListener('click', (e) => {
                atom.src = colorSprite;  // this is the dataUrl
            })

            const object = new CSS3DSprite(atom);
            object.position.copy(position);
            object.position.multiplyScalar(SPACING);

            object.matrixAutoUpdate = false;
            object.updateMatrix();
            
            root.add(object);
            objects.push(object);
        }

        const positionBonds = geometryBonds.getAttribute('position');
        const start = new THREE.Vector3();
        const end = new THREE.Vector3();

        for (let i=0; i < positionBonds.count; i += 2) {
            start.fromBufferAttribute(positionBonds, i);
            start.multiplyScalar(SPACING);
            end.fromBufferAttribute(positionBonds, i+1);
            end.multiplyScalar(SPACING);

            /*
            Remember the dot product is how similar the lines are (cosine similarity - it is the cosine of the angle between them).
            Perpendicular lines are not similar and will be 0 (and cos(90) = 0),
            whereas parallel lines are very similar (and cos(0) = 1)
            It is equal to AxBx + AyBy + AzBz, or the product of the magitudes times the cosine of the angle between the lines.
            Ex, imagine lines going from the origin to [1, 3] and [1, 4]. The magnitude of each about 3.5 and 4.5, and cosine(pi/2) = .9. So the result is about 13.
            In physics it could be used to find the work done. Force dot distance = work. If your force and distance are in the same direction,
            there is work, and if the object moves perpendicular to the force, the force didnt do any work.
            Dot product is also the projection of one vector onto the other.

            Cross product gives a vector perpendicular to the vectors, with the magnitude equal to the area of the parallelogram between them
            A X B = (Ay​Bz​−Az​By​, Az​Bx​−Ax​Bz​, Ax​By​−Ay​Bx​)
            90 degrees would give you the biggest area.
            Cross product is used in torque. Torque = radius cross force. So if you have a pole on a spoke,
            and your force is pointed straight at the spoke so the force and the pole are in the same direction, there is no torque. But if
            you push perpendicular to the direction of the pole, you get the maximum torque.

            Cross product is also useful to find the area of a triangle if you have 3 points. Take two of the vectors, do the cross product. That is
            the area of the parallelogram. Just divide that by 2 to get the triangle.

            Also the cross product is useful to find normal vectors to a surface, so it can help determine how a surface will be lit.
            And the surfaces that are facing away from the camera can be ignored (backface culling)

            TLDR:
            here it is used to
            */
            tmpVec1.subVectors(end, start);  // this subtracts end - start, so you basically get the directional vector starting from 0
            console.log(baseSprite.width);
            const bondLength = tmpVec1.length() - 51;  // 50 because the bonds go to the center of the atom, but we dont want them to show over the atom, and the image is 64 pixels but the ball is only about 50
            // Note: cross sets the vector to the result and returns itself, dot just returns the magnitude of the similarity
            
            // this gives you a normal vector to the direction of the bond and the vertical
            // which is used as the axis to rotate around.
            const axis = tmpVec2.set(0, 1, 0).cross(tmpVec1);
            // this gives you the radians between the distance vector (vec1) and the y axis
            // it works because normalizing the vector makes its magnitude 1, and the y axis vector has a magnitude of 1, so mag x mag x cos(angle) = 1 x 1 x cos(angle)
            // and then we take the acos, which gives us just the angle (in radians)
            const radians = Math.acos(tmpVec3.set(0, 1, 0).dot(tmpVec4.copy(tmpVec1).normalize()));
            const objMatrix = new THREE.Matrix4().makeRotationAxis( axis.normalize(), radians);

            let bond = document.createElement('div');
            addBondClassStyles(bond);
            bond.style.height = bondLength + 'px';

            let object = new CSS3DObject(bond);
            object.position.copy(start);
            object.position.lerp(end, 0.5);  // moves the object to the halfway point between start and end, so it is centered
            // object.userData.bondLengthShort = bondLength + 'px';
            // object.userData.bondLengthFull = (bondLength + 55) + 'px';   // TODO: what is the 55? is it to counter the - 50 above?
            object.matrix.copy(objMatrix);
            object.quaternion.setFromRotationMatrix(object.matrix);
            object.matrixAutoUpdate = false;
            object.updateMatrix();
            root.add(object);
            objects.push(object);

            // why create joint? Because doing the 90 degree rotation is easy if you make a parent object,
            // since the 90 degrees can be relative to the parent
            let joint = new THREE.Object3D();
            joint.position.copy(start);
            joint.position.lerp(end, 0.5);
            joint.matrix.copy(objMatrix);
            joint.quaternion.setFromRotationMatrix(joint.matrix);
            joint.matrixAutoUpdate = false;
            joint.updateMatrix();

            let bond2 = document.createElement('div');
            addBondClassStyles(bond2);
            bond2.style.height = bondLength + 'px';
            let object2 = new CSS3DObject(bond2);
            object2.rotation.y = Math.PI / 2;
            object2.matrixAutoUpdate = false;
            object2.updateMatrix();
            // these settings were used when only displaying bonds for example
            // object2.userData.bondLengthShort = bondLength + 'px';
            // object2.userData.bondLengthFull = (bondLength + 55) + 'px';
            // object2.userData.joint = joint;
            joint.add(object2);
            root.add(joint);
            objects.push(object2);
        }

    })
}

