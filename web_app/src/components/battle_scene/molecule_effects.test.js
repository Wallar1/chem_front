import { describe, expect, it, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { store } from './store.js';
import {
    apply_poison,
    apply_splash,
    apply_explosion,
    apply_molecule_hit_effect,
    enemies_within_radius,
    MOLECULE_HIT_EFFECTS,
} from './molecule_effects.js';
import { poison_duration, poison_pulse_damage, splash_damage_ratio, explode_damage_ratio } from './constants.js';

function make_enemy({ x = 0, y = 0, z = 3000, health = 100 } = {}) {
    const mesh = new THREE.Object3D();
    mesh.position.set(x, y, z);
    mesh.updateMatrixWorld(true);
    return {
        should_delete: false,
        health,
        mesh,
        getWorldPosition(target) {
            return mesh.getWorldPosition(target);
        },
        take_damage: vi.fn(function (dmg) {
            this.health -= dmg;
            if (this.health <= 0) this.should_delete = true;
        }),
        apply_axe_knockback: vi.fn(),
    };
}

describe('molecule_effects', () => {
    beforeEach(() => {
        store.enemies = [];
        store.global_updates_queue = [];
        store.camera = {
            getWorldDirection: (v) => v.set(0, 1, 0),
        };
    });

    it('maps ammonia and cyanide to poison, water to splash, methane to explode', () => {
        expect(MOLECULE_HIT_EFFECTS.NH3).toBe('poison');
        expect(MOLECULE_HIT_EFFECTS.CN).toBe('poison');
        expect(MOLECULE_HIT_EFFECTS.H2O).toBe('splash');
        expect(MOLECULE_HIT_EFFECTS.CH4).toBe('explode');
    });

    it('queues poison pulses that damage over time', () => {
        const enemy = make_enemy();
        apply_poison(enemy);
        expect(store.global_updates_queue).toHaveLength(1);

        const updater = store.global_updates_queue[0];
        for (let i = 0; i < poison_duration; i++) {
            updater.update(1);
        }
        expect(enemy.take_damage).toHaveBeenCalledTimes(poison_duration);
        expect(enemy.take_damage).toHaveBeenCalledWith(poison_pulse_damage);
        expect(updater.state.finished).toBe(true);
    });

    it('splashes nearby enemies but not the primary target', () => {
        const primary = make_enemy({ x: 0, y: 0, z: 3000 });
        const nearby = make_enemy({ x: 100, y: 0, z: 3000 });
        const far = make_enemy({ x: 2000, y: 0, z: 3000 });
        store.enemies = [primary, nearby, far];

        const impact = new THREE.Vector3(0, 0, 3000);
        apply_splash(impact, 40, primary);

        expect(primary.take_damage).not.toHaveBeenCalled();
        expect(nearby.take_damage).toHaveBeenCalledWith(Math.round(40 * splash_damage_ratio));
        expect(far.take_damage).not.toHaveBeenCalled();
    });

    it('explodes for AoE damage and knockback', () => {
        const primary = make_enemy({ x: 0, y: 0, z: 3000 });
        const nearby = make_enemy({ x: 80, y: 0, z: 3000 });
        store.enemies = [primary, nearby];

        const impact = new THREE.Vector3(0, 0, 3000);
        apply_explosion(impact, 40, primary);

        expect(primary.take_damage).not.toHaveBeenCalled();
        expect(nearby.take_damage).toHaveBeenCalledWith(Math.round(40 * explode_damage_ratio));
        expect(primary.apply_axe_knockback).toHaveBeenCalled();
        expect(nearby.apply_axe_knockback).toHaveBeenCalled();
    });

    it('apply_molecule_hit_effect dispatches by formula', () => {
        const enemy = make_enemy();
        store.enemies = [enemy];
        const impact = new THREE.Vector3(0, 0, 3000);

        expect(apply_molecule_hit_effect({ formula: 'NH3', damage: 50 }, enemy, impact)).toBe('poison');
        expect(store.global_updates_queue.length).toBeGreaterThan(0);

        expect(apply_molecule_hit_effect({ formula: 'H2O', damage: 40 }, enemy, impact)).toBe('splash');
        expect(apply_molecule_hit_effect({ formula: 'CH4', damage: 40 }, enemy, impact)).toBe('explode');
        expect(apply_molecule_hit_effect({ formula: 'H2', damage: 10 }, enemy, impact)).toBeNull();
    });

    it('enemies_within_radius excludes deleted and out-of-range enemies', () => {
        const a = make_enemy({ x: 0, y: 0, z: 3000 });
        const b = make_enemy({ x: 50, y: 0, z: 3000 });
        const dead = make_enemy({ x: 40, y: 0, z: 3000 });
        dead.should_delete = true;
        store.enemies = [a, b, dead];

        const found = enemies_within_radius(new THREE.Vector3(0, 0, 3000), 100, a);
        expect(found).toEqual([b]);
    });
});
