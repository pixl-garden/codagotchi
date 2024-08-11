<script context="module">
    import itemConfig from './itemConfig.json'
    import { game, Room, shouldFocus, inputValue, textInput } from './Game.svelte';
    import { TextRenderer } from './TextRenderer.svelte';
    import * as Colors from './colors.js';
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import { generateTextButtonClass, generateIconButtonClass, generateStatusBarClass, generateTextInputBar, generateInvisibleButtonClass, generateFontTextButtonClass } from './ObjectGenerators.svelte';
    import { generateColorButtonMatrix, generateEmptyMatrix } from './MatrixFunctions.svelte';
    import bedroomConfig from './config/bedroomConfig.json';
    import { inventoryGrid, BedroomItem } from './Inventory.svelte';
    import { Pet, Button, Background, ConfigObject, GeneratedObject, toolTip, textButtonList, activeTextRenderer, ItemSlot, ObjectGrid, Menu, ButtonList} from './Object.svelte';
    import * as pako from 'pako';

    const standardCharMap = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`;

    let basic = new TextRenderer('charmap1.png', 7, 9, Colors.white, Colors.black, Colors.black, 1, standardCharMap);
    const smallButton = generateTextButtonClass(15, 15, basic, ...Colors.secondaryMenuColorParams);

    export class BedroomManager extends GeneratedObject{
        constructor(bedroomJSON) {
            super([generateEmptyMatrix(128, 128)], {default: [0]}, 0, 0, 0);
            this.bedroomConfig = bedroomConfig;
            this.wallpaperIndex = bedroomJSON["wallpaperIndex"] || 0; //0-255
            this.floorIndex = bedroomJSON["floorIndex"] || 0;         //0-255

            //numOfItems 0-31
            this.wallItemIndices = bedroomJSON["wallItemIndices"] || []; //0-511
            this.wallItemXCoords = bedroomJSON["wallItemXCoords"] || []; // 0-127
            this.wallItemYCoords = bedroomJSON["wallItemYCoords"] || []; // 0-127
            this.wallItemFlipped = bedroomJSON["wallItemFlipped"] || []; // 0-1

            //numOfItems 0-31
            this.furnitureIndices = bedroomJSON["furnitureIndices"] || []; //0-511
            this.furnitureXCoords = bedroomJSON["furnitureXCoords"] || []; // 0-127
            this.furnitureLocations = bedroomJSON["furnitureLocations"] || []; // 0-1
            this.furnitureFlipped = bedroomJSON["furnitureFlipped"] || []; // 0-1

            //numOfItems 0-31
            this.stackableItemIndices = bedroomJSON["stackableItemIndices"] || []; //0-511
            this.stackableItemXCoords = bedroomJSON["stackableItemXCoords"] || []; // 0-127
            this.stackableItemLocations = bedroomJSON["stackableItemLocations"] || []; // 0-1
            this.stackableItemFlipped = bedroomJSON["stackableItemFlipped"] || []; // 0-1

            this.wallpaperItem = new BedroomItem("wallpaper", this.wallpaperIndex, 0, 0, 0);
            this.floorPos = bedroomConfig['floor']['yCoord'];
            this.floorItem = new BedroomItem("floor", this.floorIndex, 0, this.floorPos, 0);
            this.furnitureItems = [];
            this.wallItemItems = [];
            this.stackableItemItems = []; // on construction of stackable item, check if on top of furniture and add to furnitures count
            this.exportObjects();
        }

        isValidObjectType(objectType) {
            const validTypes = ['wallpaper', 'floor', 'wallItem', 'furniture', 'stackableItem'];
            return validTypes.includes(objectType);
        }

        serializeBedroom() {
            
            return "hi";
        }

        // Used to replace the wallpaper or floor
        replaceObject(item) {
            if (!this.isValidObjectType(item.furnitureType) || !['wallpaper', 'floor'].includes(item.furnitureType)) {
                throw new Error('replaceObject: objectType must be wallpaper or floor');
            }
            let newItem = new BedroomItem(item.furnitureType, item.typeIndex, 0, 0);
            if(item.furnitureType === 'wallpaper') {
                newItem.setCoordinate(0, 0);
            } else if (item.furnitureType === 'floor') {
                newItem.setCoordinate(0, 86);
            }
            this[`${item.furnitureType}Item`] = newItem;
            this.exportObjects();
        }

        // Used to add a wallItem or furniture
        addObject(item) {
            if (!this.isValidObjectType(item.furnitureType) || ['wallpaper', 'floor'].includes(item.furnitureType)) {
                return false;
            }
            if (!this.checkCollision(item.furnitureType, item.typeIndex, item.x, item.y, item.position)) {
                return false;
            }
            if(item.position === "far") {
                item.z = bedroomConfig["farFurniture"].zCoord;
            } else if(item.position === "near") {
                item.z = bedroomConfig["nearFurniture"].zCoord;
            } else {
                item.z = bedroomConfig[item.furnitureType].zCoord;
            }
            this[`${item.furnitureType}Items`].push(item);
            this.exportObjects();
            return true;
        }

        // Used to remove a wallItem,
        removeObject(selectedItem) {
            if (!this.isValidObjectType(selectedItem.furnitureType) || ['wallpaper', 'floor'].includes(selectedItem.furnitureType)) {
                throw new Error('removeObject: invalid objectType');
            }
            this[`${selectedItem.furnitureType}Items`] = this[`${selectedItem.furnitureType}Items`].filter((item) => item !== selectedItem);
            this.exportObjects();
        }

        isCollisionWithWalls(xCoord, yCoord, objectConfig, furnitureType, position) {
            let bounds;
            if (position === "far" || position === "near") {
                bounds = this.bedroomConfig[position + "Furniture"];
            } else {
                bounds = this.bedroomConfig[furnitureType];
            }
            const leftWallCollision = xCoord < bounds.xLeftBound;
            const rightWallCollision = xCoord + objectConfig.xTrim > bounds.xRightBound;
            const floorCollision = furnitureType === "wallItem" && yCoord < bounds.yTopBound;
            const ceilingCollision = furnitureType === "wallItem" && yCoord + objectConfig.yTrim > bounds.yBottomBound;

            return leftWallCollision || rightWallCollision || floorCollision || ceilingCollision;
        }

        isCollisionWithOtherItems(xCoord, yCoord, objectConfig, furnitureType, position) {
            // get array of items to check collision with
            let itemArray = this[`${furnitureType}Items`];
            if(furnitureType === "furniture" || furnitureType === "stackableItem") {
                // itemArray = [...this.furnitureItems, ...this.stackableItemItems]
                itemArray = itemArray.filter(item => item.position === position);
            }

            return !itemArray.some(item => {
                // get config for item
                const configItem = this.bedroomConfig[furnitureType][item.typeIndex];
                // check left and right bounds for all items
                const rightBoundCollision = xCoord < item.x + configItem.xTrim;
                const leftBoundCollision = xCoord + objectConfig.xTrim > item.x;
                // check top and bottom bounds for wall items only
                const verticalCollision = furnitureType === "wallItem" ?
                    ((yCoord < item.y + configItem.yTrim) && (yCoord + objectConfig.yTrim > item.y)) : true;
                return rightBoundCollision && leftBoundCollision && verticalCollision;
            });
        }

        //maybe change to item reference to be sexier (returns true if there is no collision)
        checkCollision(furnitureType, objectIndex, xCoord, yCoord, position = null) {
            if (!this.isValidObjectType(furnitureType) || ['wallpaper', 'floor'].includes(furnitureType)) {
                throw new Error('checkCollision: invalid objectType');
            }
            let objectConfig = this.bedroomConfig[furnitureType][objectIndex];
            if (!objectConfig.xTrim) {
                throw new Error('checkCollision: object must have xTrim property');
            }
            
            // Check and handle collision for stackable items.
            if (furnitureType === "stackableItem") {
                let furnitureItems = this.furnitureItems.filter(item => item.position === position);

                // Iterate through each furniture item at the current position.
                for (const item of furnitureItems) {
                    if (item.stackYCoord !== undefined) {
                        // Check if the item is colliding with the edges of a stackable item.
                            //If item is within the edges (stacking), collide with other stackable items
                        const collidesWithLeftEdge = xCoord < item.x + item.stackLeftBound && xCoord + objectConfig.xTrim > item.x + item.stackLeftBound;
                        const collidesWithRightEdge = xCoord + objectConfig.xTrim > item.x + item.stackRightBound && xCoord < item.x + item.stackRightBound;
                        if (collidesWithLeftEdge || collidesWithRightEdge) {
                            furnitureType = "furniture";
                        }
                    } else {
                        // Check if the item is within the bounds of a non-stackable item.
                        const isColliding = (xCoord <= item.x + item.spriteWidth && xCoord + objectConfig.xTrim >= item.x) ||
                                                        (xCoord + objectConfig.xTrim >= item.x && xCoord <= item.x + item.spriteWidth);
                        if (isColliding) {
                            furnitureType = "furniture";
                        }
                    }
                }
            }

            if(this.isCollisionWithWalls(xCoord, yCoord, objectConfig, furnitureType, position)){
                return false;
            }

            return this.isCollisionWithOtherItems(xCoord, yCoord, objectConfig, furnitureType, position);
        }

        getObjectAt(xCoord, yCoord) {
            const furnitureTypes = ['furniture', 'wallItem', 'stackableItem'];
            for (let furnitureType of furnitureTypes) {
                const itemArray = this[`${furnitureType}Items`];
                for (let i = 0; i < itemArray.length; i++) {
                    let currentItem = itemArray[i];
                    console.log(currentItem.x, currentItem.y, currentItem.spriteWidth, currentItem.spriteHeight, xCoord, yCoord);
                    if (currentItem.x <= xCoord && currentItem.x + currentItem.spriteWidth >= xCoord &&
                        currentItem.y <= yCoord && currentItem.y + currentItem.spriteHeight >= yCoord) {
                        return currentItem;
                    }
                }
            }
            return null;
        }

        // retrieve y coord for stackable items using modified mouse coordinates
        calculateStackableY(stackableItem, xCoord, yCoord) {
            let position = stackableItem.position;
            let furniture = this.furnitureItems.filter(item => (item.position === position && item.stackYCoord !== undefined));
            let stackableItemY = 128;
            furniture.forEach(item => {
                if(xCoord + stackableItem.spriteWidth > item.x + item.stackLeftBound && xCoord < item.x + item.stackRightBound ){
                    stackableItemY = (item.y + item.stackYCoord - stackableItem.spriteHeight) < stackableItemY ? item.y + item.stackYCoord - stackableItem.spriteHeight : stackableItemY;
                }

            });
            return stackableItemY === 128 ? yCoord : stackableItemY;
        }

        exportObjects() {
            this.children = [this.wallpaperItem, this.floorItem, ...this.furnitureItems, ...this.wallItemItems, ...this.stackableItemItems];
            console.log(this.children);
        }
    }

    // handles all functionality involved with editing one's bedroom
        //bedroom instance
        //inventory instance (open with button)
            // 2x2 grid of furniture items (more tiles for smaller items?)
            // tabs for different item types
            // wallpaper/floor selection using premade thumbnails
            // maybe flipping functionality?
        //mouse selection area
            // item selection/deselection (maybe white border highlight?)
            // stash button (shows on selection)
            // item movement and border collision handling (transparent red?)
            // 

    //furniture rendering grid

    // add stacking to items
    // protruding items trimmed to be smaller (allow items to exist closer and behind protusion)?
    // add range for item tracking in placement mode
    //

    function createItemSlotXL() {
        let output = new ConfigObject("itemSlots48x", 0, 0, 0);
        output.hoverWithChildren = true;
        output.passMouseCoords = true;
        return output;
    }
    
    export class BedroomEditor extends GeneratedObject {
        constructor(gameRef, bedroomManager) {
            const emptySpriteMatrix = generateEmptyMatrix(128, 128);
            super([emptySpriteMatrix], { default: [0] }, 0, 0, 10);
            this.bedroomManager = bedroomManager;
            this.initializeComponents();
            this.menuEnabled = false;
        }

        initializeComponents() {
            this.menu = new Background('bedroomInventory', 0, 0, 10);
            this.editMode = false;
            this.placementMode = false;
            this.passMouseCoords = true;
            this.clickedItem = null;
            this.currentTab = "furniture"
            this.furnitureArr = this.addFurnitureItems("furniture", 25);
            this.wallpaperArr = this.addFurnitureItems("wallpaper", 3);
            this.floorArr = this.addFurnitureItems("floor", 3);
            this.wallItemArr = this.addFurnitureItems("wallItem", 3);
            this.stackableItemArr = this.addFurnitureItems("stackableItem", 20);
            
            this.slotClickAction = item => {
                this.enterPlacementMode(item);
                this.toggleInventory();
            };
            this.inventoryGrid = new inventoryGrid(2, 4, 2, 3, 14, 21, 11, [], createItemSlotXL, null, null, 0, 0, 1, this.slotClickAction);
            this.initializeButtons();
            this.menu.children = [this.inventoryGrid, this.inventoryTabList, this.bedroomXButton];
            this.setTab(this.currentTab);
        }

        initializeButtons() {
            this.inventoryTabSprites = spriteReaderFromStore(16, 16, "bedroomTabs.png", 16, 16);
            this.inventoryTabButton = generateIconButtonClass(18, 18, 'transparent', 'transparent', 'transparent', 'transparent');
            this.inventoryTabList = new ButtonList(15, 2, 1, "horizontal", 2, this.inventoryTabButton, null,
                [this.inventoryTabSprites[0], this.inventoryTabSprites[4], ()=>{
                    this.setTab("wallpaper");
                }],
                [this.inventoryTabSprites[1], this.inventoryTabSprites[1], ()=>{
                    this.setTab("floor");
                }],
                [this.inventoryTabSprites[2], this.inventoryTabSprites[2], ()=>{
                    this.setTab("furniture");
                }],
                [this.inventoryTabSprites[3], this.inventoryTabSprites[3], ()=>{
                    this.setTab("wallItem");
                }],
                [this.inventoryTabSprites[2], this.inventoryTabSprites[2], ()=>{
                    this.setTab("stackableItem");
                }]
            );
            this.bedroomXButton = new Button(1, 0, 7, "bedroomXButton", this.toggleInventory.bind(this));
            const editorButton = generateIconButtonClass(22, 22, 'transparent', 'transparent', 'transparent', 'transparent');
            const editorButtonSprites = spriteReaderFromStore(22, 22, "bedroomIcons.png");
            this.inventoryButton = new editorButton(85, 106, 7, editorButtonSprites[0], editorButtonSprites[1], this.toggleInventory.bind(this));
            this.editButton = new editorButton(106, 107, 7, editorButtonSprites[2], editorButtonSprites[3], () => {
                this.toggleEditMode();
                if(this.editMode){
                    this.editButton.states = {default: [1], hovered: [1]}
                } else{
                    this.editButton.states = {default: [0], hovered: [1]}
                }
            });
            this.removeButton = new editorButton(106, 107, 7, editorButtonSprites[4], editorButtonSprites[5], this.exitPlacementMode.bind(this));
            this.flipButton = new editorButton(62, 107, 7, editorButtonSprites[6], editorButtonSprites[7], this.flipItem.bind(this));
            this.children.push(this.inventoryButton, this.editButton);
        }

        setTab(tab){
            this.currentTab = tab;
            this.inventoryGrid.currentPage = 0;
            this.currentTabArray = this[`${tab}Arr`] || [];
            this.inventoryGrid.updateItemSlots(this.currentTabArray);
        }

        addFurnitureItems(type, numItems) {
            let items = [];
            for(let i = 0; i < numItems; i++) {
                items.push(new BedroomItem(type, String(i), 0, 0))
            }
            return items;
        }

        flipItem() {
            if(this.clickedItem) {
                this.clickedItem.flip();
            }
        }

        toggleInventory() {
            this.menuEnabled = !this.menuEnabled;
            if (this.menuEnabled) {
                this.inventoryGrid.updateItemSlots(this.currentTabArray);
                this.addChild(this.menu);
                this.exitPlacementMode();
            } else {
                this.removeChild(this.menu);
                this.whileHover() // update mouse coords immediately
            }
        }

        enterPlacementMode(item) {
            if(this.clickedItem !== null) {
                this.bedroomManager.removeObject(this.clickedItem); //if in manager, remove it
            }
            if (['floor', 'wallpaper'].includes(item.furnitureType)) {
                this.bedroomManager.replaceObject(item);
            }
            else {
                this.clickedItem = new BedroomItem(item.furnitureType, item.typeIndex, this.mouseX, this.mouseY, item.z);
                this.clickedItem.isFlipped = item.isFlipped;
                this.placementMode = true;
                this.addChild(this.removeButton);
                this.addChild(this.flipButton);
                this.removeChild(this.editButton);
                this.addChild(this.clickedItem);
            }
        }

        exitPlacementMode() {
            this.placementMode = false;
            this.removeChild(this.clickedItem);
            this.removeChild(this.removeButton);
            this.removeChild(this.flipButton);
            this.addChild(this.editButton);
            this.clickedItem = null;
        }

        toggleEditMode() {
            this.editMode = !this.editMode;
        }

        // calculates coords to center item on mouse
        calculateAdjustedCoords() {
              let xCoord = this.mouseX - Math.floor(this.clickedItem.spriteWidth / 2);
            let yCoord = this.mouseY + (bedroomConfig[this.clickedItem.furnitureType].spriteHeight - this.clickedItem.spriteHeight);
            let zCoord = bedroomConfig[this.clickedItem.furnitureType].zCoord - this.z + 1;
            return { xCoord, yCoord, zCoord };
        }

        setFurnitureCoordinates() {
            let { xCoord, yCoord, zCoord } = this.calculateAdjustedCoords();
            if (this.clickedItem.furnitureType === "wallItem") {
                yCoord = this.mouseY - Math.floor(this.clickedItem.spriteHeight / 2);
            } else if (this.clickedItem.furnitureType === "furniture" || this.clickedItem.furnitureType === "stackableItem") { // extra y/z adjustments for near/far furniture
                this.clickedItem.position = this.mouseY > 94 ? "near" : "far";
                let positionConfig = bedroomConfig[`${this.clickedItem.position}Furniture`];
                yCoord = positionConfig.yCoord + positionConfig.spriteHeight - this.clickedItem.spriteHeight;
                zCoord = positionConfig.zCoord - this.z + 1;
            }
            if(this.clickedItem.furnitureType === "stackableItem") {
                yCoord = this.bedroomManager.calculateStackableY(this.clickedItem, xCoord, yCoord);
            }
            this.clickedItem.setCoordinate(xCoord, yCoord, zCoord);
        }

        placementModeLoop() {
            if (this.placementMode && this.clickedItem) {
                this.setFurnitureCoordinates();
                if (!this.bedroomManager.checkCollision(this.clickedItem.furnitureType, this.clickedItem.typeIndex, this.clickedItem.x, this.clickedItem.y, this.clickedItem.position)) {
                    this.clickedItem.opacity = 0.7;
                } else {
                    this.clickedItem.opacity = 1;
                }
            }
        }

        whileHover() {
            this.placementModeLoop();
        }

        clickAction(mouseX, mouseY) {
            // selecting item object
            if (this.editMode && !this.placementMode) {
                this.clickedItem = this.bedroomManager.getObjectAt(mouseX, mouseY);
                if(this.clickedItem) {
                    this.enterPlacementMode(this.clickedItem);
                }
            // placing item 
            } else if (this.placementMode && this.clickedItem) {
                if(this.bedroomManager.addObject(this.clickedItem)) {
                    this.exitPlacementMode()
                }
            }
        }
    }

    function encodeFurnitureData(data) {
        const buffer = [];
        
        // Helper function to add bits to buffer
        function addBits(value, bits) {
            let currentByte = buffer.length ? buffer.pop() : 0;
            let bitCount = 8 - (currentBit % 8);
            currentBit += bits;

            while (bits > 0) {
                if (bits < bitCount) {
                    currentByte = (currentByte << bits) | value;
                    bitCount -= bits;
                    bits = 0;
                } else {
                    currentByte = (currentByte << bitCount) | (value >> (bits - bitCount));
                    value &= (1 << (bits - bitCount)) - 1;
                    bits -= bitCount;
                    buffer.push(currentByte);
                    currentByte = 0;
                    bitCount = 8;
                }
            }

            buffer.push(currentByte);
        }
        
        // Start encoding
        let currentBit = 0;
        addBits(data.wallpaperIndex, 8);
        addBits(data.floorIndex, 8);
        
        // Encode items with additional 'variation' parameter
        function encodeItems(items, indexBits, coordBits, posBits, flipBits, variationBits) {
            addBits(items.length, 5);  // Number of items, max 31, needs 5 bits
            items.forEach(item => {
                addBits(item.index, indexBits);
                addBits(item.x, coordBits);
                if ('y' in item) {
                    addBits(item.y, coordBits); // For wall items with y coordinate
                } else {
                    addBits(item.position, posBits); // For items with position instead of y
                }
                addBits(item.flipped, flipBits);
                addBits(item.variation, variationBits); // New variation field
            });
        }
        
        // Encode various items with variation
        encodeItems(data.wallItems, 9, 7, 0, 1, 16); // No position bits for wallItems
        encodeItems(data.furnitureItems, 9, 7, 1, 1, 16);
        encodeItems(data.stackableItems, 9, 7, 1, 1, 16);

        // Convert buffer to Uint8Array
        let byteArray = new Uint8Array(buffer);
        
        // Compress the byte array using pako
        let compressedArray = pako.deflate(byteArray);
        
        // Encode compressed binary data to Base64
        let binaryString = String.fromCharCode.apply(null, compressedArray);
        let base64String = btoa(binaryString);
        
        return base64String;
    }


    function decodeFurnitureData(base64String) {
    // Decode Base64 to binary array
    let binaryString = atob(base64String);
    let compressedArray = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        compressedArray[i] = binaryString.charCodeAt(i);
    }

    // Decompress the binary data
    let byteArray = pako.inflate(compressedArray);

    let buffer = byteArray;
    let currentBit = 0;

    // Helper function to read bits from buffer
    function readBits(bits) {
        let value = 0;
        let bitCount = 0;
        while (bitCount < bits) {
            let byteIndex = Math.floor(currentBit / 8);
            let availableBits = 8 - (currentBit % 8);
            let readBits = Math.min(bits - bitCount, availableBits);
            let mask = (1 << readBits) - 1;
            let shift = availableBits - readBits;
            value = (value << readBits) | ((buffer[byteIndex] >> shift) & mask);
            currentBit += readBits;
            bitCount += readBits;
        }
        return value;
    }

    let data = {
        wallpaperIndex: readBits(8),
        floorIndex: readBits(8),
        wallItems: [],
        furnitureItems: [],
        stackableItems: []
    };

    // Decode items including 'variation' parameter
    function decodeItems(count, indexBits, coordBits, posBits, flipBits, variationBits) {
        let items = [];
        for (let i = 0; i < count; i++) {
            let item = {
                index: readBits(indexBits),
                x: readBits(coordBits),
                variation: readBits(variationBits),
                flipped: readBits(flipBits)
            };
            if (posBits) {
                item.position = readBits(posBits);
            } else {
                item.y = readBits(coordBits);
            }
            items.push(item);
        }
        return items;
    }

    // Decode all item types
    let wallItemCount = readBits(5);
    data.wallItems = decodeItems(wallItemCount, 9, 7, 0, 1, 16);

    let furnitureItemCount = readBits(5);
    data.furnitureItems = decodeItems(furnitureItemCount, 9, 7, 1, 1, 16);

    let stackableItemCount = readBits(5);
    data.stackableItems = decodeItems(stackableItemCount, 9, 7, 1, 1, 16);

    return data;
}


    // Example usage
    let furnitureData = {
        "wallpaperIndex": 123,
        "floorIndex": 200,
        "wallItems": [
            {"index": 45, "x": 12, "y": 34, "flipped": 1},
            {"index": 120, "x": 56, "y": 78, "flipped": 0},
            {"index": 300, "x": 90, "y": 12, "flipped": 1},
            {"index": 511, "x": 34, "y": 56, "flipped": 0},
            {"index": 250, "x": 78, "y": 90, "flipped": 1}
        ],
        "furnitureItems": [
            {"index": 400, "x": 64, "position": 0, "flipped": 1},
            {"index": 350, "x": 32, "position": 1, "flipped": 0},
            {"index": 410, "x": 96, "position": 0, "flipped": 1},
            {"index": 475, "x": 128, "position": 1, "flipped": 0},
            {"index": 300, "x": 127, "position": 0, "flipped": 1}
        ],
        "stackableItems": [
            {"index": 200, "x": 50, "position": 1, "flipped": 0},
            {"index": 215, "x": 75, "position": 0, "flipped": 1},
            {"index": 230, "x": 100, "position": 1, "flipped": 0},
            {"index": 245, "x": 125, "position": 0, "flipped": 1},
            {"index": 260, "x": 25, "position": 1, "flipped": 0}
        ]
    }

    let encodedData = encodeFurnitureData(furnitureData);
    console.log("ENCODED DATA", encodedData);

    let decodedData = decodeFurnitureData(encodedData);
    console.log("DECODED DATA", decodedData);

</script>