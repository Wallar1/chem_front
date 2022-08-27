import * as THREE from 'three';
// import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { DragControls } from './drag_controls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { FontLoader } from 'three';
import { fragment_shader } from './shaders/fragment_shader.glsl.js';

export class TestLayout {
    constructor() {
        this._Initialize();
    }

    _Initialize() {
        this._threejs = new THREE.WebGLRenderer({
            antialias: true,
        });
        this._threejs.outputEncoding = THREE.sRGBEncoding;
        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);

        const canvas_container = document.getElementById('canvas-container')
        canvas_container.appendChild(this._threejs.domElement);

        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false);

        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 1000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(0, 20, 10);
        const edgeOfPlatform = new THREE.Vector3(0, 0, -100)
        this._camera.lookAt(edgeOfPlatform)

        const orbit_controls = new OrbitControls( this._camera, this._threejs.domElement );

        this._scene = new THREE.Scene();
        this._clock = new THREE.Clock();

        let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
        light.position.set(-100, 100, 100);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.001;
        light.shadow.mapSize.width = 4096;
        light.shadow.mapSize.height = 4096;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.left = 50;
        light.shadow.camera.right = -50;
        light.shadow.camera.top = 50;
        light.shadow.camera.bottom = -50;
        this._scene.add(light);

        light = new THREE.AmbientLight(0xFFFFFF, 0.25);
        this._scene.add(light);

        const loader = new THREE.CubeTextureLoader();
        loader.setPath( '/sky_box_background/' )
        const texture = loader.load([
            'px.png',
            'nx.png',
            'py.png',
            'ny.png',
            'pz.png',
            'nz.png'
        ]);
        texture.encoding = THREE.sRGBEncoding;
        this._scene.background = texture;

        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 80, 10, 10),
            new THREE.MeshStandardMaterial({
                color: 0x808080,
            }));
        plane.position.set(0, 0, -50)
        plane.castShadow = false;
        plane.receiveShadow = true;
        plane.rotateX(-Math.PI/2); // rotate flat (starts vertical)
        this._scene.add(plane);


        const axesHelper = new THREE.AxesHelper( 5 );
        axesHelper.position.y = 20;
        this._scene.add( axesHelper );

        this.drag_controls = new DragControls({camera: this._camera, domElement: this._threejs.domElement,
                                               scene: this._scene, caller: this});
        this.drag_controls.transformGroup = true;
        // this.drag_controls.addEventListener( 'drag', () => this._render() );

        let positions = this._get_card_positions(5)
        positions.forEach(pos => this._create_card(pos))

        this.add_ball()

        this._previousRAF = null;
        this._animations = []
        // this._LoadModels();
        this._animate();

        window.addEventListener('drag_combined', (event) => console.log(event))

        // document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
    }

    add_ball(){
        const cube_geometry = new THREE.BoxGeometry(5, 5, 5)
        const custom_shader = new THREE.ShaderMaterial({
            fragmentShader: fragment_shader
        })
        const cube_mesh = new THREE.Mesh(cube_geometry, custom_shader)
        cube_mesh.position.y = 20
        cube_mesh.position.z = -30
        console.log(cube_mesh)
        this._scene.add(cube_mesh)
    }

    _get_card_positions(count){
        // Each card is 5 wide, so we space by 6 for extra padding
        let y = 10
        let z = -10
        let max_width = count * 6
        let positions = []
        for (let x = max_width/2 - 3; x >= -max_width/2 + 3; x-=6) {
            positions.push(new THREE.Vector3(x, y, z))
        }
        return positions
    }

    _create_card(position) {
        if (!this.card_geometry) {
            this.card_geometry = new THREE.PlaneGeometry(5, 8)
        }
        let material = new THREE.MeshStandardMaterial({color: 0x4b4c4d})
        let card = new THREE.Mesh(this.card_geometry, material)
        card.castShadow = false;
        card.receiveShadow = false;
        card.position.set(position.x, position.y, position.z);
        this._scene.add(card);
        this.drag_controls._objects.push(card);
    }

    _combine_card(selected_card, other_card) {
        // const s_color = selected_card.material.color.clone();
        // const o_color = other_card.material.color.clone();
        const sub_color = new THREE.Color('#121212')
        selected_card.material.color.sub(sub_color);
        // other_card.material.color.add(s_color);
        // this._scene.remove(other_card);
    }

    _get_animation() {
        return this._model.animations[Math.floor(Math.random() * 2)]
    }

    _onKeyDown(event) {
        if (event.keyCode === 32) {
            // SPACE
            event.preventDefault()
            let animation = this._get_animation()
            this.current_animation?.stop()
            this.current_animation = animation
            this.current_animation.play()
        }
    }

    _add_animation(file_path) {
        this.fbx_loader.load(file_path, (anim) => {
            let action = this._mixer.clipAction(anim.animations[0])
            this._model.animations.push(action)
        })
    }

    _LoadModels() {
        this.fbx_loader = new FBXLoader();
        // loader.setPath('./resources/zombie/');
        this.fbx_loader.load('monster.fbx', (fbx) => {
            fbx.scale.setScalar(0.1);
            fbx.traverse(c => {
                c.castShadow = true;
            });

            this._model = fbx;
            this._mixer = new THREE.AnimationMixer(this._model);
            
            this._add_animation('strut_walk.fbx')
            this._add_animation('fast_run.fbx')
            this._scene.add(this._model)

            this.drag_controls._objects.push(this._model)
            
            // loader.load('walk.fbx', (a) => this._animations.push(this._mixer.clipAction(a.animations[0])));
            // loader.load('salsa_dancing.fbx', (a) => this._animations.push(this._mixer.clipAction(a.animations[0])));
            // loader.load('fast_run_anim.fbx', (a) => this._animations.push(this._mixer.clipAction(a.animations[0])));
            // loader.load('break_dance.fbx', (a) => this._animations.push(this._mixer.clipAction(a.animations[0])));
        });
    }

    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }

    _animate() {
        requestAnimationFrame(()=>{
            this._animate()
            const delta = this._clock.getDelta();
            if (this._mixer) {
                this._mixer.update( delta );
            }
            this._render()
        });
    }

    _render(){
        this._threejs.render( this._scene, this._camera );
    }

    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;
        if (this._mixers) {
            this._mixers.map(m => m.update(timeElapsedS));
        }

        if (this._controls) {
            this._controls.Update(timeElapsedS);
        }
    }
}


