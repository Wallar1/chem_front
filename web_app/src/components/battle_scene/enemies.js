import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { get } from 'svelte/store';

import { GameObj, proxy_handler, check_collisions, Updater } from './objects.js';
import { store } from './store.js';
import { earth_radius } from './constants.js';
import { get_random_from_probilities } from '../../helper_functions.js'
import { blast_projectile } from './projectile.js';
import { spawn_lab_at_surface_quaternion } from './lab.js';
import {
    apply_surface_knockback,
    get_chase_target_with_angle_offset as chase_target_with_angle_offset,
    rotate_parent_toward_world_point as rotate_parent_on_surface,
} from './enemy-surface.js';

const AXE_DAMAGE = 5;
const AXE_KNOCKBACK_RADIANS = 0.1;
const AXE_KNOCKBACK_DURATION = 0.28;
const AXE_KNOCKBACK_LIFT = 50;
const AXE_STUN_SECONDS = 0.35;
const _zone_center_vector = new THREE.Vector3(0, 0, earth_radius);


var fbx_loader = new FBXLoader();


function load_texture_async() {
    if (store.enemy_models['texture']) {
        return Promise.resolve(store.enemy_models['texture']);
    }
    return new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(
            'low_poly_characters/Textures/texture.png',
            (texture) => {
                store.enemy_models['texture'] = texture;
                store.enemy_models['material'] = new THREE.MeshStandardMaterial({ map: texture });
                resolve(texture);
            },
            undefined,
            reject
        );
    });
}

function load_texture() {
    load_texture_async();
}

function apply_enemy_material(object) {
    const material = store.enemy_models['material'];
    object.traverse(c => {
        c.castShadow = true;
        if (c.isMesh) {
            c.material = material;
        }
    });
}

function ensure_model_template(model_name, scale) {
    return load_texture_async().then(() => {
        if (store.enemy_models[model_name]) {
            apply_enemy_material(store.enemy_models[model_name]);
            return store.enemy_models[model_name];
        }
        return new Promise((resolve, reject) => {
            fbx_loader.load(`https://chem-game.s3.amazonaws.com/character-models/${model_name}.fbx`, (fbx_model) => {
                fbx_model.scale.setScalar(scale);
                apply_enemy_material(fbx_model);
                store.enemy_models[model_name] = fbx_model;
                resolve(fbx_model);
            }, undefined, reject);
        });
    });
}

function load_model(model_name, scale) {
    return ensure_model_template(model_name, scale).then(template => SkeletonUtils.clone(template))
}

function load_animation(file_path) {
    return new Promise((resolve, reject) => {
        if (store.enemy_models[file_path]) {
            return resolve(store.enemy_models[file_path])
        }
        fbx_loader.load(file_path, (anim) => {
            store.enemy_models[file_path] = anim
            resolve(anim)
        }, undefined, reject)
    })
}

function preload_battle_assets() {
    const animation_paths = [...new Set(MODEL_CONFIGS.map(model => model.animation_name))];
    const tasks = [
        load_texture_async(),
        ...MODEL_CONFIGS.map(model => ensure_model_template(model.model_name, model.scale)),
        ...animation_paths.map(load_animation),
    ];
    const total = tasks.length;
    let loaded = 0;

    store.battle_assets_preload.set({ loaded: 0, total, complete: false });

    const track = (promise) => promise.then((result) => {
        loaded += 1;
        store.battle_assets_preload.set({
            loaded,
            total,
            complete: loaded >= total,
        });
        return result;
    });

    return Promise.all(tasks.map(track));
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
        store.global_updates_queue.push(updater)
        resolve(fbx_model)
    })
}

const health_bar_material = new THREE.MeshToonMaterial( {color: 0x00ff00} );

