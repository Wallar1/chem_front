import * as THREE from 'three';

const MIN_DOT_SIZE = 4;
const MAX_DOT_SIZE = 12;
const ANTIPODAL_EPSILON = 1e-6;

const _player_normal = new THREE.Vector3();
const _enemy_normal = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _look = new THREE.Vector3();
const _player_pos = new THREE.Vector3();
const _enemy_pos = new THREE.Vector3();

/**
 * Shortest-arc angular distance on the unit sphere, in [0, π].
 */
export function shortest_angular_distance(player_unit, enemy_unit) {
	const cos_angle = THREE.MathUtils.clamp(player_unit.dot(enemy_unit), -1, 1);
	return Math.acos(cos_angle);
}

/**
 * Tangent direction at the player toward the enemy along the shortest geodesic.
 * Returns null when the points are coincident or exactly antipodal (no unique shortest path).
 */
export function shortest_geodesic_tangent(player_unit, enemy_unit, target = new THREE.Vector3()) {
	target.copy(enemy_unit).addScaledVector(player_unit, -enemy_unit.dot(player_unit));
	if (target.lengthSq() < ANTIPODAL_EPSILON) {
		return null;
	}
	return target.normalize();
}

/**
 * Map angular distance (0 = next to player, π = opposite side) to indicator pixel size.
 */
export function indicator_size_for_distance(angular_distance) {
	const t = THREE.MathUtils.clamp(angular_distance / Math.PI, 0, 1);
	return THREE.MathUtils.lerp(MAX_DOT_SIZE, MIN_DOT_SIZE, t);
}

/**
 * Bearing of a tangent direction relative to the player's forward on the surface.
 * 0 = forward, positive = clockwise when viewed from above the player.
 */
export function bearing_from_forward(tangent, forward, right) {
	const x = tangent.dot(right);
	const y = tangent.dot(forward);
	return Math.atan2(x, y);
}

/**
 * Build minimap indicator descriptors for all living enemies.
 * Each indicator: { angle, size } where angle is radians from forward (clockwise)
 * and size is the CSS pixel diameter of the dot.
 */
export function compute_minimap_indicators(camera, enemies) {
	if (!camera || !enemies?.length) {
		return [];
	}

	camera.getWorldPosition(_player_pos);
	if (_player_pos.lengthSq() < ANTIPODAL_EPSILON) {
		return [];
	}
	_player_normal.copy(_player_pos).normalize();

	camera.getWorldDirection(_look);
	_forward.copy(_look).projectOnPlane(_player_normal);
	if (_forward.lengthSq() < ANTIPODAL_EPSILON) {
		return [];
	}
	_forward.normalize();
	_right.crossVectors(_forward, _player_normal).normalize();

	const indicators = [];
	for (let i = 0; i < enemies.length; i++) {
		const enemy = enemies[i];
		if (enemy?.should_delete) {
			continue;
		}
		const mesh = enemy.mesh ?? enemy;
		if (!mesh?.getWorldPosition) {
			continue;
		}
		mesh.getWorldPosition(_enemy_pos);
		if (_enemy_pos.lengthSq() < ANTIPODAL_EPSILON) {
			continue;
		}
		_enemy_normal.copy(_enemy_pos).normalize();

		const tangent = shortest_geodesic_tangent(_player_normal, _enemy_normal, _tangent);
		if (!tangent) {
			continue;
		}

		const angular_distance = shortest_angular_distance(_player_normal, _enemy_normal);
		indicators.push({
			angle: bearing_from_forward(tangent, _forward, _right),
			size: indicator_size_for_distance(angular_distance),
		});
	}
	return indicators;
}

export { MIN_DOT_SIZE, MAX_DOT_SIZE };
