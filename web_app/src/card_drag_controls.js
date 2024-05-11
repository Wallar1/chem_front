import {
	EventDispatcher,
	Matrix4,
	Plane,
	Raycaster,
	Vector2,
	Vector3
} from 'three';

const _plane = new Plane();
const _raycaster = new Raycaster();
const _pointer = new Vector2();
const _offset = new Vector3();
const _intersection = new Vector3();
const _worldPosition = new Vector3();
const _inverseMatrix = new Matrix4();


// class DragControls {
// 	constructor(camera, domElement, scene, callbacks) {
// 		// super();
// 		this._camera = camera;
// 		this._domElement = domElement;
// 		this._scene = scene;
// 		this._domElement.style.touchAction = 'none'; // disable touch scroll
// 		this._selected = null;
// 		this._hovered = null;
// 		this._intersections = [];
// 		this.enabled = true;
// 		this.activate();
// 		this._objects = []
// 		for (const [key, value] of Object.entries(callbacks)) {
// 			Object.defineProperty(this, key, {value: value, writable: true})	
// 		}
// 	}

// 	activate() {
// 		const scope = this;
// 		this._domElement.addEventListener( 'pointermove', (event) => scope.onPointerMove(event) );
// 		this._domElement.addEventListener( 'pointerdown', (event) => scope.onPointerDown(event) );
// 		this._domElement.addEventListener( 'pointerup', (event) => scope.onPointerCancel(event) );
// 		this._domElement.addEventListener( 'pointerleave', (event) => scope.onPointerCancel(event) );

		
// 	}

// 	deactivate() {
// 		const scope = this;
// 		this._domElement.removeEventListener( 'pointermove', scope.onPointerMove );
// 		this._domElement.removeEventListener( 'pointerdown', scope.onPointerDown);
// 		this._domElement.removeEventListener( 'pointerup', scope.onPointerCancel );
// 		this._domElement.removeEventListener( 'pointerleave', scope.onPonterCancel );
// 		this._domElement.style.cursor = '';
// 	}

// 	dispose() {
// 		deactivate();
// 	}

// 	remove_object(object) {
// 		for (let i=0; i<this._objects.length; i++) {
// 			if (object.uuid === this._objects[i].uuid) {
// 				this._objects.splice(i, 1)
// 				this._scene.remove(object)
// 				// this.dispatchEvent( { type: 'removedObject', object: object } );
// 			}
// 		}
// 	}

// 	onPointerMove( event ) {
// 		this._intersections = []
// 		if ( this.enabled === false ) return;
// 		this.updatePointer( event );
// 		_raycaster.setFromCamera( _pointer, this._camera );
// 		if ( this._selected ) {
// 			if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {
// 				this._selected.position.copy( _intersection.sub( _offset ).applyMatrix4( _inverseMatrix ) );
// 			}
// 			// this.dispatchEvent( { type: 'drag', object: this._selected } );
// 			// return

// 			_raycaster.setFromCamera( _pointer, this._camera );
// 			this._intersections = []
// 			_raycaster.intersectObjects( this._objects, true, this._intersections );
// 			if (this._intersections.length > 1) {
// 				for (let i=0; i<this._intersections.length; i++) {
// 					if (this._intersections[i].object.uuid !== this._selected.uuid) {
// 						// this.remove_object(this._intersections[i].object)
// 						// this.combine_colors(this._intersections[i].object, this._selected)
// 						// this.dispatchEvent( { type: 'drag_combined', object: this._intersections[i].object } );
// 						let d = { bubbles: true, cancelable: true, detail: { object: this._intersections[i].object }}
// 						// this.dispatchEvent(new CustomEvent('awesome', d))
// 					}
// 				}
// 			}
// 			return
// 		}

// 		// hover support
// 		if ( event.pointerType === 'mouse' || event.pointerType === 'pen' ) {
// 			// this._intersections.length = 0;
// 			_raycaster.setFromCamera( _pointer, this._camera );
// 			_raycaster.intersectObjects( this._objects, true, this._intersections );

