/** @vitest-environment node */
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

vi.mock('three/examples/jsm/loaders/FBXLoader.js', () => ({
	FBXLoader: class {
		load() {}
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
import { Enemy } from './enemies.js';
import {
	get_chase_target_with_angle_offset,
	rotate_parent_toward_world_point,
	world_position_on_sphere,
} from './enemy-surface.js';
import {
	createSurfaceParent,
	createTestEnemyOnSphere,
	randomUnitVector,
} from './battle-scene-test-helpers.js';

describe('enemy surface movement helpers', () => {
	it('get_chase_target_with_angle_offset keeps target on the tangent plane', () => {
		const enemyPos = new THREE.Vector3(earth_radius, 0, 0);
		const targetPos = new THREE.Vector3(0, earth_radius, 0);
		const offsetTarget = get_chase_target_with_angle_offset(enemyPos, targetPos, Math.PI / 4);
		const displacement = offsetTarget.clone().sub(enemyPos);
		const surfaceNormal = enemyPos.clone().normalize();
		expect(Math.abs(displacement.dot(surfaceNormal))).toBeLessThan(1);
		expect(offsetTarget.length()).toBeGreaterThan(earth_radius * 0.9);
	});

	it('Enemy.get_chase_target_with_angle_offset matches pure helper', () => {
		const { enemy } = createTestEnemyOnSphere(Enemy);
		const enemyPos = enemy.getWorldPosition(new THREE.Vector3());
		const cameraPos = enemyPos.clone().add(new THREE.Vector3(0, 500, 200));
		const fromClass = enemy.get_chase_target_with_angle_offset(cameraPos, 0.3);
		const fromHelper = get_chase_target_with_angle_offset(enemyPos, cameraPos, 0.3);
		expect(fromClass.distanceTo(fromHelper)).toBeLessThan(0.01);
	});

	it('rotate_parent_toward_world_point keeps enemy on sphere over many steps', () => {
		const { parent, mesh } = createSurfaceParent(
			new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 1, 0).normalize(), 0.8),
		);
		const target = new THREE.Vector3(0, earth_radius, earth_radius);
		for (let step = 0; step < 120; step++) {
			const enemyPos = mesh.getWorldPosition(new THREE.Vector3());
			rotate_parent_toward_world_point(parent, enemyPos, target, earth_radius, 16, 1);
			expect(world_position_on_sphere(mesh, earth_radius).on_sphere).toBe(true);
		}
	});

	it('move_jumping bobs mesh radially while parent rotation stays on sphere', () => {
		const { enemy, parent } = createTestEnemyOnSphere(Enemy, { health: 50 });
		enemy.movement_pattern = 'jump';
		const cameraPos = enemy.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(200, 100, 50));
		let state = {};

		for (let frame = 0; frame < 200; frame++) {
			state = enemy.move_jumping(cameraPos, earth_radius, 0.016, state);
			parent.updateMatrixWorld(true);
			const parentAnchor = parent.localToWorld(new THREE.Vector3(0, 0, earth_radius));
			expect(Math.abs(parentAnchor.length() - earth_radius)).toBeLessThan(1);
			const pos = enemy.getWorldPosition(new THREE.Vector3());
			expect(Math.abs(pos.length() - earth_radius)).toBeLessThan(80);
		}
	});

	it('move_weaving chase target stays near the surface', () => {
		const { enemy } = createTestEnemyOnSphere(Enemy);
		const cameraPos = enemy.getWorldPosition(new THREE.Vector3()).add(
			randomUnitVector().multiplyScalar(800),
		);
		let state = {};
		for (let frame = 0; frame < 100; frame++) {
			state = enemy.move_weaving(cameraPos, earth_radius, 0.016, state);
			const pos = enemy.getWorldPosition(new THREE.Vector3());
			expect(Math.abs(pos.length() - earth_radius)).toBeLessThan(50);
		}
	});

	it('apply_movement_pattern fast mode rotates without leaving sphere', () => {
		const { enemy } = createTestEnemyOnSphere(Enemy);
		enemy.movement_pattern = 'fast';
		const cameraPos = enemy.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(-300, 200, 100));
		let state = {};
		for (let frame = 0; frame < 60; frame++) {
			state = enemy.apply_movement_pattern('fast', cameraPos, earth_radius, 16, state);
			expect(world_position_on_sphere(enemy.mesh, earth_radius).on_sphere).toBe(true);
		}
	});
});