const MODEL_CONFIGS = [
    {
        'model_name': 'Female Blue',
        'animation_name': 'https://chem-game.s3.amazonaws.com/animations/walking.fbx',
        'scale': 0.5,
        'initial_health': 100,
        'health_bar_z': -120,
        'damage': 15,
        'probability': 10,
        'movement_pattern': 'jump',
    },
    {
        'model_name': 'Professor Gold',
        'animation_name': 'https://chem-game.s3.amazonaws.com/animations/menace_walking.fbx',
        'scale': 0.7,
        'initial_health': 200,
        'health_bar_z': -180,
        'damage': 10,
        'probability': 5,
        'movement_pattern': 'weave',
    },
    {
        'model_name': 'Male Blue',
        'animation_name': 'https://chem-game.s3.amazonaws.com/animations/crouch_walk.fbx',
        'scale': 0.3,
        'initial_health': 50,
        'health_bar_z': -70,
        'damage': 12,
        'probability': 20,
        'movement_pattern': 'fast',
    },
    {
        'model_name': 'Robot 4 Blue',
        'animation_name': 'https://chem-game.s3.amazonaws.com/animations/wheelbarrow_walk.fbx',
        'scale': 1.0,
        'initial_health': 500,
        'health_bar_z': -270,
        'damage': 15,
        'probability': 1,
        'movement_pattern': 'jerky',
    },
]

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
            damage,
            movement_pattern,
        } = this.get_random_model()
        this.damage = damage;
        this.movement_pattern = movement_pattern ?? 'smooth';
        this.health = this.full_health = initial_health;

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
        if (typeof this.health !== 'number' || Number.isNaN(this.health)) {
            return;
        }
        this.health -= dmg
        if (this.health <= 0) {
            store.player_score += 1;
            if (this.parent?.quaternion) {
                spawn_lab_at_surface_quaternion(this.parent.quaternion.clone());
            }
            this.should_delete = true;
            return
        }
        if (this.health_bar) {
            this.health_bar.scale.set(1, this.health/this.full_health, 1)
        }
    }

    collide(collided_obj) {
        this.take_damage(collided_obj.damage)
    }

    check_collisions(collision_elements) {
        return check_collisions(this.mesh, collision_elements)
    }

    get_zone_world_center() {
        if (!this.zone) {
            return null;
        }
        return _zone_center_vector.clone().applyQuaternion(this.zone.center_quaternion);
    }

    is_player_in_zone() {
        if (!this.zone) {
            return true;
        }
        const camera_world_pos = store.camera.getWorldPosition(new THREE.Vector3());
        const zone_center = this.get_zone_world_center();
        return camera_world_pos.distanceTo(zone_center) < this.zone.aggro_radius;
    }

    rotate_parent_toward_world_point(target_world_pos, earth_radius, time_delta, speed_multiplier = 1) {
        const enemy_world_pos = this.getWorldPosition(new THREE.Vector3());
        rotate_parent_on_surface(
            this.parent,
            enemy_world_pos,
            target_world_pos,
            earth_radius,
            time_delta,
            speed_multiplier,
        );
    }

    face_toward_camera(dir_to_camera_world) {
        const enemy_forward = new THREE.Vector3(0, 1, 0);
        const forward_relative_to_world = this.localToWorld(enemy_forward.clone());
        const up = new THREE.Vector3(0, 0, -1);
        const up_in_world = this.localToWorld(up.clone());
        const project_dir_in_world = dir_to_camera_world.clone().projectOnPlane(up_in_world.normalize());
        const added = this.getWorldPosition(new THREE.Vector3()).add(project_dir_in_world);
        const local_added = this.worldToLocal(added);
        const local_forward = this.worldToLocal(forward_relative_to_world);
        const angle = local_added.angleTo(local_forward);
        const cross = new THREE.Vector3().crossVectors(local_forward, local_added);

        if (angle > 0.01) {
            this.rotateZ(Math.sign(cross.z) * 0.02);
            this.updateMatrixWorld(true);
        }
    }

    guard_zone(state, time_delta, earth_radius) {
        const zone_center = this.get_zone_world_center();
        const enemy_world_pos = this.getWorldPosition(new THREE.Vector3());
        const guard_radius = this.zone.aggro_radius * 0.4;
        if (enemy_world_pos.distanceTo(zone_center) < guard_radius) {
            return state;
        }
        this.rotate_parent_toward_world_point(zone_center, earth_radius, time_delta, 0.5);
        return state;
    }

    get_chase_target_with_angle_offset(target_world_pos, angle_offset_radians) {
        const enemy_world_pos = this.getWorldPosition(new THREE.Vector3());
        return chase_target_with_angle_offset(enemy_world_pos, target_world_pos, angle_offset_radians);
    }

    move_toward_target(target_world_pos, earth_radius, time_delta, speed_multiplier) {
        this.rotate_parent_toward_world_point(target_world_pos, earth_radius, time_delta, speed_multiplier);
    }

    apply_movement_pattern(pattern, target_world_pos, earth_radius, time_delta, state) {
        switch (pattern) {
            case 'jerky':
                return this.move_jerky(target_world_pos, earth_radius, time_delta, state);
            case 'fast':
                this.move_toward_target(target_world_pos, earth_radius, time_delta, 2.1);
                return state;
            case 'jump':
                return this.move_jumping(target_world_pos, earth_radius, time_delta, state);
            case 'weave':
                return this.move_weaving(target_world_pos, earth_radius, time_delta, state);
            default:
                this.move_toward_target(target_world_pos, earth_radius, time_delta, 1);
                return state;
        }
    }

    move_jerky(target_world_pos, earth_radius, time_delta, state) {
        state.jerky_timer = (state.jerky_timer ?? 0) + time_delta;
        const phase_duration = state.jerky_bursting
            ? (state.jerky_burst_duration ?? 0.18)
            : (state.jerky_pause_duration ?? 0.8);

        if (state.jerky_timer >= phase_duration) {
            state.jerky_bursting = !state.jerky_bursting;
            state.jerky_timer = 0;
            if (state.jerky_bursting) {
                state.jerky_burst_duration = 0.1 + Math.random() * 0.15;
            } else {
                state.jerky_pause_duration = 0.5 + Math.random() * 0.7;
            }
        }

        if (state.jerky_bursting) {
            this.move_toward_target(target_world_pos, earth_radius, time_delta, 1.1);
        }
        return state;
    }

    move_jumping(target_world_pos, earth_radius, time_delta, state) {
        if (state.base_z === undefined) {
            state.base_z = this.position.z;
        }
        state.jump_timer = (state.jump_timer ?? 0) + time_delta;

        if (!state.jump_airborne) {
            this.position.z = state.base_z;
            if (state.jump_timer >= (state.jump_cooldown ?? 0.55)) {
                state.jump_airborne = true;
                state.jump_timer = 0;
                state.jump_duration = 0.26 + Math.random() * 0.2;
                state.jump_angle = (Math.random() - 0.5) * 0.9;
                state.jump_lift = 45 + Math.random() * 25;
            }
            return state;
        }

        const jump_progress = state.jump_timer / state.jump_duration;
        if (jump_progress >= 1) {
            state.jump_airborne = false;
            state.jump_timer = 0;
            state.jump_cooldown = 0.5 + Math.random() * 0.4;
            this.position.z = state.base_z;
            return state;
        }

        const angled_target = this.get_chase_target_with_angle_offset(target_world_pos, state.jump_angle);
        this.move_toward_target(angled_target, earth_radius, time_delta, 4.6);
        this.position.z = state.base_z + Math.sin(jump_progress * Math.PI) * state.jump_lift;
        return state;
    }

    move_weaving(target_world_pos, earth_radius, time_delta, state) {
        state.weave_timer = (state.weave_timer ?? 0) + time_delta;
        const weave_period = 1.4;
        const weave_angle = Math.sin((state.weave_timer / weave_period) * Math.PI * 2) * 0.45;
        const woven_target = this.get_chase_target_with_angle_offset(target_world_pos, weave_angle);
        this.move_toward_target(woven_target, earth_radius, time_delta, 0.85);
        return state;
    }

    apply_axe_knockback(tangent_knockback_world) {
        if (tangent_knockback_world.lengthSq() < 1e-6) {
            return;
        }
        if (this.knockback_updater) {
            this.knockback_updater.state.finished = true;
        }

        const enemy = this;
        const tangent = tangent_knockback_world.clone().normalize();
        const updater = new Updater((state, time_delta) => {
            if (enemy.should_delete) {
                enemy.position.z = state.base_z;
                return { ...state, finished: true };
            }

            state.elapsed += time_delta;
            const linear_progress = Math.min(state.elapsed / AXE_KNOCKBACK_DURATION, 1);
            const eased_progress = 1 - Math.pow(1 - linear_progress, 2);
            const delta_radians = AXE_KNOCKBACK_RADIANS * (eased_progress - state.eased_progress);

            if (delta_radians > 0) {
                apply_surface_knockback(enemy.parent, tangent, earth_radius, delta_radians);
                state.eased_progress = eased_progress;
            }

            enemy.position.z = state.base_z + Math.sin(linear_progress * Math.PI) * AXE_KNOCKBACK_LIFT;

            if (linear_progress >= 1) {
                enemy.position.z = state.base_z;
                return { ...state, finished: true };
            }
            return state;
        }, {
            finished: false,
            elapsed: 0,
            eased_progress: 0,
            base_z: this.position.z,
        });

        store.global_updates_queue.push(updater);
        this.knockback_updater = updater;
    }

    hit_by_axe() {
        this.take_damage(AXE_DAMAGE);
        if (this.should_delete) {
            return;
        }

        const enemy_world_pos = this.getWorldPosition(new THREE.Vector3());
        const surface_normal = enemy_world_pos.clone().normalize();
        const player_facing_world = store.camera.getWorldDirection(new THREE.Vector3());
        const tangent_knockback = player_facing_world.clone().projectOnPlane(surface_normal);
        if (tangent_knockback.lengthSq() >= 1e-6) {
            this.apply_axe_knockback(tangent_knockback);
        }

        if (this.movement_updater) {
            this.movement_updater.state.stunned = true;
            const enemy = this;
            const updater = new Updater((stun_state, stun_time_delta) => {
                stun_state.total_time += stun_time_delta;
                if (stun_state.total_time >= AXE_STUN_SECONDS) {
                    enemy.movement_updater.state.stunned = false;
                    return { finished: true, total_time: stun_state.total_time };
                }
                return { finished: false, total_time: stun_state.total_time };
            }, { finished: false, total_time: 0 });
            store.global_updates_queue.push(updater);
        }
    }

    start_moving(earth_radius) {
        function move_enemy(state, time_delta) {
            /*
            The up direction is the plane's normal (the plane that is tangent to the earth at the enemy's position).
            We get the direction to the player and then project it onto the plane, and then move one step in that direction
            */
            let {enemy, stunned} = state
            if (enemy.should_delete) {
                store.enemies = store.enemies.filter(e => e !== enemy)
                if (!store.enemies.length) {
                    let current_game_state = get(store.game_state)
                    current_game_state['state'] = store.GameStates.GAMEWON;
                    store.game_state.set(current_game_state)
                }
                return {finished: true, to_delete: [enemy]}
            }
    
            // cant move or hurt player when stunned
            if (stunned) return state;

            let camera_world_pos = store.camera.getWorldPosition(new THREE.Vector3())

            const advance_airborne_jump = () => {
                if (enemy.movement_pattern === 'jump' && state.jump_airborne) {
                    state = enemy.move_jumping(camera_world_pos, earth_radius, time_delta, state);
                }
            };

            if (!enemy.is_player_in_zone()) {
                advance_airborne_jump();
                return enemy.guard_zone(state, time_delta, earth_radius);
            }

            let enemy_world_pos = enemy.getWorldPosition(new THREE.Vector3())
            let dir_to_camera_world = new THREE.Vector3().subVectors(camera_world_pos, enemy_world_pos)
            const chase_radius = enemy.zone?.aggro_radius ?? earth_radius;
            if (dir_to_camera_world.lengthSq() > Math.pow(chase_radius, 2)) {
                advance_airborne_jump();
                return state
            }
            state = enemy.apply_movement_pattern(
                enemy.movement_pattern,
                camera_world_pos,
                earth_radius,
                time_delta,
                state,
            );
            enemy.face_toward_camera(dir_to_camera_world);
            let collisions = enemy.check_collisions([store.camera]);
            if (collisions.length) {
                enemy.damage_player();
            }
            return state
        }
        let updater = new Updater(move_enemy, {enemy: this, stunned: false})
        store.global_updates_queue.push(updater)
        this.movement_updater = updater;
    }

    damage_player(){
        if (store.player_is_invincible) {
            return;
        }
        store.player_health.update(health => Math.max(0, health - this.damage));
        if (get(store.player_health) <= 0) {
            let current_game_state = get(store.game_state)
            current_game_state['state'] = store.GameStates.GAMELOST;
            store.game_state.set(current_game_state)
        }
        // prevent player from taking too much damage
        store.player_is_invincible = true;
        const player_invincibility_seconds = 1;
        let remove_player_invincibility = (state, time_delta) => {
            let { total_time } = state;
            total_time += time_delta;
            if (total_time >= player_invincibility_seconds) {
                store.player_is_invincible  = false;
                return {finished: true}
            }
            return {finished: false, total_time}
        }
        // TODO: this is a very common pattern, should there be an easier way to create it?
        const updater = new Updater(remove_player_invincibility, {finished: false, total_time: 0})
        store.global_updates_queue.push(updater)
    }


    // TODO: these enemies should have different scales, speeds, movement patterns, and attacks
    get_random_model() {
        const probs = {}
        for (const model of MODEL_CONFIGS) {
            probs[model['model_name']] = model['probability']
        }
        let random_model = get_random_from_probilities(probs)
        let ret_model = {}
        for (const model of MODEL_CONFIGS) {
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





function fire_enemy_projectile(){
    // const initial_pos = new THREE.Vector3(0, 20, -200);
    // const velocity = new THREE.Vector3(0, 5, 5);
    // const onclick = (projectile) => {
    //     projectile.mesh.material.color.set('#eb4034')
    // }
    // let projectile = new Projectile(sphere_geometry, toon_material, initial_pos, velocity, onclick)
    // scene.add(projectile.mesh)
    // let updater = new Updater(blast_projectile, {projectile: projectile})
    // store.global_updates_queue.push(updater)
}


export {
    create_enemy,
    MODEL_CONFIGS,
    load_texture,
    load_model,
    update_animation,
    preload_battle_assets,
    Enemy,
    AXE_DAMAGE,
    AXE_KNOCKBACK_RADIANS,
    AXE_KNOCKBACK_DURATION,
}


