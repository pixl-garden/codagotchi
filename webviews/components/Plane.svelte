<script context="module">
    import { get } from 'svelte/store';
    import { game } from './Game.svelte';
    import { PannablePlaneController } from './Object.svelte';

    export class Plane {
        constructor(planeName, enterLogic = () => {}, exitLogic = () => {}, updateLogic = () => {}, onActivity = () => {},   
                    onInactivity = () => {}) {
            this.name = planeName;
            this.objects = [];
            this.enter = enterLogic || this.enter;
            this.exit = exitLogic || this.exit;
            this.update = updateLogic || this.update;
            this.onActivity = onActivity || this.onActivity;
            this.onInactivity = onInactivity || this.onInactivity;
            this.x = 0;
            this.y = 0;
            this.z = 0;
            this.scale = 10;
            this.height = 128;
            this.width = 128;
            this.ratio = 1;
            
            get(game).updatePlanes(planeName, this); // Add room to game object
        }

        addObject(...objects) {
            //allows for multiple object parameters to be added at once
            for (let object of objects) {
                this.objects.push(object);
            }
        }

        getObjects() {
            let childObjects = [];

            const accumulateChildren = (parent) => {
                if (!parent.renderChildren || !parent.children) return;

                for (let child of parent.children) {
                    if (child.useAbsoluteCoords) {
                        child.renderX = child.x;
                        child.renderY = child.y;
                        child.renderZ = child.z;
                    } else {
                        // Combine the child's local coordinates with the parent's computed render position
                        child.renderX = parent.renderX + child.x;
                        child.renderY = parent.renderY + child.y;
                        child.renderZ = parent.renderZ + child.z;
                    }

                    childObjects.push(child);
                    accumulateChildren(child);
                }
            };

            // Initialize root objects and traverse their hierarchies
            for (let obj of this.objects) {
                obj.renderX = obj.x;
                obj.renderY = obj.y;
                obj.renderZ = obj.z;
                accumulateChildren(obj);
            }

            return [...this.objects, ...childObjects];
        }

        convertToLocalCoords(screenX, screenY){
            const localX = (screenX - this.x) / this.scale;
            const localY = (screenY - this.y) / this.scale;
            return { x: localX, y: localY };
        }

        setDimensions(width, height){
            this.width = width;
            this.height = height;
        }

        enter() {
            // Default logic when entering the room
        }

        exit() {
            // Default logic when exiting the room
        }

        update() {
            // Default room-specific logic and updates
        }

        onActivity() {
            // Default logic when player is active
        }

        onInactivity() {
            // Default logic when player is inactive
        }

        removeObject(...objects) {
            for (let object of objects) {
                this.objects = this.objects.filter((obj) => obj !== object);
            }
        }

        // Position relative to the smallest dimension of the viewport
        // ratio is the proportion of that dimension
        viewportStrategy(virtualWidth, virtualHeight) {
            // Fit the plane to the tightest scale based on ratio (so plane never has a greater ratio than the specified ratio)
            // this.scale = Math.min(
            //     (virtualWidth / this.width) * this.ratio, 
            //     (virtualHeight / this.height) * this.ratio
            // );
            // this.x = (virtualWidth - (this.width * this.scale)) / 2;
            // this.y = (virtualHeight - (this.height * this.scale)) / 2;
        }
    }

    export class MinRelativePlane extends Plane {
        constructor(planeName, enterLogic = () => {}, exitLogic = () => {}, updateLogic = () => {}, onActivity = () => {},   
                    onInactivity = () => {}) {
            super(planeName, enterLogic, exitLogic, updateLogic, onActivity, onInactivity);
            this.ratio = 1;
        }

        viewportStrategy(virtualWidth, virtualHeight) {
            // Fit the plane to the tightest scale based on ratio (so plane never has a greater ratio than the specified ratio)
            this.scale = Math.min(
                (virtualWidth / this.width) * this.ratio, 
                (virtualHeight / this.height) * this.ratio
            );
            this.x = (virtualWidth - (this.width * this.scale)) / 2;
            this.y = (virtualHeight - (this.height * this.scale)) / 2;
        }
    }

    export class PannablePlane extends Plane {
        constructor(planeName, enterLogic = () => {}, exitLogic = () => {}, updateLogic = () => {}, 
                onActivity = () => {}, onInactivity = () => {}) {
            super(planeName, enterLogic, exitLogic, updateLogic, onActivity, onInactivity);

            this.pannablePlaneControlObject = new PannablePlaneController(this.x, this.y, this.z, this.width, this.height, 
            (x0, y0, x1, y1) => {
                this.x += (x0 - x1)
                this.y += (y0 - y1)
            },
            () => {this.scale /= 1.02},
            () =>  {this.scale *= 1.02}
        );
            this.addObject(this.pannablePlaneControlObject);
        }

        setDimensions(width, height){
            this.width = width;
            this.height = height;
            this.pannablePlaneControlObject.width = width
            this.pannablePlaneControlObject.height = height
        }
    }
</script>