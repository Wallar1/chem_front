
/*
I want to create drag controls slightly differently. I want to have it integrated
with my animate loop, where the object will keep getting updated each frame by the timedelta.
In the jsm drag controls, the object just gets moved automatically, which is different.

To do this I need to listen for the drag event, and if an object is selected, drag it by the time delta.

*/

import * as THREE from 'three';

import {Updater, add_to_global_updates_queue} from './objects.js';


function default_on_mouse_down_callback(selected) {
    return;
}

function default_on_mouse_up_callback(selected) {
    return;
}


export class CraigDragControls {
    constructor(renderer, camera, draggable_objects, on_mouse_down_callback, on_mouse_up_callback) {
        this.renderer = renderer;
        this.camera = camera;
        this.draggable_objects = draggable_objects;
        this.on_mouse_down_callback = on_mouse_down_callback ? on_mouse_down_callback : default_on_mouse_down_callback;
        this.on_mouse_up_callback = on_mouse_up_callback ? on_mouse_up_callback : default_on_mouse_up_callback;

        this.plane = new THREE.Plane();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.offset = new THREE.Vector3();
        this.intersection_point = new THREE.Vector3();
        this.worldPosition = new THREE.Vector3();
        this.inverseMatrix = new THREE.Matrix4();

        // when functions are called from the event listeners, "this" defaults to the calling dom element,
        // so we need to bind the functions to the class instance
        this.update_pointer = this.update_pointer.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerCancel = this.onPointerCancel.bind(this);

        this.add_event_listeners();
    }

    add_event_listeners(){
        this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
        this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
        this.renderer.domElement.addEventListener('pointerup', this.onPointerCancel);
        // this.renderer.domElement.addEventListener('pointerleave', this.onPointerCancel);
    }

    remove_event_listeners(){
        this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
        this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
        this.renderer.domElement.removeEventListener('pointerup', this.onPointerCancel);
        // this.renderer.domElement.removeEventListener('pointerleave', this.onPointerCancel);
    }

    dispose() {
        remove_event_listeners();
    }

    update_pointer( event ) {
        // calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ( event.clientX - rect.left ) / rect.width * 2 - 1;
        this.mouse.y = - ( event.clientY - rect.top ) / rect.height * 2 + 1;
    }

    move_object(state, time_delta) {
        // see onPointerDown for why we use the offset and inverse matrix
        let {selected, intersection_point, offset, inverseMatrix} = state;
        selected.position.copy( intersection_point.sub( offset ).applyMatrix4( inverseMatrix ) );
        return {finished: true}
    }

    findGroup( obj, group = null ) {
        if ( obj.isGroup ) group = obj;
        if ( obj.parent === null ) return group;
        return this.findGroup( obj.parent, group );
    }

    onPointerMove(event) {
        this.update_pointer( event );
        this.raycaster.setFromCamera( this.mouse, this.camera );

        if ( this.selected ) {
            this.raycaster.ray.intersectPlane( this.plane, this.intersection_point )
            if (this.intersection_point) {
                let state = {
                    selected: this.selected,
                    intersection_point: this.intersection_point,
                    offset: this.offset,
                    inverseMatrix: this.inverseMatrix,
                }
                let move_object_updater = new Updater(this.move_object, state)
                add_to_global_updates_queue(move_object_updater)
            }
        }
    }

    onPointerDown(event) {
        this.update_pointer( event );
        this.raycaster.setFromCamera( this.mouse, this.camera );
        const recursive = true;
        let intersections = this.raycaster.intersectObjects( this.draggable_objects, recursive );

        if ( intersections.length > 0 ) {
            this.selected = this.findGroup(intersections[0].object);

            this.plane.setFromNormalAndCoplanarPoint(
                this.camera.getWorldDirection(this.plane.normal),
                this.worldPosition.setFromMatrixPosition(this.selected.matrixWorld)
            );
            
            this.raycaster.ray.intersectPlane( this.plane, this.intersection_point );
            if (this.intersection_point) {
                /* 
                The inverse matrix is used to convert the world position of the intersection point into the local
                coordinates of the parent. It is the same as doing this:
                    this.selected.parent.worldToLocal(this.intersection_point);
                    this.selected.position.copy(this.intersection_point.sub(this.offset));
                but Im keeping the inverted matrix code because it is helpful to teach myself another way to do things.
                Apparently the main advantage vs using the built-in worldToLocal is that you have more control.
                */
                this.inverseMatrix.copy( this.selected.parent.matrixWorld ).invert();

                // offset is the difference between where you click, and the center of the object you click on.
                // It is used so the object doesnt snap to your mouse (you can drag by the corner)
                this.offset.copy( this.intersection_point ).sub( this.worldPosition );

                this.on_mouse_down_callback(this.selected)
            }
        } else {
            this.selected = null;
        }
    }

    onPointerCancel() {
        if (this.selected) {
            this.on_mouse_up_callback(this.selected);
        }
        this.selected = null;
    }
}
