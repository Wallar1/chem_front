import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';


export function skyboxScene() {
    let container, camera, scene, renderer, controls;
    let enableSelection = false;
    let proxy;
    const objects = [];
    let running;
    let mixer;
    let modelReady = false

    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    init();

    const cameraOffset = 50

    function init() {

        camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 5000 );
        camera.position.z = 90;
        camera.position.x = 0
        camera.position.y = 20
        console.log(camera)
        

        scene = new THREE.Scene();
        const light = new THREE.AmbientLight( 0x404040 ); // soft white light
        scene.add( light );
        // scene.background = new THREE.CubeTextureLoader()
        // .setPath( '/sky_box_background/' )
        // .load( [
        //     'px.png',
        //     'nx.png',
        //     'py.png',
        //     'ny.png',
        //     'pz.png',
        //     'nz.png'
        // ] );
        

        // let colors = [0x621d96, 0x5487ab, 0xa3365a]
        let colors = [0xa3365a, 0xa3365a, 0xa3365a]
        let positions = [[0,40,0], [-20, -30, 0], [20, -30, 0]]
        let angles = [Math.PI / 9, Math.PI / 9, Math.PI / 9]
        for (let i=0; i<3; i++) {
            let light = new THREE.DirectionalLight( colors[i] );
            let [x,y,z] = positions[i]
            light.position.set(x, y, z);
            light.angle = angles[i];
            light.castShadow = true;
            light.shadow.camera.near = 1000;
            light.shadow.camera.far = 4000;
            light.shadow.mapSize.width = 1024;
            light.shadow.mapSize.height = 1024;
            scene.add( light );

            // let directionalLightHelper = new THREE.DirectionalLightHelper( light, 10 );
            // scene.add( directionalLightHelper );
        }

        const geometry = new THREE.SphereGeometry( 3, 32, 16 );
        const count = geometry.attributes.position.count;
        geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array( count * 3 ), 3 ) );
        const material = new THREE.MeshStandardMaterial({'metalness': 0.7,
                                                         'roughness': 0.2});
        // This adds the Balls to the screen                             
        for (let x=-500; x<501; x+= 25) {
            for (let y=-500; y<501; y+=25) {
                for (let z=-500; z<501; z+=25) {
                    let mesh = new THREE.Mesh( geometry, material );
                    mesh.position.x = x;
                    mesh.position.y = y
                    mesh.position.z = z
                    scene.add( mesh );
                }
            }
        }

        let canvas = document.createElement( 'canvas' );
        canvas.style.position = 'sticky'
        canvas.style.top = 0
        canvas.style.bottom = 0
        renderer = new THREE.WebGLRenderer( {'alpha': true, 'canvas': canvas} );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );

        // renderer.shadowMap.enabled = true;
        // renderer.shadowMap.type = THREE.PCFShadowMap;

        document.querySelector('body').appendChild( renderer.domElement );
        const ambient = new THREE.AmbientLight( 0xffffff );
        scene.add( ambient );
        const pointLight = new THREE.PointLight( 0xffffff, 2 );
        scene.add( pointLight );
        
        // These are the orbit controls
        // const controls = new OrbitControls( camera, renderer.domElement );
        // controls.enableZoom = false;
        // controls.enablePan = false;
        // controls.minPolarAngle = Math.PI / 4;
        // controls.maxPolarAngle = Math.PI / 1.5;
        
        // This is where we load the running model
        // loadAnimatedModel()
    }

    function loadAnimatedModel() {
        const loader = new FBXLoader()
        loader.load('Running.fbx', (fbx) => {
            fbx.position.y = 0
            fbx.position.z = -100
            fbx.children.forEach(c => {
                c.position.y = 0
                c.position.z = 0
            })
            console.log(fbx)
            const anim = new FBXLoader()

            const skeleton = new THREE.SkeletonHelper( fbx );
            skeleton.visible = false;
            scene.add( skeleton );

            mixer = new THREE.AnimationMixer(fbx)
            running = mixer.clipAction(fbx.animations[0], fbx)
            running.play()
            console.log(running)
            // anim.load('fast_run_anim.fbx', (anim) => {
            //     const mixer = new THREE.AnimationMixer(fbx)
            //     running = mixer.clipAction(anim.animations[0], fbx)
            //     mixer.addEventListener( 'loop', (e) => console.log(e) )
            //     mixer.addEventListener( 'finished', (e) => console.log(e) )
            //     running.play()
            //     console.log(running._localRoot)
            // })
            // fbx.traverse(c => c.castShadow = true)
            scene.add(fbx)
            modelReady = true
        })
    }


    // Add raycaster for the mouse
    function onMouseMove( event ) {

        // calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
        camera.position.x = mouse.x * 30
        camera.position.y = mouse.y * 30
        render()
    }
    // window.addEventListener( 'mousemove', onMouseMove, false );
    var initial_time = Date.now()
    const clock = new THREE.Clock()

    let y = 0
    const animate = function () {
        // if (Date.now() < initial_time + 3000) {
        //     requestAnimationFrame( animate );
        // }
        // if (camera.position.x > 400) {
        //     camera.position.x = -400
        // } else {
        //     camera.position.x += 1
        // }
        requestAnimationFrame( animate );
        if (modelReady) mixer.update(clock.getDelta())

        camera.position.y = Math.sin(y+=.1) * 3
        camera.position.x += 1
        render()
    };
    animate()

    function render() {
        renderer.render( scene, camera );
    }

    // document.addEventListener('scroll', () => {
    //     camera.position.y = Math.sin(document.querySelector('canvas').getBoundingClientRect().top/50) * 3
    //     camera.position.x += 1
    // })
}
