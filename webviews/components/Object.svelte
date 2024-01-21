<script context="module">
    import { Sprite } from './Codagotchi.svelte';
    import { spriteReader, spriteReaderFromStore } from './SpriteReader.svelte';
    import objectConfig from './objectConfig.json';
    import petConfig from './petConfig.json';
    import { game, inputValue } from './Game.svelte';
    import { get } from 'svelte/store';
    import hatConfig from './hatConfig.json'
    import { getGlobalState, getLocalState, setGlobalState, setLocalState } from './localSave.svelte';
    import { generateEmptyMatrix } from './MatrixFunctions.svelte';
    import TextRenderer from './TextRenderer.svelte';
    

    export class GeneratedObject {
        constructor(sprites, states, x, y, z, actionOnClick = null) {
            if (!sprites) {
                console.error(`Sprite matrix not found for object with states: ${states}`);
            }
            this.sprites = sprites;
            this.spriteWidth = sprites[0][0].length;
            this.spriteHeight = sprites[0].length;
            this.states = processStates(states);
            this.currentSpriteIndex = 0;
            this.currentStateIndex = 0;
            this.state = 'default';
            this.setCoordinate(x, y, z);
            this.actionOnClick = actionOnClick;
            this.stateQueue = [];
            this.isStateCompleted = false;
            this.callbackQueue = [];
            this.currentStateCallback = null;
            
            // Movement related properties
            this.isMoving = false;
            this.targetX = 0;
            this.targetY = 0;
            this.speedFunction = null;
            this.startX = 0;
            this.startY = 0;
            this.accumulatedMoveX = 0;
            this.accumulatedMoveY = 0;

            this.bouncing = false;
            this.bounceFrame = 0;
            this.maxBounceFrames = 3; // Total frames for the bounce
            this.bounceHeight = 1; // Height of the bounce
        }
        getWidth() {
            return this.spriteWidth;
        }
        getHeight() {
            return this.spriteHeight;
        }

        getZ() {
            return this.z;
        }

        setCoordinate(newX, newY, newZ) {
            this.x = newX;
            this.y = newY;
            this.z = newZ;
        }
        
        getSprite() {
            return new Sprite(this.sprites[this.currentSpriteIndex], this.x, this.y, this.z);
        }

        updateState(newState, callback = null) {
            if (this.states[newState]) {
                this.state = newState;
                this.currentSpriteIndex = this.states[newState][0];
                this.isStateCompleted = false;
                this.currentStateCallback = callback; // Store the callback
            }
        }

        // Basic movement function (z axis unchanged)
        move(deltaX, deltaY) {
            // console.log(`Moving from (${this.x}, ${this.y}) by (${deltaX}, ${deltaY})`);
            this.x += deltaX;
            this.y += deltaY;
            // this.z remains unchanged
        }

        // Function to start moving towards a target
        startMovingTo(targetX, targetY, speedFunction, attachedObjs = []) {
            this.targetX = targetX;
            this.targetY = targetY;
            this.speedFunction = speedFunction;
            this.isMoving = true;
            this.startX = this.x;
            this.startY = this.y;
            this.attachedObjs = attachedObjs;
        }

        // Function to handle the movement towards the target
        moveToTarget() {
            let diffX = this.targetX - this.x;
            let diffY = this.targetY - this.y;

            let remainingDistanceX = Math.abs(diffX);
            let remainingDistanceY = Math.abs(diffY);

            if (remainingDistanceX < 1 && remainingDistanceY < 1 && !this.bouncing) {
                // Start bouncing
                this.bouncing = true;
                this.bounceFrame = 0;
                this.bounceDirection = Math.sign(diffY); // Determine the direction of the bounce
            }

            if (!this.bouncing) {
                // Normal movement logic
                let desiredMoveX = Math.sign(diffX) * this.speedFunction(remainingDistanceX, Math.abs(this.targetX - this.startX));
                let desiredMoveY = Math.sign(diffY) * this.speedFunction(remainingDistanceY, Math.abs(this.targetY - this.startY));

                desiredMoveX = Math.min(Math.abs(desiredMoveX), remainingDistanceX) * Math.sign(desiredMoveX);
                desiredMoveY = Math.min(Math.abs(desiredMoveY), remainingDistanceY) * Math.sign(desiredMoveY);

                this.accumulatedMoveX += desiredMoveX;
                this.accumulatedMoveY += desiredMoveY;

                let moveX = Math.round(this.accumulatedMoveX);
                let moveY = Math.round(this.accumulatedMoveY);

                this.move(moveX, moveY);

                for(let i = 0; i < this.attachedObjs.length; i++){
                    this.attachedObjs[i].move(moveX, moveY);
                }

                this.accumulatedMoveX -= moveX;
                this.accumulatedMoveY -= moveY;
            } else if (this.bounceFrame < this.maxBounceFrames) {
                // Bounce logic
                let bounceAmount = Math.round(this.bounceHeight * Math.sin(Math.PI * this.bounceFrame / this.maxBounceFrames));
                if (this.bounceDirection === 1) {
                    // Bounce down
                    this.y = this.targetY + bounceAmount;
                } else {
                    // Bounce up
                    this.y = this.targetY - bounceAmount;
                }
                this.bounceFrame++;
            } else {
                // End of bounce, settle at the target
                this.isMoving = false;
                this.bouncing = false;
                this.y = this.targetY;
            }
        }


        nextFrame() {
            if (this.isMoving) {
                // Continue moving towards the target
                this.moveToTarget();
            }
            // Avoid unneccessary frame update if object has only one state and no queued states
            if(this.state.length <= 1 && this.stateQueue.length == 0){
                return;
            }

            // Define sprites for current state
            const stateSprites = this.config.states[this.state];

            // If the state index exceeds the state length, reset to first sprite in state
            if (this.currentStateIndex >= stateSprites.length) {
                this.currentSpriteIndex = stateSprites[0];
                this.currentStateIndex = 0;
                this.isStateCompleted = true;
                this.executeCurrentStateCallback();
                this.nextState();
            }
            // Otherwise, set the current sprite to the next sprite in the state
            else{
                this.currentSpriteIndex = stateSprites[this.currentStateIndex++];
            }
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

        onHover() {}

        onStopHover() {}

        whileHover() {}

        clickAction(gridX, gridY) {
            this.actionOnClick(gridX, gridY);
        }
    }

    export class activeTextRenderer extends GeneratedObject {
        constructor(textRenderer, x, y, z, actionOnClick = null) {
            const emptyMatrix = generateEmptyMatrix(1, 1);
            super([emptyMatrix], { default: [0] }, x, y, z, actionOnClick);
            this.textRenderer = textRenderer;
            this.text = "";
            this.stateQueue = [];
            this.isStateCompleted = false;
            this.updateState("default");
        }
        setText(text) {
            this.text = text;
        }
        getSprite(){
            return new Sprite(this.textRenderer(get(inputValue)), this.x, this.y, this.z);
        }
    }

    export class Pet extends GeneratedObject {
        //TODO: abstract state groups into a separate class
        constructor(petType, x, y, z, hat) {
            const config = petConfig[petType];
            if (!config) {
                throw new Error(`No configuration found for pet type: ${petType}`);
            }

            const petSpriteArray = spriteReaderFromStore(config.spriteWidth, config.spriteHeight, config.spriteSheet);            //GeneratedObject(sprites, states, x, y, z, actionOnClick)
            super(petSpriteArray, config.states, x, y, z, () => {
                this.queueState('flop');
                this.queueState('flop');
                this.queueState('default')
            });
            
            if (config.stateGroups) {
                this.stateGroups = this.processStateGroups(config.stateGroups);
            } else {
                this.stateGroups = {};
            }
            this.config = config;
            //TODO: map hat anchor from pet spritesheet
            this.petAnchorX = 24
            this.petAnchorY = 12
            this.stateQueue = [];
            this.isStateCompleted = false;
            this.updateState("default")
            this.hatConfig = hatConfig
            this.hat 
        }

        getSprite() {
            let petSprite = new Sprite(this.sprites[this.currentSpriteIndex], this.x, this.y, this.z);
            let hatSprite = this.getHat()
            return [petSprite, hatSprite]
        }

        setHat(hat) {
            this.hat = hat
            this.currentHatConfig = this.hatConfig[hat]
            this.hatSprite = spriteReaderFromStore(this.hatConfig.spriteWidth, this.hatConfig.spriteHeight, this.hatConfig.spriteSheet)[this.currentHatConfig.spriteIndex]
            this.hatAnchorX = this.currentHatConfig.anchorX
            this.hatAnchorY = this.currentHatConfig.anchorY
            get(game).setGlobalState({"hat": this.hat})
        }

        getHat() {
            if (this.hat == null && get(game).getLocalState().hat != null){
                this.setHat(get(game).getLocalState().hat)
            }
            return new Sprite(this.hatSprite, this.x + this.petAnchorX - this.hatAnchorX, this.y + this.petAnchorY - this.hatAnchorY);
        }

        processStateGroups(stateGroups) {
            const processedGroups = {};
            for (const groupKey in stateGroups) {
                let group = stateGroups[groupKey];
                processedGroups[groupKey] = [];
                for (const stateKey in group) {
                    let odds = group[stateKey];
                    for (let i = 0; i < odds; i++) {
                        processedGroups[groupKey].push({
                            stateName: stateKey,
                            frames: this.states[stateKey]
                        });
                    }
                }
            }
            return processedGroups;
        }

        selectRandomStateInGroup(groupName) {
            const stateGroup = this.stateGroups[groupName];
            if (!stateGroup) {
                console.error(`State group '${groupName}' not found.`);
                return null;
            }
            const randomIndex = Math.floor(Math.random() * stateGroup.length);
            return stateGroup[randomIndex];
        }

        updateState(newState, callback = null) {
            if (this.stateGroups[newState]) {
                // newState is a state group
                const randomState = this.selectRandomStateInGroup(newState);
                if (randomState) {
                    this.state = randomState.stateName;
                    this.currentSpriteIndex = this.state[randomState][0]
                    this.isStateCompleted = false;
                    this.currentStateCallback = callback
                }
            } else if (this.states[newState]) {
                // newState is a top-level state
                this.state = newState;
                this.currentSpriteIndex = this.states[newState][0]; // set to the first sprite of the new state
                this.isStateCompleted = false;
                this.currentStateCallback = callback
            } else {
                console.error(`State '${newState}' not found.`);
                return;
            }
        }
    }

    export class PixelCanvas extends GeneratedObject {
        constructor(x, y, z, width, height) {
            const emptyMatrix = generateEmptyMatrix(width, height);
            super([emptyMatrix], { default: [0] }, x, y, z, (gridX, gridY) => {
                this.paintPixel(gridX-1, gridY-1);
            });
            this.canvasWidth = width;
            this.canvasHeight = height;
            this.pixelMatrix = emptyMatrix;
            this.color = 'red';
            this.lastX = null;
            this.lastY = null;
            this.offsetX = x;
            this.offsetY = y;
        }

        getSprite() {
            return new Sprite(this.pixelMatrix, this.x, this.y, this.z);
        }

        setColor(color) {
            this.color = color;
        }

        paintPixel(x, y) {
            // Adjust x and y based on the canvas offset
            const adjustedX = x - this.offsetX;
            const adjustedY = y - this.offsetY;

            // Check if the adjusted coordinates are within canvas bounds
            if (adjustedX < 0 || adjustedX >= this.canvasWidth || adjustedY < 0 || adjustedY >= this.canvasHeight) return;

            this.pixelMatrix[adjustedY][adjustedX] = this.color;
            // console.log(`Painted pixel at (${adjustedX}, ${adjustedY})`);
        }

        clearCanvas() {
            this.pixelMatrix = this.pixelMatrix.map(row => row.fill('transparent'));
        }

        getIntermediatePoints(x0, y0, x1, y1) {
            // console.log(`Getting intermediate points between (${x0}, ${y0}) and (${x1}, ${y1})`);
            let points = [];
            const dx = Math.abs(x1 - x0);
            const dy = Math.abs(y1 - y0);
            const sx = (x0 < x1) ? 1 : -1;
            const sy = (y0 < y1) ? 1 : -1;
            let err = dx - dy;

            while (true) {
                points.push({x: x0, y: y0});

                if (x0 === x1 && y0 === y1) break;
                let e2 = 2 * err;
                if (e2 > -dy) { err -= dy; x0 += sx; }
                if (e2 < dx) { err += dx; y0 += sy; }
            }
            // console.log(points)
            return points;
        }

        drawLine(x0, y0, x1, y1) {
            const points = this.getIntermediatePoints(x0, y0, x1, y1);
            points.forEach(point => {
                this.paintPixel(point.x, point.y);
            });
        }
        // clickAction() {
        //     this.actionOnClick();
        // }

        // Other methods as needed (e.g., save, load)
    }

    export class Object extends GeneratedObject {
        constructor(objectName, x, y, z = 0, actionOnClick = null) {
            const config = objectConfig[objectName];
            // console.log(config);
            if (!config) {
                throw new Error(`No configuration found for object type: ${objectName}`);
            }

            for (const state in config.states) {
                config.states[state] = processStateFrames(config.states[state]);
            }

            const spriteMatrix = spriteReaderFromStore(config.spriteWidth, config.spriteHeight, config.spriteSheet);
            // console.log('SPRITE MATRIX: ', spriteMatrix);
            super(spriteMatrix, config.states, x, y, z, actionOnClick);
            this.spriteWidth = config.spriteWidth;
            this.spriteHeight = config.spriteHeight;
            this.objectType = objectName;
            this.config = config;
        }
    }

    export class Button extends Object {
        constructor(objectName, x, y, actionOnClick, z = 0) {
            super(objectName, x, y, z, actionOnClick);
            this.action = actionOnClick || (() => {});
        }

        onHover() {
            // console.log('Button is hovered!');
            this.updateState('hovered');
            // Add any button-specific hover effects or logic here
        }

        onStopHover() {
            // console.log('Button hover stopped!');
            this.updateState('default');
            // Reset any button-specific hover effects here
        }
    }

    export class Background extends Object {
        constructor(objectName, x, y, z, actionOnClick = () => {}) {
            super(objectName, x, y, z, () => {
                actionOnClick();
            });
            this.stateQueue = [];
            this.isStateCompleted = false;
            this.updateState("default")
        }
    }
    export class NavigationButton extends Button {
        constructor(objectName, x, y, targetRoom, z = 0) {
            super(
                objectName, x, y, () => {
                    // Set the current room in the game object to the target room
                    get(game).setCurrentRoom(targetRoom); 
                }, z
            );
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
