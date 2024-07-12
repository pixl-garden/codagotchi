<script context="module">
    import { Background, GeneratedObject, Menu, ObjectGrid, ButtonList, Button } from "./Object.svelte";
    import { Sprite } from "./SpriteComponent.svelte";
    import { generateEmptyMatrix, generateColorButtonMatrix, overlayMatrix, setMatrix } from "./MatrixFunctions.svelte";
    import { multiLineTextRenderer } from "./Object.svelte";
    import { Item } from "./Inventory.svelte";
    import * as Colors from './colors.js';   
    import * as pako from 'pako';

    //TODO: remove postcardX/YOffset 
    export class postcardRenderer extends GeneratedObject {
        constructor(x, y, z, width, height, postcardWidth, postcardHeight, textRenderer, textInputReference, colorArray, stampArray, textRendererArray, postcardObject = null){
            const emptyMatrix = generateEmptyMatrix(width, height);
            super([emptyMatrix], { default: [0] }, x, y, z);
            this.postcardWidth = postcardWidth;
            this.postcardHeight = postcardHeight;
            this.width = width;
            this.height = height;
            this.textRenderer = textRenderer;
            this.postcardXOffset = x + (width - this.postcardWidth) / 2;
            this.postcardYOffset = y + (height - this.postcardHeight) / 2;
            this.postcardFront = new Background("postcardFront", this.postcardXOffset, this.postcardYOffset, z, () => {});
            this.postcardBack = new Background("postcardBack", this.postcardXOffset, this.postcardYOffset, z, () => {});
            this.frontDrawableCanvas = postcardObject === null ? new DrawableCanvas(this.postcardXOffset - x, this.postcardYOffset - y, 10, this.postcardWidth, this.postcardHeight, this.postcardXOffset, this.postcardYOffset) // might need to change z
                                                          : new RenderedCanvas(x, y, z, this.postcardWidth, this.postcardHeight, postcardObject.matrix)
            this.backDrawableCanvas = new postcardBackCanvas(this.postcardXOffset - x, this.postcardYOffset - y, 10, this.postcardWidth, this.postcardHeight, this.postcardXOffset, this.postcardYOffset, this.textRenderer, textInputReference); 
            this.currentCanvas = this.frontDrawableCanvas;
            this.children.push(this.currentCanvas);
            this.stateQueue = [];
            this.isStateCompleted = false;
            this.renderChildren = false;
            this.progressTracker = 0;
            this.state = "front";
            this.stampItem;
            this.colorArray = colorArray;
            this.stampArray = stampArray;
            this.textRendererArray = textRendererArray;
            // if(postcardObject != null){
            //     this.backDrawableCanvas.setUserText(postcardObject.text);

            // }
        }
        setTextRenderer(textRenderer){
            this.textRenderer = textRenderer;
            this.backDrawableCanvas.multiLineTextRenderer.textRenderer = textRenderer;
        }

        setTextActive(bool) {
            this.backDrawableCanvas.setTextActive(bool);
        }
        setStamp(stampItem) {
            this.stampItem = stampItem;
            this.backDrawableCanvas.setStamp(stampItem);
        }
        flipPostcard(){
            if(this.state == "front"){
                this.state = "flipToBack";
            }
            else if (this.state == "back"){
                this.state = "flipToFront";
            }
        }
        setColor(color){
            this.frontDrawableCanvas.setColor(color);
            this.backDrawableCanvas.setColor(color);
        }
        nextFrame(){
            if(this.state == "flipToBack"){
                this.progressTracker += 0.05;
                //once rotation is halfway, switch the canvas 
                if(this.progressTracker >= .5){
                    this.currentCanvas = this.backDrawableCanvas;
                    this.children.pop();
                    this.children.push(this.currentCanvas); //pop and repush to update the object instance
                }
                //once rotation is complete, switch the state
                if(this.progressTracker >= 1){
                    this.state = "back";
                    this.progressTracker = 1;
                }
            }
            else if(this.state == "flipToFront"){
                this.progressTracker -= 0.05;
                //once rotation is halfway, switch the canvas
                if(this.progressTracker <= .5){
                    this.currentCanvas = this.frontDrawableCanvas;
                    this.children.pop();
                    this.children.push(this.currentCanvas); //pop and repush to update the object instance
                }
                //once rotation is complete, switch the state
                if(this.progressTracker <= 0){
                    this.state = "front";
                    this.progressTracker = 0;
                }
            }
            else if(this.state == "back"){
                this.backDrawableCanvas.nextFrame();
            }
        }

        getSprite(){
            // postcard rendering (blank postcard)
            const renderedPostcard = new Sprite(
                this.progressTracker < .5 ? 
                // when progress is less than .5, render the front of the postcard
                this.applyPerspectiveDistortion(this.postcardFront.getSprite().matrix, this.progressTracker) :
                // when progress is greater than .5, render the back of the postcard with progress (rotation) inversed
                this.applyPerspectiveDistortion(this.postcardBack.getSprite().matrix, 1 - this.progressTracker),
                this.x, this.y, this.z
            )
            // pixel canvas rendering (user drawing)
            const renderedDrawableCanvas = new Sprite(
                this.progressTracker < .5 ?
                // when progress is less than .5, render with normal progress value (rotation)
                this.applyPerspectiveDistortion(this.currentCanvas.externalRender(), this.progressTracker) :
                // when progress is greater than .5, render with progress (rotation) inversed
                this.applyPerspectiveDistortion(this.currentCanvas.externalRender(), 1 - this.progressTracker),
                this.x, this.y, this.z);
            return [renderedPostcard, renderedDrawableCanvas];
        }

        // Used to render the postcard squished to smaller width to give illusion of rotation
        applyPerspectiveDistortion(pixels, progress) {
            let newPixels = generateEmptyMatrix(this.width, this.height);
            let inputHeight = pixels.length;
            let inputWidth = pixels[0].length;
            let startingY = Math.floor((this.height - inputHeight) / 2);

            // Full PI rotation over progress to simulate 180-degree flip
            let rotation = Math.PI * progress;
            // Horizontal scale reflecting the visible width of the card
            let xScale = Math.cos(rotation); 

            // Center the horizontally scaled image
            let cardLength = Math.floor(inputWidth * Math.abs(xScale));
            let currStartingX = (this.width - cardLength) / 2;

            for (let y = 0; y < this.height; y++) {
                if(y >= startingY && y < startingY + inputHeight){
                    let inputY = Math.floor(y - startingY);
                    for (let x = 0; x < this.width; x++) {
                        if (x >= currStartingX && x < currStartingX + cardLength) {
                            let origX;
                            if (xScale > 0) {
                                origX = Math.floor((x - currStartingX) / xScale);
                            } else {
                                origX = inputWidth - 1 - Math.floor((x - currStartingX) / -xScale);
                            }
                            if (origX >= 0 && origX < inputWidth) {
                                newPixels[y][x] = pixels[inputY][origX];
                            }
                        }
                    }
                }
            }
            return newPixels;
        }

        exportPostcard(userId) {
            // Retrieve the current stamp index and position to send with the postcard
            let currStampIndex = this.stampItem === null ? 0 : this.stampArray.indexOf(this.stampItem.itemName);
            let currStampPos = this.backDrawableCanvas.stampPosition === null ? 0 : this.backDrawableCanvas.stampPosition;
            let textRendererIndex = this.textRendererArray.indexOf(this.textRenderer);
            let textColorIndex = this.colorArray.indexOf(this.backDrawableCanvas.multiLineTextRenderer.color);
            let postcard = new postCard(this.frontDrawableCanvas.pixelMatrix, this.backDrawableCanvas.userText, textColorIndex, textRendererIndex, currStampIndex, currStampPos);
            let postcardJSON = postcard.constructSendablePostcard(this.colorArray);
            tsvscode.postMessage({ type: 'sendPostcard', recipientUsername: userId, postcardJSON: postcardJSON });
        }
    }

    export class postcardBackCanvas extends GeneratedObject {
        constructor(x, y, z, width, height, offsetX, offsetY, textRenderer, textInputReference) {
            const emptyMatrix = generateEmptyMatrix(width, height);
            super([emptyMatrix], { default: [0] }, x, y, z);
            this.emptyLeftMatrix = generateEmptyMatrix(82, 80);
            this.emptyRightMatrix = generateEmptyMatrix(40, 80);
            this.pixelMatrix = emptyMatrix;
            this.width = width;
            this.height = height;
            this.offsetX = offsetX == null ? x : offsetX;
            this.offsetY = offsetY == null ? y : offsetY;
            this.stampItem = null;
            this.stampPosition = null;
            this.lastStampIndex = null;
            this.userText = "";
            this.multiLineTextRenderer = new multiLineTextRenderer(x + 3, y + 4, z, 78, height, 9, textRenderer, 4, 0);
            this.textInput = textInputReference !== null ? new textInputReference((text) => this.setUserText(text), textRenderer.charMappingString) : null;
        }

        nextFrame(){
            this.multiLineTextRenderer.alternateCursor();
            this.setUserText(this.userText);
        }

        setTextActive(bool) {
            this.multiLineTextRenderer.setTextActive(bool);
        }

        setStamp(stampItem) {
            this.stampPosition = stampItem.states["default"][Math.floor(Math.random() * (stampItem.states["default"].length - 1)) + 1];  
            if(this.stampItem === stampItem) {
                while(this.lastStampIndex === this.stampPosition) {
                    this.stampPosition = stampItem.states["default"][Math.floor(Math.random() * (stampItem.states["default"].length - 1)) + 1];
                }
                this.lastStampIndex = this.stampPosition;
            }          
            
            this.stampItem = stampItem;
            this.clearStamp();
            this.pixelMatrix = overlayMatrix(this.pixelMatrix, this.stampItem.sprites[this.stampPosition], 0, 0, 87, 4);
        }

        clearStamp() {
            this.pixelMatrix = setMatrix(this.pixelMatrix, this.emptyRightMatrix, 0, 0, 80, 0);
        }

        clearText() {
            this.pixelMatrix = setMatrix(this.pixelMatrix, this.emptyLeftMatrix, 0, 0, 0, 0);
        }

        getSprite() {
            return new Sprite(this.pixelMatrix, this.x, this.y, this.z);
        }

        externalRender() {
            return this.pixelMatrix;
        }

        setUserText(text) {
            this.userText = text;
            this.multiLineTextRenderer.setText(text);
            this.clearText();
            this.pixelMatrix = overlayMatrix(this.pixelMatrix, this.multiLineTextRenderer.externalRender(), 0, 0, 
                this.multiLineTextRenderer.x, this.multiLineTextRenderer.y);
        }

        setColor(color) {
            this.multiLineTextRenderer.setColor(color);
        }

        clearCanvas() {
            this.clearStamp();
            this.textInput.clearAll();
        }
    }

    // RenderedCanvas is used to render a canvas that has already been drawn on (received postcard)
        // Replaces DrawableCanvas in the postcardRenderer when a postcardObject is passed in
    export class RenderedCanvas extends GeneratedObject {
        constructor(x, y, z, width, height, pixelMatrix) {
            super(pixelMatrix, { default: [0] }, x, y, z);
            this.canvasWidth = width;
            this.canvasHeight = height;
            this.pixelMatrix = pixelMatrix;
        }

        getSprite() {
            return new Sprite(this.pixelMatrix, this.x, this.y, this.z);
        }

        externalRender() {
            return this.pixelMatrix;
        }
    }
    

    export class DrawableCanvas extends GeneratedObject {
        constructor(x, y, z, width, height, offsetX = null, offsetY = null) {
            const emptyMatrix = generateEmptyMatrix(width, height);
            super([emptyMatrix], { default: [0] }, x, y, z, (gridX, gridY) => {
                this.savedFutureCanvas = [];
                this.paintPixel(gridX, gridY);
            });
            this.canvasWidth = width;
            this.canvasHeight = height;
            this.pixelMatrix = emptyMatrix;
            this.color = Colors.black;
            this.pencilColor = Colors.black;
            this.lastX = null;
            this.lastY = null;
            this.offsetX = offsetX == null ? x : offsetX;
            this.offsetY = offsetY == null ? y : offsetY;
            this.brushSize = 6;
            this.brushShape = "circle";
            this.savedPastCanvas = [];
            this.savedFutureCanvas = [];
            this.isPaintBucket = false;
        }
        setBrushSize(size) {
            this.brushSize = size;
        }

        recursiveFill(x, y, targetColor, replacementColor) {
            if (targetColor === replacementColor) {
                return; // Avoid unnecessary work if the colors are the same
            }

            let queue = [];
            let visited = new Set(); // Set to track visited pixels
            queue.push({x, y});
            visited.add(`${x},${y}`);

            while (queue.length > 0) {
                let {x, y} = queue.shift(); // Dequeue

                // Check bounds
                if (x < 0 || x >= this.canvasWidth || y < 0 || y >= this.canvasHeight) {
                    continue;
                }

                // Check if the current pixel is of the target color
                if (this.pixelMatrix[y][x] !== targetColor) {
                    continue;
                }

                // Color the pixel
                this.pixelMatrix[y][x] = replacementColor;

                // Enqueue all adjacent pixels that have not been visited or modified
                [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].forEach(([nx, ny]) => {
                    if (!visited.has(`${nx},${ny}`) && this.pixelMatrix[ny] && this.pixelMatrix[ny][nx] === targetColor) {
                        queue.push({x: nx, y: ny});
                        visited.add(`${nx},${ny}`);
                    }
                });
            }
        }


        paintPixel(x, y) {
            // Adjust x and y based on the canvas offset
            const adjustedX = x - this.offsetX;
            const adjustedY = y - this.offsetY;
            if(this.isPaintBucket) {
                let targetColor = this.pixelMatrix[adjustedY][adjustedX];
                this.recursiveFill(adjustedX, adjustedY, targetColor, this.color);

            } else {
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
                    if(radius == 0){
                        this.paintAt(adjustedX, adjustedY);
                        return;
                    }

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
            this.isPaintBucket = false;
        }

        toggleFill(){
            this.isPaintBucket = !this.isPaintBucket;
        }

        getSprite() {
            return new Sprite(this.pixelMatrix, this.x, this.y, this.z);
        }

        //used to render the pixel canvas through another object (postcardRenderer)
        externalRender(){
            return this.pixelMatrix;
        }

        incrementSize() {
            if( this.brushSize < 18 ) {
                this.brushSize += 2;
            }
        }

        decrementSize() {
            if( this.brushSize >= 2 ) {
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
            this.color = color;
            if( this.color != 'transparent') {
                this.pencilColor = color;

            }
        }

        setToPencilColor() {
            this.color = this.pencilColor;
            this.isPaintBucket = false;
        }

        clearCanvas() {
            if(this.pixelMatrix.some(row => row.some(pixel => pixel !== 'transparent'))) {
                this.saveCurrentCanvas();
                this.pixelMatrix = this.pixelMatrix.map(row => row.fill('transparent'));
            }
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

        saveCurrentCanvas() {
            let deepCopy = this.pixelMatrix.map(row => row.slice());
            this.savedPastCanvas.push(deepCopy);
        }

        retrievePastCanvas() {
            if (this.savedPastCanvas.length > 0) {
                this.saveFutureCanvas();
                let lastCanvas = this.savedPastCanvas.pop();
                this.pixelMatrix = lastCanvas;
            }
        }

        saveFutureCanvas() {
            let deepCopy = this.pixelMatrix.map(row => row.slice());
            this.savedFutureCanvas.push(deepCopy);
        }

        retrieveFutureCanvas() {
            if (this.savedFutureCanvas.length > 0) {
                this.saveCurrentCanvas();
                let lastCanvas = this.savedFutureCanvas.pop();
                this.pixelMatrix = lastCanvas;
            }
        }
    }

    export class ColorButton extends GeneratedObject {
        constructor(color, x, y, z, actionOnClick, width, height){
            const defaultSprite = generateColorButtonMatrix(width, height, color);
            super([defaultSprite, defaultSprite], { default: [0], hovered: [1] }, x, y, z, actionOnClick);
            this.color = color;
            this.width = width;
            this.height = height;
        }
    }
    
    export class ColorMenu extends Menu {
        constructor(x, y, z, width, height, colorSize, colorSpacing, columns, rows, colorArray, colorFunction, 
                bgColor, innerBorderColor, outerBorderColor, innerRoundness, outerRoundness, innerBorderThickness = 3 , outerBorderThickness = 1){
            super(x, y, z, width, height, bgColor, innerBorderColor, outerBorderColor, innerRoundness, 
                outerRoundness, innerBorderThickness , outerBorderThickness);
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
        }
        generateColorButtons(){
            for(let i = 0; i < this.colorArray.length; i++){
                let color = this.colorArray[i]; // Store the current color in a variable to avoid issues with closures in loops
                let button = new ColorButton(color, 0, 0, 0, () => {
                    this.colorFunction(color);
                }, this.colorSize, this.colorSize);
                // button.setCoordinate(this.x, this.y, this.z);
                this.buttons.push(button);
            }
        }
        generateColorGrid(){
            let colorGrid = new ObjectGrid(this.columns, this.colorSpacing, this.rows, this.colorSpacing, 7, 7, this.z, this.buttons);
            this.children.push(colorGrid);
        }
    }

    export class postCard {
        constructor(matrix, text, textColorIndex, textRendererIndex, stampIndex, stampPos) {
            this.matrix = matrix;
            this.text = text;
            this.textColorIndex = textColorIndex;
            this.textRendererIndex = textRendererIndex;
            this.stampIndex = stampIndex;
            this.stampPos = stampPos
            this.canvasString = "";

        }
        // color array is passed in separately to allow for different color palletes
        constructSendablePostcard(colorArray) {
            // convert canvas on front of postcard to base 64
            this.canvasString = imageToBase64(this.matrix, colorArray);

            // create sendable object with properties of current postcard
            let postcardJSON = {
                frontCanvasString: this.canvasString,
                textString: this.text,
                textRendererIndex: this.textRendererIndex,
                textColorIndex: this.textColorIndex,
                stampIndex: this.stampIndex,
                stampPos: this.stampPos
            }
            return postcardJSON;
        }
    }

    // Construct a postcard object from a JSON object
    function constructReceivedPostcard(postcardJSON, colorArray) {
        let exportedPostcard = new postCard(
            base64ToImage(postcardJSON.frontCanvasString, colorArray, 120, 80),
            postcardJSON.textString, postcardJSON.textColorIndex,
            postcardJSON.textRendererIndex, postcardJSON.stampIndex, colorArray);
        return exportedPostcard;
    }

    // Convert a 2D pixel matrix to a compressed Base64 string
    function imageToBase64(pixelMatrix, palette) {
        // Map image data to indices
        let indices = pixelMatrix.flatMap(row => row.map(pixel => palette.indexOf(pixel)));

        // Calculate required byte array size
        let byteArray = new Uint8Array(Math.ceil(indices.length * 6 / 8));
        let byteIndex = 0;
        let bitBuffer = 0;
        let bitCount = 0;

        // Fill the byte array with 6-bit indices
        indices.forEach(index => {
            bitBuffer = (bitBuffer << 6) | index;
            bitCount += 6;

            while (bitCount >= 8) {
                byteArray[byteIndex++] = (bitBuffer >> (bitCount - 8)) & 0xFF;
                bitCount -= 8;
            }
        });

        if (bitCount > 0) {
            byteArray[byteIndex] = (bitBuffer << (8 - bitCount)) & 0xFF;
        }

        // Compress the byte array using pako
        let compressedArray = pako.deflate(byteArray);

        // Encode compressed binary data to Base64
        let binaryString = String.fromCharCode.apply(null, compressedArray);
        let base64String = btoa(binaryString);

        return base64String;
    }

    // Convert a compressed Base64 string to a 2D pixel matrix
    function base64ToImage(base64String, palette, width, height) {
        // Decode Base64 string to compressed binary data
        let binaryString = atob(base64String);
        let compressedArray = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            compressedArray[i] = binaryString.charCodeAt(i);
        }

        // Decompress the binary data using pako
        let byteArray = pako.inflate(compressedArray);

        // Convert binary data to indices
        let bitBuffer = 0;
        let bitCount = 0;
        let indices = [];
        for (let byte of byteArray) {
            bitBuffer = (bitBuffer << 8) | byte;
            bitCount += 8;

            while (bitCount >= 6) {
                indices.push((bitBuffer >> (bitCount - 6)) & 0x3F);
                bitCount -= 6;
            }
        }

        // Map indices to colors
        let pixels = indices.map(index => palette[index]);

        // Reconstruct the 2D pixel matrix
        let imageData2D = [];
        for (let i = 0; i < height; i++) {
            imageData2D.push(pixels.slice(i * width, i * width + width));
        }

        return imageData2D;
    }

    // Handles displaying user's inbox and postcard rendering when inbox entries are clicked
    export class postcardInboxManager extends GeneratedObject {
        constructor(x, y, z, gameRef, buttonConstructor, colorArray, textRendererArray, stampArray){
            super(generateEmptyMatrix(1, 1), null, x, y, z)
            this.gameRef = gameRef;
            this.buttonConstructor = buttonConstructor;
            this.children = [];
            this.colorArray = colorArray;
            this.textRendererArray = textRendererArray;
            this.stampArray = stampArray;
            this.postcardButtonList = null;
            this.pageLimit = 5;
            this.refreshPostcards();
            this.receivedPostcardDisplay = new receivedPostcardDisplay(0, 0, 0, this.colorArray, this.textRendererArray, this.stampArray, () => {
                this.children = [this.postcardButtonList]; //function to close the postcard display
            });
        }

        // Function to handle postcard flipping animation
        nextFrame(){
            if(this.receivedPostcardDisplay.postcardRendering != null){
                this.receivedPostcardDisplay.nextFrame();
            }
        }

        // Called on room entry to refresh the inbox from the game reference and construct inbox button array
        refreshPostcards(){
            const postcards = this.gameRef.refreshInbox()["postcards"];
            const postcardIds = Object.keys(postcards);
            const postcardButtonListParams = postcardIds.map(
                // First parameter is the from username of sender to display on button
                postcardId => [postcards[postcardId].fromUser, 
                // Second parameter is button click function which displays the postcard
                () => {
                    let exportedPostcard = constructReceivedPostcard(this.gameRef.inbox["postcards"][postcardId].postcard, this.colorArray);
                    this.receivedPostcardDisplay.setPostcard(exportedPostcard);
                    this.children.push(this.receivedPostcardDisplay);
            }]);
            
            this.postcardButtonList = new ButtonList(0, 0, 0, "vertical", -1, this.buttonConstructor, this.pageLimit, ...postcardButtonListParams)
            this.children = [this.postcardButtonList];
        }
    }

    export class receivedPostcardDisplay extends GeneratedObject {
        constructor(x, y, z, colorArray, textRendererArray, stampArray, closeFunction) {
            super(generateEmptyMatrix(1, 1), null, x, y, z);
            this.colorArray = colorArray;
            this.textRendererArray = textRendererArray;
            this.stampArray = stampArray;
            this.saveButton = new Button(37, 108, 9, 'saveButton', () => {
                closeFunction();
                this.blackFadeIn.opacity = 0; 

            });
            this.discardButton = new Button(74, 108, 9, 'discardButton',  () => {
                closeFunction();
                this.blackFadeIn.opacity = 0; 

            });
            this.flipButton = new Button(55, 108, 9, 'flipButton', () => {
                this.postcardRendering.flipPostcard();
            });
            this.postcardRendering = null;
            this.blackFadeIn = new Background('blackground', 0, 0, 8, () => {} );
            this.blackFadeIn.opacity = 0; 
            // this.children.push(this.blackFadeIn);
        }

        nextFrame(){
            if(this.postcardRendering != null) {
                this.postcardRendering.nextFrame();
            }
            this.blackFadeIn.nextFrame();
        }

        // Recreate postcard rendering from postcard object and modify using
            // front drawing, set stamp, stamp position, text, text color, and text renderer
        setPostcard(postcardObject) { 
            this.blackFadeIn.opacity = 0; 
            this.postcardRendering = new postcardRenderer(4, 16, 10, 120, 80, 120, 80, this.textRendererArray[postcardObject.textRendererIndex], null, this.colorArray, this.stampArray, this.textRendererArray, postcardObject);
            this.postcardRendering.backDrawableCanvas.setStamp(new Item(this.stampArray[postcardObject.stampIndex]));
            this.postcardRendering.setTextRenderer(this.textRendererArray[postcardObject.textRendererIndex]);
            this.postcardRendering.backDrawableCanvas.setColor(this.colorArray[postcardObject.textColorIndex]);
            this.postcardRendering.backDrawableCanvas.setUserText(postcardObject.text);
            this.children = [this.saveButton, this.discardButton, this.flipButton, this.postcardRendering, this.blackFadeIn]; // Adds postcard to children
            this.blackFadeIn.startOpacityTransition(0.75, 0.025, 1);
        }
    }
</script>