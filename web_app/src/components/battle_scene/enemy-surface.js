import * as THREE from 'three';

export function apply_surface_knockback(parent, tangent_knockback_world, earth_radius, knockback_radians) {
	const up_local_parent = new THREE.Vector3(0, 0, earth_radius);
	const knockback_dir_local = parent.worldToLocal(tangent_knockback_world.clone()).normalize();
	const axis_of_rotation = new THREE.Vector3().crossVectors(up_local_parent, knockback_dir_local);
	if (axis_of_rotation.lengthSq() < 1e-6) {
		return false;
	}
	axis_of_rotation.normalize();
	const quaternion = new THREE.Quaternion().setFromAxisAngle(axis_of_rotation, knockback_radians);
	parent.quaternion.multiply(quaternion).normalize();
	parent.updateMatrixWorld(true);
	return true;
}

export function get_chase_target_with_angle_offset(enemy_world_pos, target_world_pos, angle_offset_radians) {
	const surface_normal = enemy_world_pos.clone().normalize();
	const dir_to_target = new THREE.Vector3().subVectors(target_world_pos, enemy_world_pos);
	const tangent_dir = dir_to_target.clone().projectOnPlane(surface_normal).normalize();
	if (tangent_dir.lengthSq() < 1e-6) {
		return target_world_pos.clone();
	}
	const rotated_dir = tangent_dir.clone().applyAxisAngle(surface_normal, angle_offset_radians);
	return enemy_world_pos.clone().add(rotated_dir.multiplyScalar(dir_to_target.length()));
}

export function rotate_parent_toward_world_point(
	parent,
	enemy_world_pos,
	target_world_pos,
	earth_radius,
	time_delta,
	speed_multiplier = 1,
) {
	const dir_to_target_world = new THREE.Vector3().subVectors(target_world_pos, enemy_world_pos);
	const up_local_parent = new THREE.Vector3(0, 0, earth_radius);
	const dir_to_target_local_parent = parent.worldToLocal(dir_to_target_world.clone()).normalize();
	const axis_of_rotation = new THREE.Vector3().crossVectors(up_local_parent, dir_to_target_local_parent).normalize();
	const radians = speed_multiplier * Math.PI * time_delta / 100;
	const quaternion = new THREE.Quaternion().setFromAxisAngle(axis_of_rotation, radians);
	parent.quaternion.multiply(quaternion);
	parent.updateMatrixWorld(true);
}

export function world_position_on_sphere(mesh, earth_radius, tolerance = 1) {
	const pos = mesh.getWorldPosition(new THREE.Vector3());
	return {
		position: pos,
		on_sphere: Math.abs(pos.length() - earth_radius) < tolerance,
	};
}
