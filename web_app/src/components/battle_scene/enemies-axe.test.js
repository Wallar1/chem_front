/** @vitest-environment node */
import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('three/examples/jsm/loaders/FBXLoader.js', () => ({
	FBXLoader: class {
		load(_url, onLoad) {
			onLoad?.({ scale: { setScalar: vi.fn() }, traverse: vi.fn() });
		}
	},
}));

vi.mock('three/examples/jsm/utils/SkeletonUtils.js', () => ({
	SkeletonUtils: { clone: (model) => model },
}));

vi.mock('./projectile.js', () => ({
	blast_projectile: vi.fn(),
}));

vi.mock('./lab.js', () => ({
	spawn_lab_at_surface_quaternion: vi.fn(),
}));

import { earth_radius } from './constants.js';
import { store } from './store.js';
import { AXE_DAMAGE, AXE_KNOCKBACK_DURATION, AXE_KNOCKBACK_RADIANS, Enemy } from './enemies.js';
import { world_position_on_sphere } from './enemy-surface.js';
import {
	advanceGlobalUpdates,
	createEnemyInScene,
	createFacingEnemyScene,
	createTestEnemyOnSphere,
	quaternionHasNaN,
} from './battle-scene-test-helpers.js';

describe('Enemy axe damage and hit_by_axe', () => {
	beforeEach(() => {
		store.player_score = 0;
		store.global_updates_queue.length = 0;
	});

	it('take_damage applies 5 damage and does not delete a healthy enemy', () => {
		const { enemy } = createTestEnemyOnSphere(Enemy, { health: 50 });
		enemy.take_damage(AXE_DAMAGE);
		expect(enemy.health).toBe(45);
		expect(enemy.should_delete).toBe(false);
	});

	it('take_damage marks enemy for deletion only when health reaches zero', () => {
		const { enemy } = createTestEnemyOnSphere(Enemy, { health: AXE_DAMAGE });
		enemy.take_damage(AXE_DAMAGE);
		expect(enemy.health).toBe(0);
		expect(enemy.should_delete).toBe(true);
	});

	it('hit_by_axe damages but keeps enemy alive above 5 health', () => {
		const { camera, parent, mesh } = createFacingEnemyScene();
		store.camera = camera;
		const enemy = createEnemyInScene(parent, mesh, Enemy, { health: 50 });

		enemy.hit_by_axe();
		expect(enemy.health).toBe(45);
		expect(enemy.should_delete).toBe(false);
	});

	it('hit_by_axe applies production knockback that stays on sphere', () => {
		const { camera, parent, mesh } = createFacingEnemyScene();
		store.camera = camera;
		const enemy = createEnemyInScene(parent, mesh, Enemy, { health: 100 });

		const before = mesh.getWorldPosition(new THREE.Vector3());
		enemy.hit_by_axe();
		expect(mesh.getWorldPosition(new THREE.Vector3()).distanceTo(before)).toBeLessThan(1);

		advanceGlobalUpdates(AXE_KNOCKBACK_DURATION + 0.05);
		const { on_sphere } = world_position_on_sphere(mesh, earth_radius);
		const after = mesh.getWorldPosition(new THREE.Vector3());

		expect(enemy.health).toBe(95);
		expect(enemy.should_delete).toBe(false);
		expect(on_sphere).toBe(true);
		expect(quaternionHasNaN(parent.quaternion)).toBe(false);
		expect(after.distanceTo(before)).toBeGreaterThan(1);
		expect(after.distanceTo(before)).toBeLessThanOrEqual(AXE_KNOCKBACK_RADIANS * earth_radius * 1.05);
	});

	it('Enemy.apply_axe_knockback stays on sphere with bounded displacement', () => {
		const { parent, mesh, enemy } = createTestEnemyOnSphere(Enemy);
		const before = mesh.getWorldPosition(new THREE.Vector3());
		const tangent = new THREE.Vector3(1, 0, 0).projectOnPlane(before.clone().normalize());
		enemy.apply_axe_knockback(tangent);
		advanceGlobalUpdates(AXE_KNOCKBACK_DURATION + 0.05);
		const after = mesh.getWorldPosition(new THREE.Vector3());
		expect(after.distanceTo(before)).toBeGreaterThan(0);
		expect(after.distanceTo(before)).toBeLessThanOrEqual(AXE_KNOCKBACK_RADIANS * earth_radius * 1.05);
		expect(world_position_on_sphere(mesh, earth_radius).on_sphere).toBe(true);
	});
});
