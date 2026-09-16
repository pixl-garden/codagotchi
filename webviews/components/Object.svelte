<script context="module">
    import { Sprite, TextureSprite } from './SpriteComponent.svelte'
    import objectConfig from './objectConfig.json';
    export class BaseObject {
        constructor(states, x, y, z, actionOnClick = null) {
            if(!states){
                states = {default: [0]};
            }
            this.setCoordinate(x, y, z);
            this.actionOnClick = actionOnClick;
            this.scrollable = false;
            // State and Sprite management variables
            this.textureSprite = null;

            this.states = processStates(states);
            this.state = 'default';
            this.currentStateIndex = 0;
            this.currentSpriteIndex = this.states[this.state] ? this.states[this.state][0] : 0;
            this.stateQueue = [];
            this.isStateCompleted = false;
            this.callbackQueue = [];
            this.currentStateCallback = null;
            
            this.framesPerSecond = 30; //this should probably be abstracted to a global variable
            this.timeStep = 1 / this.framesPerSecond;
            this.velocityThreshold = 0.2;

            //Child object management variables
            this.children = [];
            this.hoverWithChildren = false; // If true, parent object will hover when children are hovered
            this.renderChildren = true; // If true, parent object will render children, otherwise only parent will render
            this.hoveredChild = null;

            // Variables for passing mouse coordinates to object if needed
            this.mouseX = null;
            this.mouseY = null;
            this.mouseInteractions = true;
            this.showPointer = false;
            this.useAbsoluteCoords = false;
            this.isDragging = false;
        }

        nextFrame() {
            const stateSprites = this.states[this.state];
            
            // Avoid unnecessary frame update if current state only has one frame and there are no queued states
            if (!stateSprites || (stateSprites.length <= 1 && this.stateQueue.length === 0)) {
                return; 
            }

            this.currentStateIndex++;
                
            // check to restart/end state
            if (this.currentStateIndex >= stateSprites.length) {
                this.currentStateIndex = 0;
                this.isStateCompleted = true;
                this.executeCurrentStateCallback();
                this.nextState();
            }
            
            // refetch the state sprites in case this.nextState() changed this.state
            const currentStateSprites = this.states[this.state];
            if (currentStateSprites) {
                this.currentSpriteIndex = currentStateSprites[this.currentStateIndex];
            }
        }
        
        onHover() {}

        onStopHover() {}

        whileHover() {}

        clickAction(gridX, gridY) {
            this.actionOnClick?.(gridX, gridY);
        }

        getWidth() {
            return this.width;
        }
        getHeight() {
            return this.height;
        }

        setCoordinate(newX, newY, newZ = null) {
            this.x = newX;
            this.y = newY;
            if( newZ !== null ) {
                this.z = newZ;
            }
        }
    
        // Method to update the object's state
        // callback is an optional function to be called when the state is completed
        updateState(newState, callback = null) {
            if (this.states[newState]) {
                this.state = newState;
                this.currentStateIndex = 0; // Reset the index
                this.currentSpriteIndex = this.states[newState][0];
                this.isStateCompleted = false;
                this.currentStateCallback = callback; // Store the callback
            }
        }

        getChildren() {
            return this.children;
        }
        addChild(...children) {
            this.children.push(...children);
        }

        removeChild(...children) {
            const childrenSet = new Set(children);
            this.children = this.children.filter(child => !childrenSet.has(child));
        }

        updateChild(child, oldChild) {
            this.children[this.children.indexOf(oldChild)] = child;
        }

        queueState(state, callback = null) {
            this.stateQueue.push({ state, callback });
            if (!this.state || this.isStateCompleted) {
                this.nextState();
            }
        }

        nextState() {
            if (this.stateQueue.length > 0) {
                const { state, callback } = this.stateQueue.shift();
                this.updateState(state, callback);
            }
        }

        executeCurrentStateCallback() {
            if (this.currentStateCallback) {
                this.currentStateCallback();
                this.currentStateCallback = null; // Reset the callback
            }
        }

        onDrag(){

        }

        onDragStop(){
            
        }
    }

    export class ConfigObject extends BaseObject {
        constructor(objectName, x, y, z = 0, actionOnClick = null, objConfig = objectConfig) {
            const config = objConfig[objectName];
            // console.log(config);
            if (!config) {
                throw new Error(`No configuration found for object type: ${objectName}`);
            }

            for (const state in config.states) {
                config.states[state] = processStateFrames(config.states[state]);
            }
            // const spriteMatrix = spriteReaderFromStore(config.spriteWidth, config.spriteHeight, config.spriteSheet);
            super(config.states, x, y, z, actionOnClick);
            
            this.width = config.trimWidth || config.spriteWidth;
            this.height = config.trimHeight || config.spriteHeight;
            this.textureSprite = new TextureSprite(config.spriteSheet, x, y, z);
            this.objectType = objectName;
            this.config = config;
            this.children = [];
        }
        getChildren() {
            return this.children;
        }
        addChild(child) {
            this.children.push(child);
        }
        onHover(){
            if(this.states["hovered"]){
                this.updateState("hovered");
            }
        }
        onStopHover(){
            if(this.states["hovered"]){
                this.updateState("default");
            }
        }
    }

    export class PannablePlaneController extends BaseObject {
        constructor(x, y, z, width, height, dragCallback, scrollDownCallback, scrollUpCallback) {
            super([], x, y, z, null)
            this.width = width;
            this.height = height;
            this.dragCallback = dragCallback;
            this.scrollDownCallback = scrollDownCallback;
            this.scrollUpCallback = scrollUpCallback;
            this.scrollable = true;
        }

        onDrag(x0, y0, x1, y1) {
            this.dragCallback(x0, y0, x1, y1);
        }

        onScrollDown(){
            this.scrollDownCallback(this.mouseX, this.mouseY);
        }

        onScrollUp(){
            this.scrollUpCallback(this.mouseX, this.mouseY);
        }
    }

    function processStates(states) {
        for (const key in states) {
            states[key] = processStateFrames(states[key]);
        }
        return states;
    }

    function processStateFrames(frames) {
        if (frames.length === 3 && frames[1] === '...') {
            const start = frames[0];
            const end = frames[2];
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
        }
        return frames;
    }

</script>