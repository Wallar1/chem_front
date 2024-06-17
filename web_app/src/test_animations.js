import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class CharacterControllerDemo {
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

        document.body.appendChild(this._threejs.domElement);

        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false);

        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 1000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(25, 10, 25);

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

        const controls = new OrbitControls(
            this._camera, this._threejs.domElement);
        controls.target.set(0, 10, 0);
        controls.update();

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
            new THREE.PlaneGeometry(100, 100, 10, 10),
            new THREE.MeshStandardMaterial({
                color: 0x808080,
            }));
        plane.castShadow = false;
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this._scene.add(plane);

        this._previousRAF = null;
        this._animations = []
        this._LoadModels();
        this._animate();

        document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
    }

    _get_animation() {
        return this._model.animations[Math.floor(Math.random() * 2)]
    }

    _onKeyDown(event) {
        event.preventDefault()
        if (event.keyCode === 32) {
            // SPACE
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

            this._model = clone( fbx );
            this._mixer = new THREE.AnimationMixer(this._model);
            
            this._add_animation('strut_walk.fbx')
            this._add_animation('fast_run.fbx')
            this._scene.add(this._model)
            
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
            this._threejs.render( this._scene, this._camera );
        });
    }

    // _Step(timeElapsed) {
    //     const timeElapsedS = timeElapsed * 0.001;
    //     if (this._mixers) {
    //         this._mixers.map(m => m.update(timeElapsedS));
    //     }

    //     if (this._controls) {
    //         this._controls.Update(timeElapsedS);
    //     }
    // }
}


function clone( source ) {

	const sourceLookup = new Map();
	const cloneLookup = new Map();

	const clone = source.clone();

	parallelTraverse( source, clone, function ( sourceNode, clonedNode ) {

		sourceLookup.set( clonedNode, sourceNode );
		cloneLookup.set( sourceNode, clonedNode );

	} );

	clone.traverse( function ( node ) {

		if ( ! node.isSkinnedMesh ) return;

		const clonedMesh = node;
		const sourceMesh = sourceLookup.get( node );
		const sourceBones = sourceMesh.skeleton.bones;

		clonedMesh.skeleton = sourceMesh.skeleton.clone();
		clonedMesh.bindMatrix.copy( sourceMesh.bindMatrix );

		clonedMesh.skeleton.bones = sourceBones.map( function ( bone ) {

			return cloneLookup.get( bone );

		} );

		clonedMesh.bind( clonedMesh.skeleton, clonedMesh.bindMatrix );

	} );

	return clone;

}

function parallelTraverse( a, b, callback ) {

	callback( a, b );

	for ( let i = 0; i < a.children.length; i ++ ) {

		parallelTraverse( a.children[ i ], b.children[ i ], callback );

	}

}