// 			if ( this._intersections.length === 1 ) {
// 				const object = this._intersections[ 0 ].object;
// 				_plane.setFromNormalAndCoplanarPoint( this._camera.getWorldDirection( _plane.normal ), _worldPosition.setFromMatrixPosition( object.matrixWorld ) );

// 				if ( this._hovered !== object && this._hovered !== null ) {
// 					// this.dispatchEvent( { type: 'hoveroff', object: this._hovered } );
// 					this._domElement.style.cursor = 'auto';
// 					this._hovered = null;
// 				}

// 				if ( this._hovered !== object ) {
// 					// this.dispatchEvent( { type: 'hoveron', object: object } );
// 					this._domElement.style.cursor = 'pointer';
// 					this._hovered = object;
// 				}
// 			} else {
// 				if ( this._hovered !== null ) {
// 					// this.dispatchEvent( { type: 'hoveroff', object: this._hovered } );
// 					this._domElement.style.cursor = 'auto';
// 					this._hovered = null;
// 				}
// 			}
// 		}
// 	}

// 	onPointerDown( event ) {
// 		if ( this.enabled === false ) return;
// 		this.updatePointer( event );
// 		_raycaster.setFromCamera( _pointer, this._camera );
// 		this._intersections = []
// 		_raycaster.intersectObjects( this._objects, true, this._intersections );

// 		if ( this._intersections.length > 0 ) {
// 			this._selected = this._intersections[ 0 ].object;
// 			_plane.setFromNormalAndCoplanarPoint( this._camera.getWorldDirection( _plane.normal ), _worldPosition.setFromMatrixPosition( this._selected.matrixWorld ) );

// 			if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {
// 				_inverseMatrix.copy( this._selected.parent.matrixWorld ).invert();
// 				_offset.copy( _intersection ).sub( _worldPosition.setFromMatrixPosition( this._selected.matrixWorld ) );
// 			}
// 			this._domElement.style.cursor = 'move';
// 			// this.dispatchEvent( { type: 'dragstart', object: this._selected } );
// 		}
// 	}

// 	onPointerCancel(event) {
// 		if ( this.enabled === false ) return;
// 		if ( this._selected ) {
// 			// this.dispatchEvent( { type: 'dragend', object: this._selected } );
// 			this._selected = null;
// 		}
// 		this._domElement.style.cursor = this._hovered ? 'pointer' : 'auto';
// 	}

// 	updatePointer( event ) {
// 		const rect = this._domElement.getBoundingClientRect();
// 		_pointer.x = ( event.clientX - rect.left ) / rect.width * 2 - 1;
// 		_pointer.y = - ( event.clientY - rect.top ) / rect.height * 2 + 1;
// 	}

// }




class DragControls {
	constructor({camera, domElement, scene, caller}) {
		this._camera = camera;
		this._domElement = domElement;
		this._scene = scene;
		this._caller = caller;
		this._domElement.style.touchAction = 'none'; // disable touch scroll
		this._selected = null;
		this._hovered = null;
		this._intersections = [];
		this._previous_intersections = new Set()
		this.enabled = true;
		this.activate();
		this._objects = []
	}

	activate() {
		const scope = this;
		this._domElement.addEventListener( 'pointermove', (event) => scope.onPointerMove(event) );
		this._domElement.addEventListener( 'pointerdown', (event) => scope.onPointerDown(event) );
		this._domElement.addEventListener( 'pointerup', (event) => scope.onPointerCancel(event) );
		this._domElement.addEventListener( 'pointerleave', (event) => scope.onPointerCancel(event) );

		
	}

