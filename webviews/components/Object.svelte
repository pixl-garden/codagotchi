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
    import { TreeItemCheckboxState } from 'vscode';
    

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
            this.children = [];
            this.hoverWithChildren = false;
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

        initializeButtons() {
            this.buttonParams.forEach(param => {
                const { xOffset, yOffset, zOffset, buttonObject, actionOnClick } = param;

                // Calculate absolute positions by adding offsets to the object's position
                const buttonX = this.x + xOffset;
                const buttonY = this.y + yOffset;
                const buttonZ = this.z + zOffset;

                buttonObject.action = actionOnClick
                buttonObject.setCoordinate(buttonX, buttonY, buttonZ);
                this.children.push(buttonObject);
            });
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
                if( this.colorArrayIndex < this.colorArray.length ) {
                    this.colorArrayIndex++;
                }
                else {
                    this.colorArrayIndex = 0;
                }
            }
            
            this.setColor(this.colorArray[this.colorArrayIndex]);
        }

        rotateSize() {
            if( this.brushSize < 10 ) {
                this.brushSize++;
            }
            else {
                this.brushSize = 0;
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
            this.color = color;
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

    export class objectGrid extends GeneratedObject{
        //Set columns or rows to 0 to make it infinite
        //Objects is a list of objects
        //Set visibleX or visibleY to 0 to make it infinite
        //Scroll direction can be "horizontal" or "vertical"
        constructor(columns, columnSpacing, rows, rowSpacing, x, y, z, objects, visibleX = 0, visibleY = 0, scrollDirection = null, scrollSpeed = 0){
            this.columns = columns > 0 ? columns : objects.length;
            this.columnSpacing = columnSpacing;
            this.rows = rows > 0 ? rows : Math.ceil(objects.length / this.columns);
            this.rowSpacing = rowSpacing;
            this.x = x;
            this.y = y;
            this.z = z;
            this.children = objects;
            this.objectGrid = [];
            this.generateObjectGrid();
        }

        getSprite() {
            return null;
        }

        generateObjectGrid() {
            let currentX = this.x;
            let currentY = this.y;
            
            for (let row = 0; row < this.rows; row++) {
                for (let column = 0; column < this.columns; column++) {
                    let index = row * this.columns + column;
                    // Check if the index exceeds the number of children, useful if rows*columns > number of objects
                    if (index >= this.children.length) break;

                    // Calculate position for each object
                    let objectX = currentX + (column * (this.spriteWidth + this.columnSpacing));
                    let objectY = currentY + (row * (this.spriteHeight + this.rowSpacing));

                    // Assuming each child has a method to set its position
                    this.children[index].setCoordinate(objectX, objectY, this.z);

                }
            }
        }
    }

    function instantiateObjects(ObjectClass, params) {
        let objectsArray = [];

        params.forEach(param => {
            // Destructure the object parameters and child configurations from param
            const { objectParams, childConfigs } = param;
            
            // Instantiate the object with its parameters
            let object = new ObjectClass(...objectParams);
            
            // Optionally handle child objects if specified
            if (childConfigs && childConfigs.length > 0) {
                object.children = childConfigs.map(childConfig => {
                    // Destructure child class and its params
                    const { ChildClass, childParams } = childConfig;

                    // Create the child object, potentially passing additional parameters or functions
                    return new ChildClass(...childParams);
                });

                // If the object has a method to initialize or register these children, call it here
                if (object.initializeChildren) {
                    object.initializeChildren();
                }
            }

            // Add the instantiated object (with its children) to the array
            objectsArray.push(object);
        });

        return objectsArray;
    }

    function instantiateFromConfig(config, dynamicData) {
        const objectsArray = [];
        
        config.objects.forEach(objConfig => {
            if (objConfig.type === "StaticObject") {
                const ObjectClass = getClassByName(objConfig.class); // Utility function to map class name string to class
                objectsArray.push(new ObjectClass(...objConfig.params));
            } else if (objConfig.type === "DynamicList") {
                const dynamicList = dynamicData[objConfig.iterateOver];
                const ObjectClass = getClassByName(objConfig.class);
                
                dynamicList.forEach((item, index) => {
                    const params = objConfig.params.map(param => 
                    // If the param is a string and contains "Action", resolve it to the corresponding action function
                        param.replace(/\{(\w+)\}/g, (_, key) => item[key] || index)
                    );

                    const object = new ObjectClass(...params);
                    
                    objConfig.children.forEach(childConfig => {
                        const ChildClass = getClassByName(childConfig.class);
                        const childParams = resolveParams(childConfig.params, item, index);
                        const child = new ChildClass(...childParams);
                        object.addChild(child);
                    });

                    objectsArray.push(object);
                });
            }
        });

        return objectsArray;
    }

    function getClassByName(className) {
        // Map class names to actual classes
        const classMap = { Button, Pet, Background, NavigationButton, PixelCanvas };
        return classMap[className];
    }

    function resolveParams(params, item, index) {
        return params.map(param => 
            typeof param === "string" && param.includes("Action") ? actions[param] : param.replace(/\{(\w+)\}/g, (_, key) => item[key] || index)
        );
    }

</script>
