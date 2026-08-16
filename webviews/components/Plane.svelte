<script context="module">
    import { get } from 'svelte/store';
    import { game } from './Game.svelte';

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
            this.scale = 1;
            this.height = 128;
            this.width = 128;
            
            get(game).updatePlanes(planeName, this); // Add room to game object
        }

        addObject(...objects) {
            //allows for multiple object parameters to be added at once
            for (let object of objects) {
                this.objects.push(object);
            }
        }

        getObjects() {
            return this.objects;
        }

        convertToLocalCoords(screenX, screenY){
            const localX = (screenX - this.x) / this.scale;
            const localY = (screenY - this.y) / this.scale;
            return { x: localX, y: localY };
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

        viewportStrategy(aspectRatio) {
            // Default viewport strategy logic
        }
    }

    export class MinRelativePlane extends Plane {
        constructor(planeName, enterLogic = () => {}, exitLogic = () => {}, updateLogic = () => {}, onActivity = () => {},   
                    onInactivity = () => {}) {
            super(planeName, enterLogic, exitLogic, updateLogic, onActivity, onInactivity);
            this.ratio = .8;
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
</script>