import * as THREE from 'three';

export let name;

export function InitialScene() {
    const scene = new THREE.Scene();
    const SCENE_WIDTH = window.innerWidth
    const SCENE_HEIGHT = window.innerHeight * .75
    const camera = new THREE.PerspectiveCamera( 75, SCENE_WIDTH / SCENE_HEIGHT, 1, 3500 );
    camera.position.z = 1000;
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize( SCENE_WIDTH, SCENE_HEIGHT );
    document.body.appendChild( renderer.domElement );



    // Add the card to the scene
    const geometry = new THREE.PlaneGeometry(2000, 3000);
    const card_texture = new THREE.TextureLoader().load('prof_pic.jpg')
    const material = new THREE.MeshStandardMaterial( { map: card_texture } );
    const card = new THREE.Mesh( geometry, material );
    scene.add( card );



    // Add lights
    const light1 = new THREE.DirectionalLight( 0xffffff, 0.5 );
    light1.position.set( 1, 1, 1 );
    scene.add( light1 );
    const light2 = new THREE.DirectionalLight( 0xffffff, 1.5 );
    light2.position.set( 0, - 1, 0 );
    scene.add( light2 );

    // const gridHelper = new THREE.GridHelper(200, 50)
    // scene.add(gridHelper)
    // const controls = new OrbitControls(camera, renderer.domElement)

    const add_triangles = function() {
        const triangles = 5000;

        let geometry = new THREE.BufferGeometry();

        const positions = new Float32Array( triangles * 3 * 3 );
        const normals = new Float32Array( triangles * 3 * 3 );
        const colors = new Float32Array( triangles * 3 * 3 );

        const color = new THREE.Color();

        const n = 800, n2 = n / 2;	// triangles spread in the cube
        const d = 120, d2 = d / 2;	// individual triangle size

        const pA = new THREE.Vector3();
        const pB = new THREE.Vector3();
        const pC = new THREE.Vector3();

        const cb = new THREE.Vector3();
        const ab = new THREE.Vector3();

        for ( let i = 0; i < positions.length; i += 9 ) {

            // positions

            const x = Math.random() * n - n2;
            const y = Math.random() * n - n2;
            const z = Math.random() * n - n2;

            const ax = x + Math.random() * d - d2;
            const ay = y + Math.random() * d - d2;
            const az = z + Math.random() * d - d2;

            const bx = x + Math.random() * d - d2;
            const by = y + Math.random() * d - d2;
            const bz = z + Math.random() * d - d2;

            const cx = x + Math.random() * d - d2;
            const cy = y + Math.random() * d - d2;
            const cz = z + Math.random() * d - d2;

            positions[ i ] = ax;
            positions[ i + 1 ] = ay;
            positions[ i + 2 ] = az;

            positions[ i + 3 ] = bx;
            positions[ i + 4 ] = by;
            positions[ i + 5 ] = bz;

            positions[ i + 6 ] = cx;
            positions[ i + 7 ] = cy;
            positions[ i + 8 ] = cz;

            // flat face normals

            pA.set( ax, ay, az );
            pB.set( bx, by, bz );
            pC.set( cx, cy, cz );

            cb.subVectors( pC, pB );
            ab.subVectors( pA, pB );
            cb.cross( ab );

            cb.normalize();

            const nx = cb.x;
            const ny = cb.y;
            const nz = cb.z;

            normals[ i ] = nx;
            normals[ i + 1 ] = ny;
            normals[ i + 2 ] = nz;

            normals[ i + 3 ] = nx;
            normals[ i + 4 ] = ny;
            normals[ i + 5 ] = nz;

            normals[ i + 6 ] = nx;
            normals[ i + 7 ] = ny;
            normals[ i + 8 ] = nz;

            // colors

            const vx = ( x / n ) + 0.5;
            const vy = ( y / n ) + 0.5;
            const vz = ( z / n ) + 0.5;

            color.setRGB( vx, vy, vz );

            colors[ i ] = color.r;
            colors[ i + 1 ] = color.g;
            colors[ i + 2 ] = color.b;

            colors[ i + 3 ] = color.r;
            colors[ i + 4 ] = color.g;
            colors[ i + 5 ] = color.b;

            colors[ i + 6 ] = color.r;
            colors[ i + 7 ] = color.g;
            colors[ i + 8 ] = color.b;

        }

        geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
        geometry.setAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
        geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );

        geometry.computeBoundingSphere();

        let material = new THREE.MeshPhongMaterial( {
            color: 0xaaaaaa, specular: 0xffffff, shininess: 250,
            side: THREE.DoubleSide, vertexColors: true
        } );

        const mesh = new THREE.Mesh( geometry, material );
        scene.add( mesh );
    }

    // add_triangles()



    // Add raycaster for the mouse
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    function onMouseMove( event ) {

        // calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    }
    window.addEventListener( 'mousemove', onMouseMove, false );


    var rotation_direction = 1
    const animate = function () {
        requestAnimationFrame( animate );
        /* 
        rotate the card depending on which half the mouse is on
        */
        // update the picking ray with the camera and mouse position
        raycaster.setFromCamera( mouse, camera );
        const intersects = raycaster.intersectObjects( scene.children );
        intersects.forEach((intersection) => {
            const obj = intersection.object
            const rayPos = raycaster.ray.direction
            if (obj.rotation.y > -.1 && obj.position.x > rayPos.x) {
                obj.rotation.y -= 0.005
                console.log('left')
            } else if (obj.rotation.y < .1 && obj.position.x < rayPos.x){
                obj.rotation.y += 0.005
                console.log('right')
            }
        })


        renderer.render( scene, camera );
        // controls.update()
    };

    animate();
}