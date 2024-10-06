import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

import { get } from 'svelte/store';

import { GameObj, proxy_handler, check_collisions, Updater, add_to_global_updates_queue } from './objects';
import { player_score, player_health, player_is_invincible, enemies, game_state, GameStates } from './stores.js';
import { get_random_from_probilities } from './helper_functions.js'


var fbx_loader = new FBXLoader();


// TODO: load this cache first, then load the 100 objects
var cache = {
    'texture': undefined,
    'material': undefined,
}


function load_texture() {
    if (!cache['texture']) {
        cache['texture'] = new THREE.TextureLoader().load('low_poly_characters/Textures/texture.png');
        cache['material'] = new THREE.MeshStandardMaterial({map: cache['texture']})
    }
}

function load_model(model_name, scale) {
    // fbx_loader.setPath('./low_poly_characters/Models/');
    return new Promise((resolve, reject) => {
        if (cache[model_name]) {
            return resolve(cache[model_name])
        }
        fbx_loader.load(`https://chem-game.s3.amazonaws.com/character-models/${model_name}.fbx`, (fbx_model) => {
            fbx_model.scale.setScalar(scale);
            const material = cache['material'];
            fbx_model.traverse(c => {
                c.castShadow = true;
                if (c.isMesh) {
                    c.material = material;
                }
            });
            cache[model_name] = fbx_model
            resolve(fbx_model)
        })
    })
}

function load_animation(file_path) {

    return new Promise((resolve, reject) => {
        if (cache[file_path]) {
            return resolve(cache[file_path])
        }
        fbx_loader.load(file_path, (anim) => {
            cache[file_path] = anim
            resolve(anim)
        })
    })
}

function update_animation(fbx_model, animation_name) {
    return new Promise((resolve, reject) => {
        let mixer = new THREE.AnimationMixer(fbx_model);
        // add_animation('capoeira.fbx', mixer, fbx_model)

        load_animation(animation_name).then(anim => {
            let action = mixer.clipAction(anim.animations[0])
            fbx_model.animations.push(action)
            action.startAt(Math.random()*2) // just to give a little variability
            action.play()
        })

        const update_mixer = (state, time_delta) => {
            let {mixer, finished} = state;
            mixer.update(time_delta)
            return {mixer, finished}
        }
        let updater = new Updater(update_mixer, {mixer, finished: false})
        add_to_global_updates_queue(updater)
        resolve(fbx_model)
    })
}

const health_bar_material = new THREE.MeshToonMaterial( {color: 0x00ff00} );

class Enemy extends GameObj {
    constructor() {
        super();
        this.should_delete = false;

        // We need a parent because the animations are relative to position 0, and move the model to the origin,
        // unless you give the model a parent. Then it can be relative to the parent, and you can move the parent around
        this.mesh = new THREE.Object3D()
        let {
            model_name,
            animation_name,
            scale,
            initial_health,
            health_bar_z,
            damage
        } = this.get_random_model()
        this.damage = damage;

        load_texture()
        load_model(model_name, scale)
            .then(fbx_model => update_animation(fbx_model, animation_name))
            .then(fbx_model => {
                this.mesh.add(fbx_model)
                this.fbx_model = fbx_model
                this.fbx_model.rotateX(-Math.PI/2)

                this.health = this.full_health = initial_health;
                // we cant have a global health bar geometry because we need to scale it
                let health_bar_geometry = new THREE.CylinderGeometry( 5, 5, 100, 10 );
                this.health_bar = new THREE.Mesh( health_bar_geometry, health_bar_material );
                this.mesh.add(this.health_bar);
                this.health_bar.rotateZ(Math.PI/2);
                this.health_bar.position.z = health_bar_z;
            })
    }

    initial_rotation() {
        // Otherwise the health bar is upside down
        this.mesh.rotateX(Math.PI);
        // this.forward = new THREE.Vector3(-1, 0, 0);
    }

    take_damage(dmg) {
        this.health -= dmg
        if (this.health <= 0) {
            let score = get(player_score);
            player_score.set(score + 1);
            this.should_delete = true;
            return
        }
        this.health_bar.scale.set(1, this.health/this.full_health, 1)
    }

    collide(collided_obj) {
        this.take_damage(collided_obj.damage)
    }

    check_collisions(collision_elements) {
        return check_collisions(this.mesh, collision_elements)
    }

