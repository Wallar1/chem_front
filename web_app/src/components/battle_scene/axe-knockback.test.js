/** @vitest-environment node */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { earth_radius } from './constants.js';
import { apply_surface_knockback, world_position_on_sphere } from './enemy-surface.js';
import {
	createFacingEnemyScene,
	createSurfaceParent,
	quaternionHasNaN,
	randomUnitVector,
	viewAngle,
} from './battle-scene-test-helpers.js';

const AXE_KNOCKBACK_RADIANS = 0.1;
const MAX_KNOCKBACK_ARC = AXE_KNOCKBACK_RADIANS * earth_radius * 1.05;

describe('axe knockback (production surface helpers)', () => {
	it('apply_surface_knockback stays on the sphere without NaN quaternions', () => {
		let movedCount = 0;
		for (let i = 0; i < 500; i++) {
			const axis = randomUnitVector();
			const angle = Math.random() * Math.PI;
			const surfaceQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
			const { parent, mesh } = createSurfaceParent(surfaceQuaternion);

			const enemyWorldPos = mesh.getWorldPosition(new THREE.Vector3());
			const surfaceNormal = enemyWorldPos.clone().normalize();
			const playerFacing = randomUnitVector();
			const tangentKnockback = playerFacing.clone().projectOnPlane(surfaceNormal);
			if (tangentKnockback.lengthSq() < 1e-6) {
				continue;
			}

			const before = enemyWorldPos.clone();
			apply_surface_knockback(parent, tangentKnockback, earth_radius, AXE_KNOCKBACK_RADIANS);
			const { position: after, on_sphere } = world_position_on_sphere(mesh, earth_radius);
			expect(quaternionHasNaN(parent.quaternion)).toBe(false);
			expect(on_sphere).toBe(true);
			expect(after.distanceTo(before)).toBeLessThanOrEqual(MAX_KNOCKBACK_ARC);
			if (after.distanceTo(before) > 1) {
				movedCount += 1;
			}
		}
		expect(movedCount).toBeGreaterThan(0);
	});

	it('knockback distance is bounded (not screen-flinging arcs)', () => {
		for (let i = 0; i < 200; i++) {
			const axis = randomUnitVector();
			const surfaceQuaternion = new THREE.Quaternion().setFromAxisAngle(axis, Math.random() * Math.PI);
			const { parent, mesh } = createSurfaceParent(surfaceQuaternion);
			const before = mesh.getWorldPosition(new THREE.Vector3());
			const tangentKnockback = randomUnitVector()
				.projectOnPlane(before.clone().normalize());
			if (tangentKnockback.lengthSq() < 1e-6) {
				continue;
			}
			apply_surface_knockback(parent, tangentKnockback, earth_radius, AXE_KNOCKBACK_RADIANS);
			const after = mesh.getWorldPosition(new THREE.Vector3());
			expect(after.distanceTo(before)).toBeLessThan(400);
			expect(after.distanceTo(before)).toBeLessThanOrEqual(MAX_KNOCKBACK_ARC);
		}
	});

	it('knockback moves enemies in player facing direction when camera faces them', () => {
		const { camera, parent, mesh } = createFacingEnemyScene();
		const before = mesh.getWorldPosition(new THREE.Vector3());
		const beforeAngle = viewAngle(camera, before);
		const surfaceNormal = before.clone().normalize();
		const tangentKnockback = camera.getWorldDirection(new THREE.Vector3()).projectOnPlane(surfaceNormal);
		apply_surface_knockback(parent, tangentKnockback, earth_radius, AXE_KNOCKBACK_RADIANS);
		const after = mesh.getWorldPosition(new THREE.Vector3());
		const afterAngle = viewAngle(camera, after);
		expect(afterAngle).toBeLessThan(beforeAngle);
		expect(after.distanceTo(before)).toBeGreaterThan(1);
		expect(after.distanceTo(before)).toBeLessThanOrEqual(MAX_KNOCKBACK_ARC);
	});

	it('repeated knockback does not drift off the sphere', () => {
		const { parent, mesh } = createSurfaceParent(
			new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 1.2),
		);
		const tangent = new THREE.Vector3(1, 0, 0);
		for (let hit = 0; hit < 50; hit++) {
			const pos = mesh.getWorldPosition(new THREE.Vector3());
			const surfaceTangent = tangent.clone().projectOnPlane(pos.clone().normalize());
			apply_surface_knockback(parent, surfaceTangent, earth_radius, AXE_KNOCKBACK_RADIANS);
			const { on_sphere } = world_position_on_sphere(mesh, earth_radius);
			expect(on_sphere).toBe(true);
			expect(quaternionHasNaN(parent.quaternion)).toBe(false);
		}
	});
});
