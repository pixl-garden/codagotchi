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
            return { localX, localY };
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
            this.scale = Math.min(
                (virtualWidth / this.width) * this.ratio, 
                (virtualHeight / this.height) * this.ratio
            );
            this.x = (virtualWidth - (this.width * this.scale)) / 2;
            this.y = (virtualHeight - (this.height * this.scale)) / 2;
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
        
            const combinedUpdate = () => {
                this.applyInertia();
                updateLogic();
            };

            super(planeName, enterLogic, exitLogic, combinedUpdate, onActivity, onInactivity);
            
            this.zoomScale = 1.02;

            // Inertia state variables
            this.vx = 0;
            this.vy = 0;
            this.glide = 0.85;          // closer to 1 glides longer lower stops faster
            this.minVelocity = 0.05;    // cutoff to prevent weird movements
            this.smoothing = 0.6;       // balance between responsiveness and momentum
                                          // closer to 1 velocity matches mouse movements before last frame of drag
                                          // closer to 0 velocity is based on collective frames before release (momentum)
            this.velocityDegrade = .83; //degrade when not moving

            this.pannablePlaneControlObject = new PannablePlaneController(this.x, this.y, this.z, this.width, this.height, 
                // mouse drag (new coords, old coords)
                (x0, y0, x1, y1) => {
                    const deltaX = x0 - x1;
                    const deltaY = y0 - y1;

                    this.moveWithBounds(deltaX, deltaY);

                    if(deltaX == 0 && deltaY == 0){
                        this.vx *= this.velocityDegrade;
                        this.vy *= this.velocityDegrade;
                    }

                    // velocity smoothed with momentum
                    this.vx = this.vx * (1 - this.smoothing) + deltaX * this.smoothing;
                    this.vy = this.vy * (1 - this.smoothing) + deltaY * this.smoothing;
                    this.isDragging = true;
                },
                // zoom out (scrollup)
                (mouseX, mouseY) => {
                    this.vx = 0;
                    this.vy = 0;
                    const inverseZoom = 1 / this.zoomScale;
                    this.scale *= inverseZoom;

                    this.x = mouseX - (mouseX - this.x) * inverseZoom;
                    this.y = mouseY - (mouseY - this.y) * inverseZoom;
                },
                // zoom in (scrolldown)
                (mouseX, mouseY) => {
                    this.vx = 0;
                    this.vy = 0;
                    this.scale *= this.zoomScale;
                    
                    this.x = mouseX - (mouseX - this.x) * this.zoomScale;
                    this.y = mouseY - (mouseY - this.y) * this.zoomScale;
                }
            );
            this.addObject(this.pannablePlaneControlObject);
        }

        moveWithBounds(deltaX, deltaY) {
            if (this.x + deltaX <= 0 && this.x + this.pixelWidth + deltaX >= this.lastVirtualWidth) {
                this.x += deltaX;
            } else {
                //kill velocity when bound is hit
                this.vx = 0;
            }

            if (this.y + deltaY <= 0 && this.y + this.pixelHeight + deltaY >= this.lastVirtualHeight) {
                this.y += deltaY;
            } else {
                this.vy = 0;
            }
        }

        //called every frame
        applyInertia() {
            if (Math.abs(this.vx) < this.minVelocity && Math.abs(this.vy) < this.minVelocity) {
                this.vx = 0;
                this.vy = 0;
                return;
            }

            this.moveWithBounds(this.vx, this.vy);

            this.vx *= this.glide;
            this.vy *= this.glide;
        }

        setDimensions(width, height) {
            this.width = width;
            this.height = height;
            this.pannablePlaneControlObject.width = width;
            this.pannablePlaneControlObject.height = height;
        }

        viewportStrategy(virtualWidth, virtualHeight) {
            if (this.scale === undefined) {
                this.scale = Math.min(
                    (virtualWidth / this.width) * this.ratio, 
                    (virtualHeight / this.height) * this.ratio
                );
                this.x = (virtualWidth - (this.width * this.scale)) / 2;
                this.y = (virtualHeight - (this.height * this.scale)) / 2;
            }

            if (this.lastVirtualWidth && virtualWidth !== this.lastVirtualWidth) {
                const resizeFactor = virtualWidth / this.lastVirtualWidth;
                this.scale *= resizeFactor;

                const oldCenterX = this.lastVirtualWidth / 2;
                const newCenterX = virtualWidth / 2;
                this.x = newCenterX - (oldCenterX - this.x) * resizeFactor;

                const centerY = virtualHeight / 2;
                this.y = centerY - (centerY - this.y) * resizeFactor;
            }
            this.lastVirtualWidth = virtualWidth;
            this.lastVirtualHeight = virtualHeight;
            this.pixelWidth = Math.floor(this.width * this.scale);
            this.pixelHeight = Math.floor(this.height * this.scale);
        }
    }
</script>