    start_moving(camera, earth_radius) {
        // TODO: make it so the enemies dont move in a perfectly straight line, they zig zag. Also they jump
        function move_enemy(state, time_delta) {
            /*
            The up direction is the plane's normal (the plane that is tangent to the earth at the enemy's position).
            We get the direction to the player and then project it onto the plane, and then move one step in that direction
            */
            let {enemy, stunned} = state
            if (enemy.should_delete) {
                let _enemies = get(enemies)
                _enemies = _enemies.filter(e => e !== enemy)
                enemies.set(_enemies)
                if (!_enemies.length) {
                    let current_game_state = get(game_state)
                    current_game_state['state'] = GameStates.GAMEWON;
                    game_state.set(current_game_state)
                }
                return {finished: true, to_delete: [enemy]}
            }
    
            // cant move or hurt player when stunned
            if (stunned) return state;
    
            let camera_world_pos = camera.getWorldPosition(new THREE.Vector3())
            let enemy_world_pos = enemy.getWorldPosition(new THREE.Vector3())
            // rotate the enemy parent to move the enemy close to the camera
            let up_local_parent = new THREE.Vector3(0, 0, earth_radius)
            let dir_to_camera_world = new THREE.Vector3().subVectors(camera_world_pos, enemy_world_pos)
            // only move when the player is close
            if (dir_to_camera_world.lengthSq() > Math.pow(earth_radius)) {
                return state
            }
            let dir_to_camera_local_parent = enemy.parent.worldToLocal(dir_to_camera_world.clone()).normalize()
            let axis_of_rotation = new THREE.Vector3().crossVectors(up_local_parent, dir_to_camera_local_parent).normalize()
            let movement_multiplier = 1;
            let radians = movement_multiplier * Math.PI * time_delta/ 100;
            let quaternion = new THREE.Quaternion().setFromAxisAngle(axis_of_rotation, radians)
            enemy.parent.quaternion.multiply(quaternion);
            enemy.parent.updateMatrixWorld(true)
    
    
            // rotate the enemy to face the camera
            // Forward direction relative to the enemy (not their local space, but literally from the enemy)
            const enemy_forward = new THREE.Vector3(0, 1, 0);
            // Apply the object's rotation to the forward vector
            const forward_relative_to_world = enemy.localToWorld(enemy_forward.clone())
            // Get the angle between the forward vector and the direction to the camera
            const up = new THREE.Vector3(0, 0, -1);
            const up_in_world = enemy.localToWorld(up.clone())
            const project_dir_in_world = dir_to_camera_world.clone().projectOnPlane(up_in_world.normalize())
            const added = enemy.getWorldPosition(new THREE.Vector3()).add(project_dir_in_world)
    
            const local_added = enemy.worldToLocal(added)
            const local_forward = enemy.worldToLocal(forward_relative_to_world)
            const angle = local_added.angleTo(local_forward)
            
            const cross = new THREE.Vector3().crossVectors(local_forward, local_added)
    
            if (angle > 0.01 ) {
                // let quaternion2 = new THREE.Quaternion().setFromAxisAngle(enemy.localToWorld(up.clone()), .01)
                // enemy.quaternion.premultiply(quaternion2);
                enemy.rotateZ(Math.sign(cross.z) * .02)
                enemy.updateMatrixWorld(true);
            }
            let collisions = enemy.check_collisions([camera]);
            if (collisions.length) {
                enemy.damage_player();
            }
            return state
        }
        let updater = new Updater(move_enemy, {enemy: this, stunned: false})
        add_to_global_updates_queue(updater)
        this.movement_updater = updater;
    }

    damage_player(){
        if (get(player_is_invincible)) {
            return;
        }
        console.log('damaging palyer')
        let health = get(player_health);
        health = Math.max(0, health - this.damage);
        player_health.set(health)
        console.log(health)
        if (health <= 0) {
            let current_game_state = get(game_state)
            current_game_state['state'] = GameStates.GAMELOST;
            game_state.set(current_game_state)
        }
        // prevent player from taking too much damage
        player_is_invincible.set(true);
        const player_invincibility_seconds = 1;
        let remove_player_invincibility = (state, time_delta) => {
            let { total_time } = state;
            total_time += time_delta;
            if (total_time >= player_invincibility_seconds) {
                player_is_invincible.set(false)
                return {finished: true}
            }
            return {finished: false, total_time}
        }
        // TODO: this is a very common pattern, should there be an easier way to create it?
        const updater = new Updater(remove_player_invincibility, {finished: false, total_time: 0})
        add_to_global_updates_queue(updater)
    }


    // TODO: these enemies should have different scales, speeds, movement patterns, and attacks
    get_random_model() {
        const models = [
            {
                'model_name': 'Female Blue',
                'animation_name': 'https://chem-game.s3.amazonaws.com/animations/walking.fbx',
                'scale': 0.5,
                'initial_health': 100,
                'health_bar_z': -120,
                'damage': 15,
                'probability': 10,
            },
            {
                'model_name': 'Professor Gold',
                'animation_name': 'https://chem-game.s3.amazonaws.com/animations/menace_walking.fbx',
                'scale': 0.7,
                'initial_health': 200,
                'health_bar_z': -180,
                'damage': 10,
                'probability': 5
            },
            {
                'model_name': 'Male Blue',
                'animation_name': 'https://chem-game.s3.amazonaws.com/animations/crouch_walk.fbx',
                'scale': 0.3,
                'initial_health': 50,
                'health_bar_z': -70,
                'damage': 50,
                'probability': 20,
            },
            {
                'model_name': 'Robot 4 Blue',
                'animation_name': 'https://chem-game.s3.amazonaws.com/animations/wheelbarrow_walk.fbx',
                'scale': 1.0,
                'initial_health': 500,
                'health_bar_z': -270,
                'damage': 40,
                'probability': 1,
            },
        ]
        const probs = {}
        for (const model of models) {
            probs[model['model_name']] = model['probability']
        }
        let random_model = get_random_from_probilities(probs)
        let ret_model = {}
        for (const model of models) {
            if (model['model_name'] === random_model) {
                ret_model = model
            }
        }
        return ret_model
    }
}


function create_enemy(arg_dict) {
    let enemy = new Enemy(arg_dict)
    let proxy = new Proxy(enemy, proxy_handler('mesh'));
    // proxy.position.copy(arg_dict['position'])

    return proxy
}


export { create_enemy }