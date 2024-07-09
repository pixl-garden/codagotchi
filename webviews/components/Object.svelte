<script context="module">
    import { Sprite } from './SpriteComponent.svelte'
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import objectConfig from './objectConfig.json';
    import petConfig from './petConfig.json';
    import hatConfig from './hatConfig.json'
    import { generateEmptyMatrix, generateTooltipSprite, generateStatusBarSprite, generateRectangleMatrix, overlayMatrix, setMatrix, generateMenuMatrix, generateColorButtonMatrix, scaleMatrix } from './MatrixFunctions.svelte';
    import * as Colors from './colors.js';    
    import { random } from 'lodash';

    //TODO: create setRelativeCoordinate function to handle coordinates with based on parent and leave the setCoordinate function to handle absolute coordinates
    // or maybe do the other way around, create setAbsoluteCoordinate function and leave setCoordinate as is

    export class GeneratedObject {
        constructor(sprites, states, x, y, z, actionOnClick = null) {
            if (!sprites) {
                console.error(`Sprite matrix not found for object with states: ${states}`);
            }
            if(!states){
                states = {default: [0]};
            }
            this.setCoordinate(x, y, z);
            this.actionOnClick = actionOnClick;
            this.scrollable = false;
            // State and Sprite management variables
            this.sprites = sprites;
            this.spriteWidth = sprites[0][0].length;
            this.spriteHeight = sprites[0].length;
            this.states = processStates(states);
            this.state = 'default';
            this.currentStateIndex = 0;
            this.currentSpriteIndex = this.states[this.state] ? this.states[this.state][0] : 0;
            this.stateQueue = [];
            this.isStateCompleted = false;
            this.callbackQueue = [];
            this.currentStateCallback = null;
            

            // Constants for second-order dynamics movement
            this.k1 = 7.0; // Damping ratio
            this.k2 = .5; // Natural frequency
            this.k3 = 2.0; // Reference input

            // Variables for second-order dynamics movement
            this.previousX = x;
            this.previousY = y;
            this.velocityX = 0;
            this.velocityY = 0;
            this.targetX = x; // Target position X
            this.targetY = y; // Target position Y
            this.accumulatedMoveX = 0;
            this.accumulatedMoveY = 0;
            this.isMoving = false;
            this.framesPerSecond = 30; //this should probably be abstracted to a global variable
            this.timeStep = 1 / this.framesPerSecond;
            this.velocityThreshold = 0.2;

            //Child object management variables
            this.children = [];
            this.hoverWithChildren = false; // If true, parent object will hover when children are hovered
            this.renderChildren = true; // If true, parent object will render children, otherwise only parent will render
            this.hoveredChild = null;

            // Variables for passing mouse coordinates to object if needed
            this.passMouseCoords = false;
            this.mouseX = null;
            this.mouseY = null;
            this.mouseInteractions = true;
            this.showPointer = false;
            this.opacity = 1;
            this.opacityTransitionSpeed = 0;
            this.isOpacityTransitioning = false;
            this.goalOpacity = 1;
        }

        /**
         * Set the physics parameters for the object
         * @param {number} k1 - Damping ratio (how quickly the object slows down)
         * @param {number} k2 - Natural frequency (how much the motion oscillates)
         * @param {number} k3 - Reference input (how quickly the object moves towards the target)
         */
        setPhysics(k1, k2, k3){
            this.k1 = k1;
            this.k2 = k2;
            this.k3 = k3;
        }

        // Function to start moving towards a target
        startMovingTo(newTargetX, newTargetY) {
            this.targetX = newTargetX;
            this.targetY = newTargetY;
            // console.log("MOVING TO: ", this.targetX, this.targetY);
            this.isMoving = true;
        }

        updatePosition() {
            if (!this.isMoving) {
                return; // No need to update if the object is not moving
            }

            // Calculate the estimated velocity
            let estimatedVelocityX = this.x - this.previousX;
            let estimatedVelocityY = this.y - this.previousY;

            // Update previous positions
            this.previousX = this.x;
            this.previousY = this.y;

            // Calculate the acceleration based on second-order dynamics
            let accelerationX = this.k3 * (this.targetX - this.x) - this.k1 * estimatedVelocityX;
            let accelerationY = this.k3 * (this.targetY - this.y) - this.k1 * estimatedVelocityY;

            // Update velocities
            this.velocityX += accelerationX * this.timeStep;
            this.velocityY += accelerationY * this.timeStep;

            // Accumulate sub-pixel movements
            this.accumulatedMoveX += this.velocityX;
            this.accumulatedMoveY += this.velocityY;

            // Update positions by integer values if accumulated movement exceeds 1 pixel
            let moveX = Math.round(this.accumulatedMoveX);
            let moveY = Math.round(this.accumulatedMoveY);

            // Apply the integer movement
            this.x += moveX;
            this.y += moveY;

            // Subtract the integer movement from the accumulated movement
            this.accumulatedMoveX -= moveX;
            this.accumulatedMoveY -= moveY;
    

            // Check if the object has reached (or overshot) the target position
            if ((Math.abs(this.targetX - this.x) < 1 && Math.abs(this.velocityX) < this.velocityThreshold) &&
                (Math.abs(this.targetY - this.y) < 1 && Math.abs(this.velocityY) < this.velocityThreshold)) {
                this.x = this.targetX;
                this.y = this.targetY;

                // Explicitly reset velocities and accumulated movements
                this.velocityX = 0;
                this.velocityY = 0;
                this.accumulatedMoveX = 0;
                this.accumulatedMoveY = 0;

                this.isMoving = false;
            }
        }

        // Transition the object's opacity to a new value, transition speed is always positive
        startOpacityTransition(newOpacity, transitionSpeed){
            if(newOpacity < 0 || newOpacity > 1 || transitionSpeed < 0 || transitionSpeed > 1){
                console.error("Opacity and transition speed must be between 0 and 1");
            };
            this.goalOpacity = newOpacity;
            if(this.opacity != this.goalOpacity) {                
                this.opacityTransitionSpeed = transitionSpeed;
                this.isOpacityTransitioning = true;
            }
        }

        updateOpactity(){
            if(this.isOpacityTransitioning) {
                if(this.opacity < this.goalOpacity){
                    this.opacity += this.opacityTransitionSpeed;
                    if(this.opacity >= this.goalOpacity){
                        this.opacity = this.goalOpacity;
                        this.isOpacityTransitioning = false;
                    }
                }
                else if(this.opacity > this.goalOpacity){
                    this.opacity -= this.opacityTransitionSpeed;
                    if(this.opacity <= this.goalOpacity){
                        this.opacity = this.goalOpacity;
                        this.isOpacityTransitioning = false;
                    }
                }
            }
        }

        nextFrame() {
            if(this.isMoving){
                this.updatePosition();
            }
            this.updateOpactity();
            // Avoid unneccessary frame update if current state only has one frame and there are no queued states
            if(this.state.length <= 1 && this.stateQueue.length == 0){
                return;
            }

            // Define sprites for current state
            const stateSprites = this.states[this.state];

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

        onHover() {}

        onStopHover() {}

        whileHover() {}

        clickAction(gridX, gridY) {
            this.actionOnClick(gridX, gridY);
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
            return new Sprite(this.sprites[this.currentSpriteIndex], this.x, this.y, this.z, this.opacity);
        }

        getChildSprites() {
            let childSprites = [];
            const accumulateChildSprites = (parent, offsetX = 0, offsetY = 0, offsetZ = 0) => {
                for (let child of parent.children) {
                    let childSprite = child.getSprite();
                    if(childSprite != null){
                        // Apply both the current parent's offset and any accumulated offset from ancestors
                        childSprite.x += offsetX + parent.x;
                        childSprite.y += offsetY + parent.y;
                        childSprite.z += offsetZ + parent.z;
                        childSprites.push(childSprite);
                    }


                    // If the child has its own children, recursively accumulate their sprites too
                    if (child.children.length > 0) {
                        accumulateChildSprites(child, offsetX + parent.x, offsetY + parent.y, offsetZ + parent.z);
                    }
                }
            };

            // Start the recursive accumulation with the current object as the root
            accumulateChildSprites(this);
            return childSprites;
        }

        // Method to update the object's state
        // callback is an optional function to be called when the state is completed
        updateState(newState, callback = null) {
            if (this.states[newState]) {
                this.state = newState;
                this.currentSpriteIndex = this.states[newState][0];
                this.isStateCompleted = false;
                this.currentStateCallback = callback; // Store the callback
            }
        }


        getChildren() {
            return this.children;
        }
        addChild(child) {
            this.children.push(child);
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
            return new Sprite(this.textRenderer.renderText(this.text), this.x, this.y, this.z);
        }
    }

    //TODO: make hat a separate object and make it a child of the pet class
    export class Pet extends GeneratedObject {
        //TODO: abstract state groups into a separate class
        constructor(petType, x, y, z, gameReference) {
            const config = petConfig[petType];
            if (!config) {
                throw new Error(`No configuration found for pet type: ${petType}`);
            }

            const petSpriteArray = spriteReaderFromStore(config.spriteWidth, config.spriteHeight, config.spriteSheet);
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
            this.gameReference = gameReference
            this.hat 
        }

        getSprite() {
            let petSprite = new Sprite(this.sprites[this.currentSpriteIndex], this.x, this.y, this.z);
            // let hatSprite = this.getHat()
            // return [petSprite, hatSprite]
            return petSprite;
        }

        setHat(hat) {
            this.hat = hat
            this.currentHatConfig = this.hatConfig[hat]
            this.hatSprite = spriteReaderFromStore(this.hatConfig.spriteWidth, this.hatConfig.spriteHeight, this.hatConfig.spriteSheet)[this.currentHatConfig.spriteIndex]
            this.hatAnchorX = this.currentHatConfig.anchorX
            this.hatAnchorY = this.currentHatConfig.anchorY
            this.gameReference.updateGlobalState({"hat": this.hat})
        }

        getHat() {
            if (this.hat == null && this.gameReference.getLocalState().hat != null){
                this.setHat(this.gameReference.getLocalState().hat)
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

   

    //TODO: needs to be modified when non monospace fonts are implemented
    export class multiLineTextRenderer extends GeneratedObject {
        constructor(x, y, z, width, height, lineHeight, textRenderer, letterWidth, letterSpacing, hasCursor = true){
            const emptyMatrix = generateEmptyMatrix(width, height);
            super(emptyMatrix, { default: [0] }, x, y, z);
            this.textRenderer = textRenderer;
            this.x = x;
            this.y = y;
            this.z = z;
            this.width = width;
            this.height = height;
            this.lineHeight = lineHeight;
            this.hasCursor = hasCursor;
            this.isActive = false;
            this.blinkCounter = 0;
            this.blinkInterval = 10;
            this.showingCursor = false;
            this.text = "";
            this.lines = [];
            this.color = null;
        }
        setColor(color) {
            this.color = color;
        }
        setTextActive(bool) {
            this.isActive = bool;
        }
        alternateCursor() {
            this.blinkCounter++;
            if (this.blinkCounter >= this.blinkInterval) {
                this.blinkCounter = 0;
                this.showingCursor = !this.showingCursor;
            }
        }
        setText(text) {
            this.text = text;
            this.lines = this.wrapText(text, this.width);
        }

        wrapText(text, maxWidth) {
            let words = text.split(' ');
            let lines = [];
            let currentLine = '';
            let currentWidth = 0;
            const spaceWidth = this.textRenderer.measureText(' ');

            words.forEach((word) => {
                if (word === '') {
                    // handle multiple spaces
                    currentLine += ' ';
                    currentWidth += spaceWidth;
                    return;
                }
                let wordWidth = this.textRenderer.measureText(word);
                if (wordWidth > maxWidth) {
                    // Handle long words by breaking them with hyphenation
                    if (currentWidth > 0) {  // Push current line and start a new one if not empty
                        lines.push(currentLine.trim());
                        currentLine = '';
                        currentWidth = 0;
                    }
                    while (wordWidth > maxWidth) {
                        let part = word;
                        while (this.textRenderer.measureText(part + '-') > maxWidth) {
                            part = part.slice(0, -1);  // Continuously remove the last character
                        }
                        if (part.length < word.length) { // Only add hyphen if part was actually cut
                            lines.push(part + '-');
                            word = word.substring(part.length);  // Remove the part from the word
                        } else { // If the whole part fits and it's exactly the word, no hyphen needed
                            lines.push(part);
                            word = '';
                        }
                        wordWidth = this.textRenderer.measureText(word);  // Measure remaining part
                    }
                    if (word) { // If there's any remainder that fits within maxWidth
                        currentLine = word + ' ';
                        currentWidth = this.textRenderer.measureText(currentLine);
                    }
                } else {
                    // Proceed as normal if the word fits in the width
                    if (currentWidth + wordWidth > maxWidth) {
                        lines.push(currentLine.trim());
                        currentLine = word + ' ';
                        currentWidth = wordWidth + spaceWidth;
                    } else {
                        currentLine += word + ' ';
                        currentWidth += wordWidth + spaceWidth;
                    }
                }
            });

            if (currentLine) {
                if(this.isActive && this.showingCursor) {
                    currentLine = currentLine.slice(0, -1) + '|';  // Adjust for cursor display
                }
                lines.push(currentLine.trim());
            }

            return lines;
        }

        externalRender() {
            let matrix = generateEmptyMatrix(this.width, this.height + 1);
            let currentY = this.y;
            this.lines.forEach(line => {
                let renderedLine = this.color === null ? 
                    this.textRenderer.renderText(line) :
                    this.textRenderer.renderText(line, this.color);
                renderedLine.forEach((row, y) => {
                    if(currentY + this.lineHeight >= this.y + this.height) {
                        return;
                    }
                    row.forEach((color, x) => {
                        matrix[currentY + y][x] = color;
                    });
                });
                currentY += this.lineHeight;
            });
            return matrix;
        }
    }

    export class ConfigObject extends GeneratedObject {
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

    export class Button extends ConfigObject {
        constructor(x, y, z, objectName, actionOnClick) {
            super(objectName, x, y, z, actionOnClick);
            this.action = actionOnClick || (() => {});
            this.updateState("default");
            this.showPointer = true;
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

    export class Background extends ConfigObject {
        constructor(objectName, x, y, z, actionOnClick = () => {}) {
            super(objectName, x, y, z, () => {
                actionOnClick();
            });
            this.stateQueue = [];
            this.isStateCompleted = false;
            this.updateState("default")
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

    export class ObjectGrid extends GeneratedObject {
        constructor(columns, columnSpacing, rows, rowSpacing, x, y, z, objects, visibleX = 0, visibleY = 0, scrollDirection = "vertical", scrollSpeed = 5) {
            super(generateEmptyMatrix(120, 120), null, x, y, z);
            this.columns = columns > 0 ? columns : objects.length;
            this.columnSpacing = columnSpacing;
            this.rows = rows > 0 ? rows : Math.ceil(objects.length / this.columns);
            this.rowSpacing = rowSpacing;
            this.x = x;
            this.y = y;
            this.z = z;
            this.children = objects;
            this.visibleX = visibleX;
            this.visibleY = visibleY;
            this.scrollDirection = scrollDirection;
            this.scrollSpeed = scrollSpeed;
            this.scrollOffsetX = 0;
            this.scrollOffsetY = 0;
            this.renderChildren = false;
            this.scrollable = true;
            this.spriteWidth = 120;
            this.spriteHeight = 120;
            this.hoverWithChildren = true;
            this.passMouseCoords = true;
            this.mouseX = null;
            this.mouseY = null;
            this.renderChildren = true;
            this.childHeight = this.children.length > 0 ? this.children[0].getHeight() : 0;
            this.childWidth = this.children.length > 0 ? this.children[0].getWidth() : 0;
            this.spriteWidth = (this.childWidth + this.columnSpacing) * this.columns;
            this.spriteHeight = (this.childHeight + this.rowSpacing) * this.rows;
            this.objectTop = 0;
            this.objectBottom = 128 - this.spriteHeight;
            this.generateObjectGrid();
        }

        getSprite(){

        }

        // getSprite() {
        //     let spritesOut = [];
        //     if(this.children.length > 0) {
        //         this.getChildSprites().forEach((sprite) => {
        //             // console.log("Child sprite: ", sprite)
        //             if (Array.isArray(sprite)) {
        //                 spritesOut.push(...sprite);
        //             //if not an array, push sprite
        //             } else {
        //                 spritesOut.push(sprite);
        //             }
        //         });
        //     }
        //     return spritesOut;
        // }

        onScrollUp() {
            if (this.scrollDirection === "horizontal") {
                this.scrollOffsetX += this.scrollSpeed;
            } else if(this.scrollOffsetY <= this.objectTop) { // Assuming horizontal scrolling, stop at top of page
                this.scrollOffsetY += this.scrollSpeed;

            }
            this.generateObjectGrid(); // Re-generate grid to reflect new positions
        }

        onScrollDown() {
            if (this.scrollDirection === "horizontal") {
                this.scrollOffsetX -= this.scrollSpeed;
            } else if(this.scrollOffsetY >= this.objectBottom) { // Assuming horizontal scrolling
                this.scrollOffsetY -= this.scrollSpeed;

            }
            this.generateObjectGrid(); // Re-generate grid to reflect new positions
        }

        generateObjectGrid() {
            let currentX = this.scrollOffsetX;
            let currentY = this.scrollOffsetY;
            // console.log("CURRENTX: ", currentX, "CURRENTY: ", currentY);

            for (let row = 0; row < this.rows; row++) {
                for (let column = 0; column < this.columns; column++) {
                    let index = row * this.columns + column;
                    if (index >= this.children.length) break;

                    let objectX = currentX + (column * (this.childWidth + this.columnSpacing));
                    let objectY = currentY + (row * (this.childHeight + this.rowSpacing));
                    this.children[index].setCoordinate(objectX, objectY, this.z);
                }
            }

        }

        updateObjects(objectsArray){
            this.children = objectsArray;
            this.generateObjectGrid();
        }
    }

    export class toolTip extends GeneratedObject {
        //TODO: implement proper z axis
        constructor(borderColor, backgroundColor, roundness, padding, textRenderer){
            const emptyMatrix = generateEmptyMatrix(1, 1);
            super([emptyMatrix], { default: [0] }, 10, 90, 40);
            this.item;
            this.currentTitle = "";
            this.currentDescription = "";
            this.currentSprite;
            this.borderColor = borderColor;
            this.backgroundColor = backgroundColor;
            this.roundness = roundness;
            this.padding = padding;
            this.textRenderer = textRenderer;
        }
        generateSprite(){
            this.currentSprite = generateTooltipSprite(this.currentTitle, this.borderColor, this.backgroundColor, this.roundness, this.padding, this.textRenderer);
        }
        setItem(item){
            this.item = item;
            this.currentTitle = item.getName();
            this.currentDescription = item.getDescription();
            this.generateSprite();
        }
        getSprite(){
            return new Sprite(this.currentSprite, this.x, this.y, 40);
        }
    }

    export class ItemSlot extends ConfigObject {
        constructor(objectName, x, y, z, actionOnClick = null) {
            super(objectName, x, y, z, actionOnClick);
            this.slotItem = null;
        }
    }

    export class textButtonList extends ObjectGrid {
        constructor(buttonTexts, buttonFunctions, buttonConstructor, buttonWidth, buttonHeight, spacing, x, y, z, orientation = "vertical", scroll = false, scrollSpeed = 0, visibleX = 0, visibleY = 0) {
            let buttons = [];
            for(let i = 0; i < buttonTexts.length; i++){
                let button = new buttonConstructor(x, y, z, buttonTexts[i], buttonFunctions[i], buttonWidth, buttonHeight);
                buttons.push(button);
            }
            if(buttonFunctions.length > buttonTexts.length){
                throw new Error("There are more button functions than button texts");
            }
            if(orientation === "horizontal"){
                super(buttons.length, spacing, 1, 0, x, y, z, buttons, visibleX, visibleY, "horizontal", scrollSpeed);
            }
            else{
                super(1, 0, buttons.length, spacing, x, y, z, buttons, visibleX, visibleY, "vertical", scrollSpeed);
            }
        }
    }

    export class ButtonList extends ObjectGrid {
        constructor(x, y, z, orientation, buttonSpacing, ButtonConstructor, ...buttonParameters) {
            let buttons = [];
            for (let i = 0; i < buttonParameters.length; i++) {
                // Ensure buttonParameters[i] is an array
                if (!Array.isArray(buttonParameters[i])) {
                    throw new TypeError(`buttonParameters[${i}] is not an array.`);
                }
                let button = new ButtonConstructor(x, y, z, ...buttonParameters[i]);
                buttons.push(button);
            }
            if (orientation === "horizontal") {
                super(buttons.length, buttonSpacing, 1, 0, x, y, z, buttons, 0, 0, "horizontal", 0);
            } else {
                super(1, 0, buttons.length, buttonSpacing, x, y, z, buttons, 0, 0, "vertical", 0);
            }
        }
    }

    export class Menu extends GeneratedObject {
        constructor(x, y, z, width, height, bgColor, innerBorderColor, outerBorderColor, innerRoundness, 
                outerRoundness, innerBorderThickness = 3 , outerBorderThickness = 1){
            const backgroundMatrix = generateMenuMatrix(width, height, bgColor, innerBorderColor, outerBorderColor, 
                innerRoundness, outerRoundness, innerBorderThickness, outerBorderThickness);
            super([backgroundMatrix], { default: [0] }, x, y, z);
            this.width = width;
            this.height = height;
            this.stateQueue = [];
            this.isStateCompleted = false;
            this.updateState("default")
        }
    }

    export class Notification extends Menu {
        constructor(x, y, z, width, height, textRenderer, bgColor, innerBorderColor, outerBorderColor, innerRoundness, 
        outerRoundness, innerBorderThickness = 3 , outerBorderThickness = 1) {
            super(x, y, z, width, height, bgColor, innerBorderColor, outerBorderColor, innerRoundness, 
            outerRoundness, innerBorderThickness , outerBorderThickness)
            // TODO: update to center text and item if new notification dimensions are needed
            this.textX = 26;
            this.textY = 9;
            this.textZ = 13;
            this.itemX = 7;
            this.itemY = 6;
            this.itemZ = 13;
            this.notifText = new activeTextRenderer(textRenderer, this.textX, this.textY, this.textZ);
            this.notifItem;
            this.children = [this.notifText];
            this.setPhysics(16, .2, 3.8);
        }

        callNotificationItem(item, callbackFunction = () => {}, text = item.getName()) {
            this.notifText.setText(text);
            this.notifItem ? this.updateChild(item, this.notifItem) : this.addChild(item);
            this.notifItem = item;
            this.startMovingTo(6, 3);
            setTimeout(() => {
                this.startMovingTo(6, -29);
                callbackFunction();
            }, 4000)
        }
    }


</script>