// function clone( source ) {

// 	const sourceLookup = new Map();
// 	const cloneLookup = new Map();

// 	const clone = source.clone();

// 	parallelTraverse( source, clone, function ( sourceNode, clonedNode ) {

// 		sourceLookup.set( clonedNode, sourceNode );
// 		cloneLookup.set( sourceNode, clonedNode );

// 	} );

// 	clone.traverse( function ( node ) {

// 		if ( ! node.isSkinnedMesh ) return;

// 		const clonedMesh = node;
// 		const sourceMesh = sourceLookup.get( node );
// 		const sourceBones = sourceMesh.skeleton.bones;

// 		clonedMesh.skeleton = sourceMesh.skeleton.clone();
// 		clonedMesh.bindMatrix.copy( sourceMesh.bindMatrix );

// 		clonedMesh.skeleton.bones = sourceBones.map( function ( bone ) {

// 			return cloneLookup.get( bone );

// 		} );

// 		clonedMesh.bind( clonedMesh.skeleton, clonedMesh.bindMatrix );

// 	} );

// 	return clone;

// }

// function parallelTraverse( a, b, callback ) {

// 	callback( a, b );

// 	for ( let i = 0; i < a.children.length; i ++ ) {

// 		parallelTraverse( a.children[ i ], b.children[ i ], callback );

// 	}

// }




















/*

How to structure the project:
Issues: how is a card supposed to access the scene? How are the drag controls supposed to access the cards and the scene?

manager objects?

card manager - creates cards, and has methods to add/remove cards


communicate by events? when drag controls needs to do something, it emits an event, and then other objects listen to that event?


Should everything be driven by events? Like listening for different events to occur, and then doing actions based on that?
I dont think being event driven is great. Things come in out of order and i think it is harder to track and log. I would prefer being able to step through the code one by one / procedurally

*/