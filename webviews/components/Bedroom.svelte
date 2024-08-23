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
    import { add } from 'lodash';

    const standardCharMap = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`;

    let basic = new TextRenderer('charmap1.png', 7, 9, Colors.white, Colors.black, Colors.black, 1, standardCharMap);
    const smallButton = generateTextButtonClass(15, 15, basic, ...Colors.secondaryMenuColorParams);

    export class BedroomManager extends GeneratedObject{
        constructor() {
            super([generateEmptyMatrix(128, 128)], {default: [0]}, 0, 0, 0);
            this.bedroomConfig = bedroomConfig;
            this.wallpaper = new BedroomItem("wallpaper", 0, 0, 0, 0);
            this.floorPos = bedroomConfig['floor']['yCoord'];
            this.floor = new BedroomItem("floor", 0, 0, this.floorPos, 0);
            this.furnitureItems = [];
            this.wallItems = [];
            this.stackableItems = []; //TODO: on construction of stackable item, check if on top of furniture and add to furnitures count
            this.exportObjects();
            
        }

        constructFromSerialization(serializedData){
            this.constructItemsFromJSON(decodeFurnitureData(serializedData));
            this.exportObjects();
        }

        isValidObjectType(objectType) {
            const validTypes = ['wallpaper', 'floor', 'wallItems', 'furnitureItems', 'stackableItems'];
            return validTypes.includes(objectType);
        }

        serializeBedroom() {
            let furnitureData = this.constructBedroomJSON();
            let encodedData = encodeFurnitureData(furnitureData);
            return encodedData;
        }

        //TODO: add variation
        constructItemsFromJSON(furnitureJSON) {
            this.wallpaper = new BedroomItem("wallpaper", furnitureJSON.wallpaperIndex, 0, 0, 0);
            this.floor = new BedroomItem("floor", furnitureJSON.floorIndex, 0, this.floorPos, 0);

            // First, create all furniture items
            for (const item of furnitureJSON.furnitureItems) {
                const position = item.position === 0 ? "far" : "near";
                const yCoord = this.bedroomConfig[`${position}Furniture`].yCoord - this.bedroomConfig.furnitureItems[item.index].yTrim;
                const newItem = new BedroomItem("furnitureItems", item.index, item.x, yCoord, this.bedroomConfig[`${position}Furniture`].zCoord);
                newItem.position = position;
                newItem.isFlipped = item.flipped === 0 ? false : true;
                this.addObject(newItem);
            }

            // Then, create wall items
            for (const item of furnitureJSON.wallItems) {
                const newItem = new BedroomItem("wallItems", item.index, item.x, item.y, this.bedroomConfig.wallItems.zCoord);
                newItem.isFlipped = item.flipped === 0 ? false : true;
                this.addObject(newItem);
            }

            // Finally, create stackable items
            for (const item of furnitureJSON.stackableItems) {
                const position = item.position === 0 ? "far" : "near";
                const yCoord = this.bedroomConfig[`${position}Furniture`].yCoord - this.bedroomConfig.stackableItems[item.index].yTrim;
                const newItem = new BedroomItem("stackableItems", item.index, item.x, yCoord, this.bedroomConfig[`${position}Furniture`].zCoord);
                newItem.position = position;
                newItem.isFlipped = item.flipped === 0 ? false : true;
                
                // Calculate the correct Y coordinate
                newItem.y = this.calculateStackableY(newItem, newItem.x, newItem.y);
                
                if (!this.addObject(newItem)) {
                    console.error("Error adding stackable item to bedroom:", newItem);
                }
            }

            this.exportObjects();
        }


    //     let furnitureData = {
    //     "wallpaperIndex": 123,
    //     "floorIndex": 200,
    //     "wallItems": [
    //         {"index": 45, "x": 12, "y": 34, "flipped": 1, "variation": 2},
    //         {"index": 120, "x": 56, "y": 78, "flipped": 0, "variation": 2},
    //         {"index": 300, "x": 90, "y": 12, "flipped": 1, "variation": 2},
    //         {"index": 511, "x": 34, "y": 56, "flipped": 0, "variation": 2},
    //         {"index": 250, "x": 78, "y": 90, "flipped": 1, "variation": 2}
    //     ],
    //     "furnitureItems": [
    //         {"index": 400, "x": 64, "position": 0, "flipped": 1, "variation": 2},
    //         {"index": 350, "x": 32, "position": 1, "flipped": 0, "variation": 2},
    //         {"index": 410, "x": 96, "position": 0, "flipped": 1, "variation": 2},
    //         {"index": 475, "x": 128, "position": 1, "flipped": 0, "variation": 2},
    //         {"index": 300, "x": 127, "position": 0, "flipped": 1, "variation": 2}
    //     ],
    //     "stackableItems": [
    //         {"index": 200, "x": 50, "position": 1, "flipped": 0, "variation": 2},
    //         {"index": 215, "x": 75, "position": 0, "flipped": 1, "variation": 2},
    //         {"index": 230, "x": 100, "position": 1, "flipped": 0, "variation": 2},
    //         {"index": 245, "x": 125, "position": 0, "flipped": 1, "variation": 2},
    //         {"index": 260, "x": 25, "position": 1, "flipped": 0, "variation": 2}
    //     ]
    // }

        constructBedroomJSON() {
            let data = {
                "wallpaperIndex": this.wallpaper.typeIndex,
                "floorIndex": this.floor.typeIndex,
                "wallItems": this.wallItems.map(item => item.getJSON()),
                "furnitureItems": this.furnitureItems.map(item => item.getJSON()),
                "stackableItems": this.stackableItems.map(item => item.getJSON())
            };
            return data;
        }

        // Used to replace the wallpaper or floor
        replaceObject(item) {
            if (!this.isValidObjectType(item.furnitureType) || !['wallpaper', 'floor'].includes(item.furnitureType)) {
                throw new Error('replaceObject: objectType must be wallpaper or floor');
            }
            let newItem = new BedroomItem(item.furnitureType, item.typeIndex, 0);
            if(item.furnitureType === 'wallpaper') {
                newItem.setCoordinate(0, 0);
            } else if (item.furnitureType === 'floor') {
                newItem.setCoordinate(0, 86);
            }
            this[item.furnitureType] = newItem;
            this.exportObjects();
        }


        addObject(item) {
            if (!this.isValidObjectType(item.furnitureType) || ['wallpaper', 'floor'].includes(item.furnitureType)) {
                return false;   
            }
            if (!this.checkCollision(item)) {
                return false;
            }
            
            if (item.furnitureType === "stackableItems") {
                const stackedOn = this.findStackableFurniture(item);
                console.log('stackedOn', stackedOn);
                if (stackedOn) {
                    stackedOn.addChild(item);
                    item.parent = stackedOn;
                }
            }

            if(item.position === "far") {
                item.z = bedroomConfig["farFurniture"].zCoord;
            } else if(item.position === "near") {
                item.z = bedroomConfig["nearFurniture"].zCoord;
            } else {
                item.z = bedroomConfig[item.furnitureType].zCoord;
            }

            this[item.furnitureType].push(item);
            this.exportObjects();
            return true;
        }


        removeObject(selectedItem) {
            if (!this.isValidObjectType(selectedItem.furnitureType) || ['wallpaper', 'floor'].includes(selectedItem.furnitureType)) {
                throw new Error('removeObject: invalid objectType');
            }
            
            if (selectedItem.parent) {
                selectedItem.parent.removeChild(selectedItem);
            }
            
            this[selectedItem.furnitureType] = this[selectedItem.furnitureType].filter((item) => item !== selectedItem);
            this.exportObjects();
        }


        findStackableFurniture(stackableItem) {
            return this.furnitureItems.find(furniture => 
                furniture.position === stackableItem.position &&
                furniture.stackYCoord !== undefined &&
                stackableItem.x + stackableItem.spriteWidth > furniture.x + furniture.stackLeftBound &&
                stackableItem.x < furniture.x + furniture.stackRightBound
            );
        }

        isCollisionWithWalls(item) {
            let bounds;
            if (item.position === "far" || item.position === "near") {
                bounds = this.bedroomConfig[item.position + "Furniture"];
            } else {
                bounds = this.bedroomConfig[item.furnitureType];
            }
            const leftWallCollision = item.x < bounds.xLeftBound;
            const rightWallCollision = item.x + item.spriteWidth > bounds.xRightBound;
            const floorCollision = item.furnitureType === "wallItems" && item.y < bounds.yTopBound;
            const ceilingCollision = item.furnitureType === "wallItems" && item.y + item.spriteHeight > bounds.yBottomBound;

            return leftWallCollision || rightWallCollision || floorCollision || ceilingCollision;
        }

        isCollisionWithOtherItems(newItem, furnitureType) {
            // get array of items to check collision with
            let itemArray = this[furnitureType];
            if(furnitureType === "furnitureItems" || furnitureType === "stackableItems") {
                itemArray = itemArray.filter(item => item.position === newItem.position);
            }
            const objectConfig = this.bedroomConfig[newItem.furnitureType][newItem.typeIndex];
            return !itemArray.some(item => {
                const configItem = this.bedroomConfig[furnitureType][item.typeIndex];
                const rightBoundCollision = newItem.x < item.x + configItem.xTrim;
                const leftBoundCollision = newItem.x + objectConfig.xTrim > item.x;
                // check top and bottom bounds for wall items only
                const verticalCollision = furnitureType === "wallItems" ?
                    ((newItem.y < item.y + configItem.yTrim) && (newItem.y + objectConfig.yTrim > item.y)) : true;
                return rightBoundCollision && leftBoundCollision && verticalCollision;
            });
        }

        checkCollision(newItem) {
            let furnitureType = newItem.furnitureType;
            if (!this.isValidObjectType(furnitureType) || ['wallpaper', 'floor'].includes(furnitureType)) {
                throw new Error('checkCollision: invalid objectType');
            }
            let objectConfig = this.bedroomConfig[furnitureType][newItem.typeIndex];
            if (!objectConfig.xTrim) {
                throw new Error('checkCollision: object must have xTrim property');
            }
            
            // Check and handle collision for stackable items.
            if (furnitureType === "stackableItems") {
                let furnitureItems = this.furnitureItems.filter(item => item.position === newItem.position);

                // Iterate through each furniture item at the current position.
                for (const item of furnitureItems) {
                    if (item.stackYCoord !== undefined) {
                        // Check if the item is colliding with the edges of a stackable item.
                            //If item is within the edges (stacking), collide with other stackable items
                        const collidesWithLeftEdge = newItem.x < item.x + item.stackLeftBound && newItem.x + objectConfig.xTrim > item.x + item.stackLeftBound;
                        const collidesWithRightEdge = newItem.x + objectConfig.xTrim > item.x + item.stackRightBound && newItem.x < item.x + item.stackRightBound;
                        if (collidesWithLeftEdge || collidesWithRightEdge) {
                            furnitureType = "furnitureItems";
                        } 
                    } else {
                        // Check if the item is within the bounds of a non-stackable item.
                        const isColliding = (newItem.x <= item.x + item.spriteWidth && newItem.x + objectConfig.xTrim >= item.x) ||
                                            (newItem.x + objectConfig.xTrim >= item.x && newItem.x <= item.x + item.spriteWidth);
                        if (isColliding) {
                            furnitureType = "furnitureItems";
                        }
                    }
                }
            }

            if(this.isCollisionWithWalls(newItem)){
                return false;
            }
            return this.isCollisionWithOtherItems(newItem, furnitureType)
        }


        getObjectAt(xCoord, yCoord) {
            const furnitureTypes = ['furnitureItems', 'wallItems', 'stackableItems'];
            
            for (let furnitureType of furnitureTypes) {
                const itemArray = this[furnitureType];
                for (let i = 0; i < itemArray.length; i++) {
                    let currentItem = itemArray[i];
                    if (currentItem.x <= xCoord && currentItem.x + currentItem.spriteWidth >= xCoord &&
                        currentItem.y <= yCoord && currentItem.y + currentItem.spriteHeight >= yCoord &&
                        // If furniture item has stacked children do not return it (makes it immovable)
                        currentItem.stackedChildren.length === 0) {
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
            this.children = [
                this.wallpaper, 
                this.floor, 
                ...this.furnitureItems, 
                ...this.wallItems, 
                ...this.stackableItems
            ];
        }
    }


    
    export class BedroomEditor extends GeneratedObject {
        constructor(gameRef, bedroomManager) {
            const emptySpriteMatrix = generateEmptyMatrix(128, 128);
            super([emptySpriteMatrix], { default: [0] }, 0, 0, 10);
            this.gameRef = gameRef;
            this.bedroomManager = bedroomManager;
            this.retrieveSave();
            this.initializeComponents();
            this.menuEnabled = false;
        }

        updateSave() {
            console.log("serializing bedroom", this.bedroomManager.serializeBedroom(), decodeFurnitureData(this.bedroomManager.serializeBedroom()));
            this.gameRef.updateGlobalState({"bedroomData": this.bedroomManager.serializeBedroom()})
        }

        retrieveSave() {
            const saveData = this.gameRef.getLocalState()["bedroomData"]
            if(saveData){
                this.bedroomManager.constructFromSerialization(saveData);
            }
        }

        initializeComponents() {
            this.menu = new Background('bedroomInventory', 0, 0, 10);
            this.editMode = false;
            this.placementMode = false;
            this.passMouseCoords = true;
            this.clickedItem = null;
            this.currentTab = "furnitureItems"
            this.furnitureItemsArr = this.addFurnitureItems("furnitureItems", 25);
            this.wallpaperArr = this.addFurnitureItems("wallpaper", 3);
            this.floorArr = this.addFurnitureItems("floor", 3);
            this.wallItemsArr = this.addFurnitureItems("wallItems", 3);
            this.stackableItemsArr = this.addFurnitureItems("stackableItems", 20);
            
            this.slotClickAction = item => {
                this.enterPlacementMode(item);
                this.toggleInventory();
            };
            function createItemSlotXL() {
                let output = new ConfigObject("itemSlots48x", 0, 0, 0);
                output.hoverWithChildren = true;
                output.passMouseCoords = true;
                return output;
            }
            this.inventoryGrid = new inventoryGrid(2, 4, 2, 3, 14, 21, 11, [], createItemSlotXL, null, null, 0, 0, 1, this.slotClickAction);
            this.initializeButtons();
            this.menu.children = [this.inventoryGrid, this.inventoryTabList, this.bedroomXButton];
            this.setTab(this.currentTab);
        }

        initializeButtons() {
            this.inventoryTabSprites = spriteReaderFromStore(16, 16, "bedroomTabs.png", 16, 16);
            this.inventoryTabButton = generateIconButtonClass(18, 18, 'transparent', 'transparent', 'transparent', 'transparent');
            this.inventoryTabList = new ButtonList(15, 2, 1, "horizontal", 2, this.inventoryTabButton, null,
                [this.inventoryTabSprites[0], this.inventoryTabSprites[0], ()=>{
                    this.setTab("wallpaper");
                }],
                [this.inventoryTabSprites[1], this.inventoryTabSprites[1], ()=>{
                    this.setTab("floor");
                }],
                [this.inventoryTabSprites[2], this.inventoryTabSprites[2], ()=>{
                    this.setTab("furnitureItems");
                }],
                [this.inventoryTabSprites[3], this.inventoryTabSprites[3], ()=>{
                    this.setTab("wallItems");
                }],
                [this.inventoryTabSprites[6], this.inventoryTabSprites[6], ()=>{
                    this.setTab("stackableItems");
                }]
            );
            this.bedroomXButton = new Button(1, 0, 7, "bedroomXButton", this.toggleInventory.bind(this));
            const editorButton = generateIconButtonClass(22, 22, 'transparent', 'transparent', 'transparent', 'transparent');
            const editorButtonSprites = spriteReaderFromStore(22, 22, "bedroomIcons.png");
            this.inventoryButton = new editorButton(85, 106, 7, editorButtonSprites[0], editorButtonSprites[1], this.toggleInventory.bind(this));
            this.editButton = new editorButton(106, 107, 7, editorButtonSprites[2], editorButtonSprites[3], () => {
                this.toggleEditMode();
                if(this.editMode){
                    this.editButton.states = {default: [1], hovered: [1]} //locks button to hover sprite
                } else{
                    this.editButton.states = {default: [0], hovered: [1]}
                }
            });
            this.removeButton = new editorButton(106, 107, 7, editorButtonSprites[4], editorButtonSprites[5], this.exitPlacementMode.bind(this));
            this.flipButton = new editorButton(63, 107, 7, editorButtonSprites[6], editorButtonSprites[7], this.flipItem.bind(this));
            this.children.push(this.inventoryButton, this.editButton);
        }

        setTab(tab){
            this.currentTab = tab;
            this.inventoryGrid.currentPage = 0;
            this.currentTabArray = this[`${tab}Arr`] || [];
            this.inventoryGrid.updateItemSlots(this.currentTabArray);
        }

        //TODO: remove (used for testing)
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
            console.log("clickedItem", item)
            if(this.clickedItem !== null) {
                this.bedroomManager.removeObject(this.clickedItem); //if in manager, remove it
                this.updateSave();
            }
            if (['floor', 'wallpaper'].includes(item.furnitureType)) {
                this.bedroomManager.replaceObject(item);
                this.updateSave();
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
            this.bedroomManager.serializeBedroom();
        }

        // calculates coords to center item on mouse
        calculateAdjustedCoords() {
            let xCoord = this.mouseX - Math.floor(this.clickedItem.spriteWidth / 2);
            let yCoord = this.mouseY - this.clickedItem.spriteHeight;
            let zCoord = bedroomConfig[this.clickedItem.furnitureType].zCoord - this.z + 1;
            return { xCoord, yCoord, zCoord };
        }
        


        setFurnitureCoordinates() {
            let { xCoord, yCoord, zCoord } = this.calculateAdjustedCoords();
            if (this.clickedItem.furnitureType === "wallItems") {
                yCoord = this.mouseY - Math.floor(this.clickedItem.spriteHeight / 2);
            } else if (this.clickedItem.furnitureType === "furnitureItems" || this.clickedItem.furnitureType === "stackableItems") {
                this.clickedItem.position = this.mouseY > 94 ? "near" : "far";
                let positionConfig = bedroomConfig[`${this.clickedItem.position}Furniture`];
                yCoord = positionConfig.yCoord - this.clickedItem.spriteHeight;
                zCoord = positionConfig.zCoord - this.z + 1;
            }
            if (this.clickedItem.furnitureType === "stackableItems") {
                yCoord = this.bedroomManager.calculateStackableY(this.clickedItem, xCoord, yCoord);
            }
            this.clickedItem.setCoordinate(xCoord, yCoord, zCoord);
        }

        placementModeLoop() {
            if (this.placementMode && this.clickedItem) {
                console.log("clickedItem", this.clickedItem)
                this.setFurnitureCoordinates();
                if (!this.bedroomManager.checkCollision(this.clickedItem)) {
                    this.clickedItem.opacity = 0.65;
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
                    this.exitPlacementMode();
                    this.updateSave();
                }
            }
        }
    }

    const indexBitSize = 9;
    const coordBitSize = 7;
    const positionBitSize = 1;
    const flipBitSize = 1;
    const variationBitSize = 4;

    function encodeFurnitureData(data) {
        const buffer = [];
        let currentBit = 0;

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

        
        // Encode items with x and y coordinates
        function encodeXYItems(items, indexBits, coordBits, flipBits, variationBits) {
            addBits(items.length, 5);  // Number of items, max 31, needs 5 bits
            items.forEach(item => {
                addBits(item.index, indexBits);
                addBits(item.x, coordBits);
                addBits(item.y, coordBits);
                addBits(item.flipped, flipBits);
                addBits(item.variation, variationBits);
            });
        }

        // Encode items with x coordinate and position
        function encodeXPosItems(items, indexBits, coordBits, posBits, flipBits, variationBits) {
            addBits(items.length, 5);  // Number of items, max 31, needs 5 bits
            items.forEach(item => {
                addBits(item.index, indexBits);
                addBits(item.x, coordBits);
                addBits(item.position, posBits);
                addBits(item.flipped, flipBits);
                addBits(item.variation, variationBits);
            });
        }

        // Start encoding
        addBits(data.wallpaperIndex, 8);
        addBits(data.floorIndex, 8);
        
        encodeXYItems(data.wallItems, indexBitSize, coordBitSize, flipBitSize, variationBitSize);
        encodeXPosItems(data.furnitureItems, indexBitSize, coordBitSize, positionBitSize, flipBitSize, variationBitSize);
        encodeXPosItems(data.stackableItems, indexBitSize, coordBitSize, positionBitSize, flipBitSize, variationBitSize);

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

        // Decode items with x and y coordinates
        function decodeXYItems(count, indexBits, coordBits, flipBits, variationBits) {
            let items = [];
            for (let i = 0; i < count; i++) {
                items.push({
                    index: readBits(indexBits),
                    x: readBits(coordBits),
                    y: readBits(coordBits),
                    flipped: readBits(flipBits),
                    variation: readBits(variationBits)
                });
            }
            return items;
        }

        // Decode items with x coordinate and position
        function decodeXPosItems(count, indexBits, coordBits, posBits, flipBits, variationBits) {
            let items = [];
            for (let i = 0; i < count; i++) {
                items.push({
                    index: readBits(indexBits),
                    x: readBits(coordBits),
                    position: readBits(posBits),
                    flipped: readBits(flipBits),
                    variation: readBits(variationBits)
                });
            }
            return items;
        }

        // Decode wall items
        let wallItemCount = readBits(5);
        data.wallItems = decodeXYItems(wallItemCount, indexBitSize, coordBitSize, flipBitSize, variationBitSize);

        // Decode furniture items
        let furnitureItemCount = readBits(5);
        data.furnitureItems = decodeXPosItems(furnitureItemCount, indexBitSize, coordBitSize, positionBitSize, flipBitSize, variationBitSize);

        // Decode stackable items
        let stackableItemCount = readBits(5);
        data.stackableItems = decodeXPosItems(stackableItemCount, indexBitSize, coordBitSize, positionBitSize, flipBitSize, variationBitSize);

        return data;
    }
    
</script>