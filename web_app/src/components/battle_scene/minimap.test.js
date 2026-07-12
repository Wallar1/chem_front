import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
	bearing_from_forward,
	compute_minimap_indicators,
	indicator_size_for_distance,
	MAX_DOT_SIZE,
	MIN_DOT_SIZE,
	shortest_angular_distance,
	shortest_geodesic_tangent,
} from './minimap.js';

describe('minimap helpers', () => {
	it('uses the shorter arc for angular distance', () => {
		const north = new THREE.Vector3(0, 0, 1);
		const near_south = new THREE.Vector3(0.1, 0, -1).normalize();
		const far_around = new THREE.Vector3(1, 0, 0);

		expect(shortest_angular_distance(north, far_around)).toBeCloseTo(Math.PI / 2, 5);
		expect(shortest_angular_distance(north, near_south)).toBeGreaterThan(Math.PI / 2);
		expect(shortest_angular_distance(north, near_south)).toBeLessThan(Math.PI);
	});

	it('points geodesic tangent along the short path around the planet', () => {
		const player = new THREE.Vector3(0, 0, 1);
		const enemy_east = new THREE.Vector3(1, 0, 0);
		const tangent = shortest_geodesic_tangent(player, enemy_east);

		expect(tangent).toBeTruthy();
		expect(tangent.x).toBeGreaterThan(0.9);
		expect(Math.abs(tangent.z)).toBeLessThan(0.1);
	});

	it('returns null for antipodal enemies with no unique short path', () => {
		const player = new THREE.Vector3(0, 0, 1);
		const antipode = new THREE.Vector3(0, 0, -1);
		expect(shortest_geodesic_tangent(player, antipode)).toBeNull();
	});

	it('makes closer enemies larger indicator dots', () => {
		expect(indicator_size_for_distance(0)).toBe(MAX_DOT_SIZE);
		expect(indicator_size_for_distance(Math.PI)).toBe(MIN_DOT_SIZE);
		expect(indicator_size_for_distance(Math.PI / 2)).toBeCloseTo(
			(MAX_DOT_SIZE + MIN_DOT_SIZE) / 2,
			5,
		);
	});

	it('reports forward as angle 0 and right as +π/2', () => {
		const forward = new THREE.Vector3(0, 1, 0);
		const right = new THREE.Vector3(1, 0, 0);
		expect(bearing_from_forward(forward, forward, right)).toBeCloseTo(0, 5);
		expect(bearing_from_forward(right, forward, right)).toBeCloseTo(Math.PI / 2, 5);
	});

	it('computes indicators relative to camera facing on the sphere', () => {
		const camera = new THREE.PerspectiveCamera();
		camera.position.set(0, 0, 3000);
		camera.up.set(0, 0, 1);
		camera.lookAt(0, 100, 3000);
		camera.updateMatrixWorld(true);

		const enemy_mesh = new THREE.Object3D();
		enemy_mesh.position.set(3000, 0, 0);
		enemy_mesh.updateMatrixWorld(true);

		const indicators = compute_minimap_indicators(camera, [{ mesh: enemy_mesh }]);
		expect(indicators).toHaveLength(1);
		expect(indicators[0].size).toBeGreaterThan(MIN_DOT_SIZE);
		expect(indicators[0].size).toBeLessThanOrEqual(MAX_DOT_SIZE);
		// Enemy is to the camera's right when facing +Y from the north pole.
		expect(indicators[0].angle).toBeCloseTo(Math.PI / 2, 1);
	});

	it('skips enemies marked for deletion', () => {
		const camera = new THREE.PerspectiveCamera();
		camera.position.set(0, 0, 3000);
		camera.updateMatrixWorld(true);

		const indicators = compute_minimap_indicators(camera, [
			{ should_delete: true, mesh: { getWorldPosition: (v) => v.set(3000, 0, 0) } },
		]);
		expect(indicators).toHaveLength(0);
	});
});
