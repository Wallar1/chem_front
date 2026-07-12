import * as THREE from 'three';
import { earth_radius } from './constants.js';
import { proxy_handler } from './objects.js';
import { store } from './store.js';

export function randomUnitVector() {
	const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
	return v.lengthSq() > 0 ? v.normalize() : new THREE.Vector3(1, 0, 0);
}

export function quaternionHasNaN(q) {
	return Number.isNaN(q.x) || Number.isNaN(q.y) || Number.isNaN(q.z) || Number.isNaN(q.w);
}

export function createSurfaceParent(surfaceQuaternion) {
	const earth = new THREE.Object3D();
	const parent = new THREE.Object3D();
	earth.add(parent);
	parent.quaternion.copy(surfaceQuaternion);
	const mesh = new THREE.Object3D();
	parent.add(mesh);
	mesh.position.set(0, 0, earth_radius);
	parent.updateMatrixWorld(true);
	return { earth, parent, mesh };
}

export function createFacingEnemyScene() {
	const camera_offset = 50;
	const earth = new THREE.Object3D();
	const camera_parent = new THREE.Object3D();
	earth.add(camera_parent);
	const camera = new THREE.PerspectiveCamera(60, 16 / 9, 1, 5000);
	camera_parent.add(camera);
	camera.position.set(0, 0, earth_radius + camera_offset);
	camera.rotateX(Math.PI / 2);

	const parent = new THREE.Object3D();
	earth.add(parent);
	const mesh = new THREE.Object3D();
	parent.add(mesh);
	mesh.position.set(0, 0, earth_radius);
	parent.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.4);
	parent.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.2));
	earth.updateMatrixWorld(true);

	const enemyPos = mesh.getWorldPosition(new THREE.Vector3());
	const camPos = camera.getWorldPosition(new THREE.Vector3());
	const earthPos = earth.getWorldPosition(new THREE.Vector3());
	const up = new THREE.Vector3().subVectors(earthPos, camPos).normalize();
	const toEnemy = new THREE.Vector3().subVectors(enemyPos, camPos).normalize();
	const moveDir = toEnemy.clone().projectOnPlane(up).normalize();
	const rotAxis = new THREE.Vector3().crossVectors(moveDir, up).normalize();
	const look = camera.getWorldDirection(new THREE.Vector3());
	camera_parent.quaternion.premultiply(
		new THREE.Quaternion().setFromAxisAngle(rotAxis, look.angleTo(toEnemy)),
	);
	earth.updateMatrixWorld(true);

	return { earth, camera, parent, mesh };
}

export function viewAngle(camera, pos) {
	const camPos = camera.getWorldPosition(new THREE.Vector3());
	const camDir = camera.getWorldDirection(new THREE.Vector3());
	return pos.clone().sub(camPos).normalize().angleTo(camDir);
}

export function createEnemyInScene(parent, mesh, EnemyClass, { health = 50 } = {}) {
	const rawEnemy = Object.create(EnemyClass.prototype);
	rawEnemy.mesh = mesh;
	rawEnemy.parent = parent;
	rawEnemy.health = health;
	rawEnemy.full_health = health;
	rawEnemy.should_delete = false;
	rawEnemy.health_bar = null;
	rawEnemy.movement_updater = null;
	rawEnemy.movement_pattern = 'smooth';
	return new Proxy(rawEnemy, proxy_handler('mesh'));
}

export function advanceGlobalUpdates(total_time, step = 1 / 60) {
	let elapsed = 0;
	while (elapsed < total_time && store.global_updates_queue.length > 0) {
		const time_delta = Math.min(step, total_time - elapsed);
		const next_updates = [];
		for (let i = 0; i < store.global_updates_queue.length; i++) {
			const updater = store.global_updates_queue[i];
			updater.update(time_delta);
			if (!updater.state.finished) {
				next_updates.push(updater);
			}
		}
		store.global_updates_queue = next_updates;
		elapsed += time_delta;
	}
}

export function createTestEnemyOnSphere(EnemyClass, { health = 50, surfaceQuaternion } = {}) {
	const axis = surfaceQuaternion ? null : randomUnitVector();
	const angle = surfaceQuaternion ? 0 : Math.random() * Math.PI;
	const quaternion = surfaceQuaternion
		?? new THREE.Quaternion().setFromAxisAngle(axis, angle);

	const { earth, parent, mesh } = createSurfaceParent(quaternion);
	const enemy = createEnemyInScene(parent, mesh, EnemyClass, { health });
	parent.updateMatrixWorld(true);
	return { earth, parent, mesh, enemy, rawEnemy: enemy };
}

