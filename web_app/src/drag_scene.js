import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';


export function dragScene() {
    let container, camera, scene, renderer, controls;
    let enableSelection = false;
    let proxy
    const objects = [];

    const mouse = new THREE.Vector2(), raycaster = new THREE.Raycaster();

    init();

    const cameraOffset = 50

    function init() {

        container = document.createElement( 'div' );
        document.body.appendChild( container );

        camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 5000 );
        camera.position.z = 100;
        camera.position.x = 50
        

        scene = new THREE.Scene();
        scene.background = new THREE.Color( 0xf0f0f0 );

        scene.add( new THREE.AmbientLight( 0x505050 ) );

        const light = new THREE.SpotLight( 0xffffff, 1.5 );
        light.position.set( 0, 500, 2000 );
        light.angle = Math.PI / 9;

        light.castShadow = true;
        light.shadow.camera.near = 1000;
        light.shadow.camera.far = 4000;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;

        scene.add( light );

        // const bigPlane = new THREE.PlaneGeometry(1000,1000)
        // const bg = new THREE.Mesh( bigPlane, new THREE.MeshLambertMaterial( { color: 0xffffff } ) );


        const planeGeometry = new THREE.PlaneGeometry( 20, 30 );

        for ( let i = 0; i < 5; i ++ ) {

            const object = new THREE.Mesh( planeGeometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
            object.position.y = -50
            object.position.x = i * 25
            object.position.z = 0

            object.rotation.x = 0
            object.rotation.y = 0
            object.rotation.z = 0
            
            object.scale.x = 1
            object.scale.y = 1
            object.scale.z = 1

            object.castShadow = true;
            object.receiveShadow = true;

            scene.add( object );
            objects.push( object );

        }


        

        renderer = new THREE.WebGLRenderer( { antialias: true } );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;

        container.appendChild( renderer.domElement );

        controls = new DragControls( [ ... objects ], camera, renderer.domElement );

        controls.addEventListener( 'drag', onDrag );
        window.addEventListener( 'resize', onWindowResize );
        document.addEventListener( 'pointermove', onPointerMove );

        // document.addEventListener( 'click', onClick );
        // window.addEventListener( 'keydown', onKeyDown );
        // window.addEventListener( 'keyup', onKeyUp );

        const taurusGeometry = new THREE.TorusKnotGeometry( 10, 3, 100, 16 );
        const material = new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } );
        const torusKnot = new THREE.Mesh( taurusGeometry, material );
        scene.add( torusKnot );
        controls._objects.push(torusKnot)

        render();

    }


    function onPointerMove( event ) {
        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
        raycaster.setFromCamera( mouse, camera );
    }

    function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );

        render();

    }

    function onKeyDown( event ) {

    }

    function onKeyUp() {

    }

    function onDrag( event ) {
        // console.log(event)

        // event.preventDefault();


        // const draggableObjects = controls.getObjects();
        const intersections = raycaster.intersectObjects( objects, true );
        if (intersections.length > 1) {
            let blendedColor = blendColors(intersections.map(int => int.object.material.color))
            intersections.forEach(intersection => intersection.object.material.color = blendedColor)
        }

        render();

    }

    function render() {
        renderer.render( scene, camera );

    }

    function blendColors(colors) {
        const blended = {}
        const sumReducer = (r_g_or_b, previousValue, currentValue) => previousValue[r_g_or_b] + currentValue[r_g_or_b]

        const len = colors.length
        blended['r'] = colors.reduce(sumReducer.bind(null, 'r')) / len
        blended['g'] = colors.reduce(sumReducer.bind(null, 'g')) / len
        blended['b'] = colors.reduce(sumReducer.bind(null, 'b')) / len
        return blended
    }
}