	deactivate() {
		const scope = this;
		this._domElement.removeEventListener( 'pointermove', scope.onPointerMove );
		this._domElement.removeEventListener( 'pointerdown', scope.onPointerDown);
		this._domElement.removeEventListener( 'pointerup', scope.onPointerCancel );
		this._domElement.removeEventListener( 'pointerleave', scope.onPonterCancel );
		this._domElement.style.cursor = '';
	}

	dispose() {
		deactivate();
	}

	remove_object(object) {
		for (let i=0; i<this._objects.length; i++) {
			if (object.uuid === this._objects[i].uuid) {
				this._objects.splice(i, 1)
				this._scene.remove(object)
			}
		}
	}

	onPointerMove( event ) {
		this._previous_intersections.clear()
		this._intersections.forEach(intersection => this._previous_intersections.add(intersection.object.uuid))
		this._intersections = []
		if ( this.enabled === false ) return;
		this.updatePointer( event );
		_raycaster.setFromCamera( _pointer, this._camera );
		if ( this._selected ) {
			if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {
				this._selected.position.copy( _intersection.sub( _offset ).applyMatrix4( _inverseMatrix ) );
			}
			this._caller._render()

			_raycaster.setFromCamera( _pointer, this._camera );
			this._intersections = []
			_raycaster.intersectObjects( this._objects, true, this._intersections );
			if (this._intersections.length > 1) {
				for (let i=0; i<this._intersections.length; i++) {
					// console.log(this._previous_intersections.values)
					if (this._intersections[i].object.uuid !== this._selected.uuid &&
						!this._previous_intersections.has(this._intersections[i].object.uuid)) {
						this._caller._combine_card(this._selected, this._intersections[i].object);
					}
				}
			}
			return
		}

		// hover support
		if ( event.pointerType === 'mouse' || event.pointerType === 'pen' ) {
			_raycaster.setFromCamera( _pointer, this._camera );
			_raycaster.intersectObjects( this._objects, true, this._intersections );

			if ( this._intersections.length === 1 ) {
				const object = this._intersections[ 0 ].object;
				_plane.setFromNormalAndCoplanarPoint( this._camera.getWorldDirection( _plane.normal ), _worldPosition.setFromMatrixPosition( object.matrixWorld ) );

				if ( this._hovered !== object && this._hovered !== null ) {
					this._domElement.style.cursor = 'auto';
					this._hovered = null;
				}

				if ( this._hovered !== object ) {
					this._domElement.style.cursor = 'pointer';
					this._hovered = object;
				}
			} else {
				if ( this._hovered !== null ) {
					this._domElement.style.cursor = 'auto';
					this._hovered = null;
				}
			}
		}
	}

	onPointerDown( event ) {
		if ( this.enabled === false ) return;
		this.updatePointer( event );
		_raycaster.setFromCamera( _pointer, this._camera );
		this._intersections = []
		_raycaster.intersectObjects( this._objects, true, this._intersections );

		if ( this._intersections.length > 0 ) {
			this._selected = this._intersections[ 0 ].object;
			_plane.setFromNormalAndCoplanarPoint( this._camera.getWorldDirection( _plane.normal ), _worldPosition.setFromMatrixPosition( this._selected.matrixWorld ) );

			if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {
				_inverseMatrix.copy( this._selected.parent.matrixWorld ).invert();
				_offset.copy( _intersection ).sub( _worldPosition.setFromMatrixPosition( this._selected.matrixWorld ) );
			}
			this._domElement.style.cursor = 'move';
		}
	}

	onPointerCancel(event) {
		if ( this.enabled === false ) return;
		if ( this._selected ) {
			this._selected = null;
		}
		this._domElement.style.cursor = this._hovered ? 'pointer' : 'auto';
	}

	updatePointer( event ) {
		const rect = this._domElement.getBoundingClientRect();
		_pointer.x = ( event.clientX - rect.left ) / rect.width * 2 - 1;
		_pointer.y = - ( event.clientY - rect.top ) / rect.height * 2 + 1;
	}

}

export { DragControls };