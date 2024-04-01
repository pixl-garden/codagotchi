<script context="module">
    import { Sprite } from './Codagotchi.svelte';
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import objectConfig from './objectConfig.json';
    import petConfig from './petConfig.json';
    import { game } from './Game.svelte';
    import { get } from 'svelte/store';
    import hatConfig from './hatConfig.json'
    import { generateEmptyMatrix, generateTooltipSprite, generateStatusBarSprite, generateRectangleMatrix } from './MatrixFunctions.svelte';

    

    //TODO: create setRelativeCoordinate function to handle coordinates with based on parent and leave the setCoordinate function to handle absolute coordinates


    //TODO: MOVEMENT NEEDS WORK, BEHAVES DIFFERENTLY IN DIFFERENT DIRECTIONS
    export class GeneratedObject {
        constructor(sprites, states, x, y, z, actionOnClick = null) {
            if (!sprites) {
                console.error(`Sprite matrix not found for object with states: ${states}`);
            }
            if(!states){
                states = {default: [0]};
            }
            this.sprites = sprites;
            this.spriteWidth = sprites[0][0].length;
            this.spriteHeight = sprites[0].length;
            this.states = processStates(states);
            this.state = 'default';
            this.currentSpriteIndex = this.states[this.state] ? this.states[this.state][0] : 0;
            this.currentStateIndex = 0;
            this.setCoordinate(x, y, z);
            this.actionOnClick = actionOnClick;
            this.stateQueue = [];
            this.isStateCompleted = false;
            this.callbackQueue = [];
            this.currentStateCallback = null;
            
            this.previousX = x;
            this.previousY = y;
            this.velocityX = 0;
            this.velocityY = 0;

            // Constants for second-order dynamics
            this.k1 = 7.0; // Damping ratio
            this.k2 = .5; // Natural frequency
            this.k3 = 2.0; // Reference input

            this.targetX = x; // Target position X
            this.targetY = y; // Target position Y
            this.accumulatedMoveX = 0;
            this.accumulatedMoveY = 0;
            this.isMoving = false; // Is object currently moving

            this.children = [];
            this.hoverWithChildren = false;
            this.renderChildren = true;
            this.scrollable = false;
            this.hoveredChild = null;
            this.passMouseCoords = false;
            this.mouseX = null;
            this.mouseY = null;
            this.framesPerSecond = 30;
            this.timeStep = 1 / this.framesPerSecond;
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

        getChildSprites() {
            let childSprites = [];
            const accumulateChildSprites = (parent, offsetX = 0, offsetY = 0) => {
                for (let child of parent.children) {
                    let childSprite = child.getSprite();
                    // Apply both the current parent's offset and any accumulated offset from ancestors
                    childSprite.x += offsetX + parent.x;
                    childSprite.y += offsetY + parent.y;
                    childSprites.push(childSprite);

                    // If the child has its own children, recursively accumulate their sprites too
                    if (child.children.length > 0) {
                        accumulateChildSprites(child, offsetX + parent.x, offsetY + parent.y);
                    }
                }
            };

            // Start the recursive accumulation with the current object as the root
            accumulateChildSprites(this);
            return childSprites;
        }

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

        // Method to register button parameters
        registerButtonParams(buttonParams) {
            this.buttonParams = buttonParams;
        }

        //TODO: REMOVE THIS FUNCTION (replace with robust child system)
        initializeButtons() {
            this.buttonParams.forEach(param => {
                const { xOffset, yOffset, zOffset, buttonObject, actionOnClick } = param;

                // Calculate absolute positions by adding offsets to the object's position
                const buttonX = xOffset;
                const buttonY = yOffset;
                const buttonZ = zOffset;

                buttonObject.action = actionOnClick
                buttonObject.setCoordinate(buttonX, buttonY, buttonZ);
                this.children.push(buttonObject);
            });
        }


        // Function to start moving towards a target
        startMovingTo(newTargetX, newTargetY) {
            this.targetX = newTargetX;
            this.targetY = newTargetY;
            console.log("MOVING TO: ", this.targetX, this.targetY);
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

            console.log(`X: ${this.x}, Y: ${this.y}, TargetX: ${this.targetX}, TargetY: ${this.targetY}`);
            console.log(`VelocityX: ${this.velocityX}, VelocityY: ${this.velocityY}`);
            console.log(`AccumulatedMoveX: ${this.accumulatedMoveX}, AccumulatedMoveY: ${this.accumulatedMoveY}`);
    

            // Check if the object has reached (or overshot) the target position
            if ((Math.abs(this.targetX - this.x) < 1) && (Math.abs(this.targetY - this.y) < 1)) {
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


        nextFrame() {
            if(this.isMoving){
                this.updatePosition();
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
            return new Sprite(this.textRenderer(this.text), this.x, this.y, this.z);
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
                this.paintPixel(gridX, gridY);
            });
            this.canvasWidth = width;
            this.canvasHeight = height;
            this.pixelMatrix = emptyMatrix;
            this.color = 'white';
            this.lastX = null;
            this.lastY = null;
            this.offsetX = x;
            this.offsetY = y;
            this.colorArray = ["white", "red", "blue", "green"];
            this.colorArrayIndex = 0;
            this.brushSize = 10;
            this.brushShape = "circle";
            
        }
        setBrushSize(size) {
        this.brushSize = size;
        }

        paintPixel(x, y) {
            // Adjust x and y based on the canvas offset
            const adjustedX = x - this.offsetX;
            const adjustedY = y - this.offsetY;

            if (this.brushShape === 'square') {
                // Square brush logic (unchanged)
                const halfBrushSize = Math.floor(this.brushSize / 2);
                for (let offsetY = -halfBrushSize; offsetY <= halfBrushSize; offsetY++) {
                    for (let offsetX = -halfBrushSize; offsetX <= halfBrushSize; offsetX++) {
                        this.paintAt(adjustedX + offsetX, adjustedY + offsetY);
                    }
                }
            } else if (this.brushShape === 'circle') {
                // Circle brush logic
                const radius = this.brushSize / 2;
                const radiusSquared = radius * radius;
                const minX = Math.ceil(adjustedX - radius);
                const maxX = Math.floor(adjustedX + radius);
                const minY = Math.ceil(adjustedY - radius);
                const maxY = Math.floor(adjustedY + radius);

                for (let paintY = minY; paintY <= maxY; paintY++) {
                    for (let paintX = minX; paintX <= maxX; paintX++) {
                        // Calculate distance from the center of the circle to this point
                        const dx = paintX + 0.5 - adjustedX; // Add 0.5 to target the center of pixels
                        const dy = paintY + 0.5 - adjustedY; // Add 0.5 to target the center of pixels
                        if (dx * dx + dy * dy <= radiusSquared) {
                            this.paintAt(paintX, paintY);
                        }
                    }
                }
            } else {
                console.error('Unknown brush shape:', this.brushShape);
            }
        }

        paintAt(x, y) {
            // Ensure the coordinates are within the canvas bounds
            if (x >= 0 && x < this.canvasWidth && y >= 0 && y < this.canvasHeight) {
                this.pixelMatrix[y][x] = this.color;
            }
        }

        setBrushShape(shape) {
            if (['square', 'circle'].includes(shape)) {
                this.brushShape = shape;
            } else {
                console.error('Invalid brush shape:', shape);
            }
        }

        setEraser() {
            this.setColor("transparent");
        }

        getSprite() {
            return new Sprite(this.pixelMatrix, this.x, this.y, this.z);
        }

        rotateColor() {
            if( this.color != "transparent" ) {
                if( this.colorArrayIndex < this.colorArray.length-1 ) {
                    this.colorArrayIndex++;
                }
                else {
                    this.colorArrayIndex = 0;
                }
            }
            
            this.setColor(this.colorArray[this.colorArrayIndex]);
        }

        rotateSize() {
            if( this.brushSize < 20 ) {
                this.brushSize += 2;
            }
            else {
                this.brushSize = 2;
            }
        }

        incrementSize() {
            if( this.brushSize < 20 ) {
                this.brushSize += 2;
            }
        }

        decrementSize() {
            if( this.brushSize > 2 ) {
                this.brushSize -= 2;
            }
        }

        rotateBrushShape() {
            if( this.brushShape == "circle" ) {
                this.brushShape = "square";
            }
            else {
                this.brushShape = "circle";
            }
        }

        setColor(color) {
            console.log("set color called: ", color)
            this.color = color;
            console.log(this.color)
        }

        clearCanvas() {
            this.pixelMatrix = this.pixelMatrix.map(row => row.fill('transparent'));
        }

        getIntermediatePoints(x0, y0, x1, y1) {
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
            return points;
        }

        drawLine(x0, y0, x1, y1) {
            const points = this.getIntermediatePoints(x0, y0, x1, y1);
            points.forEach(point => {
                this.paintPixel(point.x, point.y);
            });
        }
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

    export class Button extends Object {
        constructor(objectName, x, y, actionOnClick, z = 0) {
            super(objectName, x, y, z, actionOnClick);
            this.action = actionOnClick || (() => {});
            this.updateState("default");
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

    export class objectGrid extends GeneratedObject {
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
            this.generateObjectGrid();
        }

        getSprite() {
            let spritesOut = [];
            if(this.children.length > 0) {
                this.getChildSprites().forEach((sprite) => {
                    // console.log("Child sprite: ", sprite)
                    if (Array.isArray(sprite)) {
                        spritesOut.push(...sprite);
                    //if not an array, push sprite
                    } else {
                        spritesOut.push(sprite);
                    }
                });
            }
            return spritesOut;
        }

        onScrollUp() {
            if (this.scrollDirection === "horizontal") {
                this.scrollOffsetX += this.scrollSpeed;
            } else { // Assuming horizontal scrolling
                this.scrollOffsetY += this.scrollSpeed;
            }
            this.generateObjectGrid(); // Re-generate grid to reflect new positions
        }

        onScrollDown() {
            if (this.scrollDirection === "horizontal") {
                this.scrollOffsetX -= this.scrollSpeed;
            } else { // Assuming horizontal scrolling
                this.scrollOffsetY -= this.scrollSpeed;
            }
            this.generateObjectGrid(); // Re-generate grid to reflect new positions
        }

        generateObjectGrid() {
            let currentX = this.scrollOffsetX;
            let currentY = this.scrollOffsetY;
            const spriteWidth = this.children[0].getWidth();
            const spriteHeight = this.children[0].getHeight();
            console.log("CURRENTX: ", currentX, "CURRENTY: ", currentY);

            for (let row = 0; row < this.rows; row++) {
                for (let column = 0; column < this.columns; column++) {
                    let index = row * this.columns + column;
                    if (index >= this.children.length) break;

                    let objectX = currentX + (column * (spriteWidth + this.columnSpacing));
                    let objectY = currentY + (row * (spriteHeight + this.rowSpacing));
                    this.children[index].setCoordinate(objectX, objectY, this.z);
                }
            }
        }
    }

    export class toolTip extends GeneratedObject {
        constructor(borderColor, backgroundColor, roundness, padding, textRenderer){
            const emptyMatrix = generateEmptyMatrix(1, 1);
            super([emptyMatrix], { default: [0] }, 10, 90, 20);
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
            return new Sprite(this.currentSprite, this.x, this.y, this.z);
        }
    }

    export class buttonList extends objectGrid {
        constructor(buttonTexts, buttonFunctions, buttonConstructor, buttonWidth, buttonHeight, spacing, x, y, z, orientation = "vertical", scroll = false, scrollSpeed = 0, visibleX = 0, visibleY = 0) {
            let buttons = [];
            for(let i = 0; i < buttonTexts.length; i++){
                let button = new buttonConstructor(buttonTexts[i], 0, 0, buttonFunctions[i], buttonWidth, buttonHeight);
                button.setCoordinate(x, y, z);
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

    export class Menu extends GeneratedObject {
        constructor(x, y, z, width, height, borderColor, backgroundColor, roundness){
            const backgroundMatrix = generateStatusBarSprite(width, height, borderColor, backgroundColor, '#000000', 0, roundness);
            super([backgroundMatrix], { default: [0] }, x, y, z);
            this.width = width;
            this.height = height;
        }
    }

    // export function generateButtonClass( width, height, bgColor, borderColor, bgColorHovered, borderColorHovered, textRenderer, 
    //     topShadow = null, bottomShadow = null, topShadowHover = null, bottomShadowHover = null, layout = 'center', offset = 0) {
    //         return class Button extends GeneratedObject {
    //             constructor(text, x, y, actionOnClick, z) {
    //                 const defaultSprite = generateButtonMatrix( width, height, bgColor, borderColor, textRenderer(text), topShadow, bottomShadow, layout, offset);
                    // const hoverSprite = generateButtonMatrix( width, height, bgColorHovered, borderColorHovered, textRenderer(text), topShadowHover, bottomShadowHover, layout, offset );

    //                 // State management: 0 for default sprite and 1 for hover sprite
    //                 super([defaultSprite, hoverSprite], { default: [0], hovered: [1] }, x, y, z, actionOnClick);
    //             }

    //             onHover() {
    //                 super.onHover(); // Call parent's hover function
    //                 this.updateState('hovered');
    //             }

    //             onStopHover() {
    //                 super.onStopHover(); // Call parent's stop hover function
    //                 this.updateState('default');
    //             }
    //         };
    //     }

    export class ColorButton extends GeneratedObject {
        constructor(color, x, y, z, actionOnClick, width, height){
            const defaultSprite = generateRectangleMatrix(width, height, color);
            const hoverSprite = generateRectangleMatrix(width, height, color);
            super([defaultSprite, hoverSprite], { default: [0], hovered: [1] }, x, y, z, actionOnClick);
            this.color = color;
            this.width = width;
            this.height = height;
            console.log("color button created")
        }
    }
    
    //    export function generateButtonClass( width, height, bgColor, borderColor, bgColorHovered, borderColorHovered, textRenderer, 
    //topShadow = null, bottomShadow = null, topShadowHover = null, bottomShadowHover = null, layout = 'center', offset = 0) {
    export class ColorMenu extends Menu {
        constructor(x, y, z, width, height, borderColor, backgroundColor, roundness, colorSize, colorSpacing, columns, rows, colorArray, colorFunction){
            super(x, y, z, width, height, borderColor, backgroundColor, roundness);
            this.colorSize = colorSize;
            this.colorArray = colorArray;
            this.colorFunction = colorFunction;
            this.colorSpacing = colorSpacing;
            this.columns = columns;
            this.rows = rows;
            this.buttons = [];
            this.children = [];
            this.generateColorButtons();
            this.generateColorGrid();
            console.log("ColorMenu created")
        }
        generateColorButtons(){
            for(let i = 0; i < this.colorArray.length; i++){
                let color = this.colorArray[i]; // Store the current color in a variable to avoid issues with closures in loops
                let button = new ColorButton(color, 0, 0, 0, () => {
                    console.log("Color button clicked: ", color);
                    this.colorFunction(color);
                }, this.colorSize, this.colorSize);
                // button.setCoordinate(this.x, this.y, this.z);
                this.buttons.push(button);
            }
        }
        //constructor(columns, columnSpacing, rows, rowSpacing, x, y, z, objects, visibleX = 0, visibleY = 0, scrollDirection = "vertical", scrollSpeed = 5) {
        generateColorGrid(){
            let colorGrid = new objectGrid(this.columns, this.colorSpacing, this.rows, this.colorSpacing, this.x, this.y, 10, this.buttons, 0, 0, "horizontal", 0);
            this.children.push(colorGrid);
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
    }

</script>
