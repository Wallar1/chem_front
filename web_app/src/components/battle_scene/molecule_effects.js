import * as THREE from 'three';
import { Updater } from './objects.js';
import { store } from './store.js';
import {
    poison_duration,
    poison_pulse_damage,
    splash_radius,
    splash_damage_ratio,
    explode_radius,
    explode_damage_ratio,
    explode_knockback_radians,
} from './constants.js';

/** Per-formula combat hooks applied on projectile hit. */
export const MOLECULE_HIT_EFFECTS = Object.freeze({
    NH3: 'poison',
    CN: 'poison',
    H2O: 'splash',
    CH4: 'explode',
});

function enemy_world_pos(enemy, target = new THREE.Vector3()) {
    if (enemy?.getWorldPosition) {
        return enemy.getWorldPosition(target);
    }
    if (enemy?.mesh?.getWorldPosition) {
        return enemy.mesh.getWorldPosition(target);
    }
    return target.set(0, 0, 0);
}

export function enemies_within_radius(origin_world, radius, exclude = null) {
    const nearby = [];
    const scratch = new THREE.Vector3();
    for (const enemy of store.enemies ?? []) {
        if (!enemy || enemy.should_delete || enemy === exclude) continue;
        if (enemy_world_pos(enemy, scratch).distanceTo(origin_world) <= radius) {
            nearby.push(enemy);
        }
    }
    return nearby;
}

export function apply_poison(enemy) {
    if (!enemy || enemy.should_delete) return;
    const pulses_remaining = Array.from({ length: poison_duration }, (_, idx) => idx + 1);
    const poison_updater = new Updater((state, time_delta) => {
        if (enemy.should_delete) {
            return { finished: true };
        }
        let { pulses_remaining: remaining, total_time } = state;
        total_time += time_delta;
        const due = remaining.filter((pulse) => total_time >= pulse);
        remaining = remaining.filter((pulse) => total_time < pulse);
        for (let i = 0; i < due.length; i++) {
            enemy.take_damage(poison_pulse_damage);
            if (enemy.should_delete) {
                return { finished: true };
            }
        }
        if (remaining.length === 0) {
            return { finished: true };
        }
        return { finished: false, total_time, pulses_remaining: remaining };
    }, { finished: false, total_time: 0, pulses_remaining });
    store.global_updates_queue.push(poison_updater);
}

export function apply_splash(impact_world_pos, projectile_damage, primary_enemy) {
    const splash_damage = Math.max(1, Math.round(projectile_damage * splash_damage_ratio));
    for (const enemy of enemies_within_radius(impact_world_pos, splash_radius, primary_enemy)) {
        enemy.take_damage(splash_damage);
    }
}

function knockback_away_from(enemy, impact_world_pos) {
    if (!enemy?.apply_axe_knockback || enemy.should_delete) return;
    const enemy_pos = enemy_world_pos(enemy);
    const surface_normal = enemy_pos.clone().normalize();
    const away = enemy_pos.clone().sub(impact_world_pos);
    if (away.lengthSq() < 1e-6) {
        away.copy(store.camera.getWorldDirection(new THREE.Vector3()));
    }
    const tangent = away.projectOnPlane(surface_normal);
    if (tangent.lengthSq() < 1e-6) return;
    enemy.apply_axe_knockback(tangent.normalize(), explode_knockback_radians);
}

export function apply_explosion(impact_world_pos, projectile_damage, primary_enemy) {
    const aoe_damage = Math.max(1, Math.round(projectile_damage * explode_damage_ratio));
    const victims = enemies_within_radius(impact_world_pos, explode_radius, null);
    for (const enemy of victims) {
        if (enemy !== primary_enemy) {
            enemy.take_damage(aoe_damage);
        }
        knockback_away_from(enemy, impact_world_pos);
    }
    // Primary may already be dead from the direct hit; still try knockback if alive.
    if (primary_enemy && !primary_enemy.should_delete && !victims.includes(primary_enemy)) {
        knockback_away_from(primary_enemy, impact_world_pos);
    }
}

/**
 * Apply formula-specific follow-up effects after the primary collide damage.
 * @returns {string|null} effect name applied, if any
 */
export function apply_molecule_hit_effect(projectile, primary_enemy, impact_world_pos) {
    const effect = MOLECULE_HIT_EFFECTS[projectile?.formula];
    if (!effect) return null;

    if (effect === 'poison') {
        apply_poison(primary_enemy);
        return effect;
    }
    if (effect === 'splash') {
        apply_splash(impact_world_pos, projectile.damage, primary_enemy);
        return effect;
    }
    if (effect === 'explode') {
        apply_explosion(impact_world_pos, projectile.damage, primary_enemy);
        return effect;
    }
    return null;
}

// Re-export for tests / tuning visibility
export { explode_knockback_radians };
