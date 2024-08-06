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


    const standardCharMap = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`;

    let basic = new TextRenderer('charmap1.png', 7, 9, Colors.white, Colors.black, Colors.black, 1, standardCharMap);
    const smallButton = generateTextButtonClass(15, 15, basic, ...Colors.secondaryMenuColorParams);

    export class BedroomManager extends GeneratedObject{
        constructor(bedroomJSON) {
            super([generateEmptyMatrix(128, 128)], {default: [0]}, 0, 0, 0);
            this.bedroomConfig = bedroomConfig;
            this.floorPos = bedroomConfig['floor']['yCoord'];
            this.wallpaperIndex = bedroomJSON["wallpaperIndex"] || 0;
            this.floorIndex = bedroomJSON["floorIndex"] || 0;
            this.wallItemIndices = bedroomJSON["wallItemIndices"] || [];
            this.wallItemXCoords = bedroomJSON["wallItemXCoords"] || [];

            this.furnitureIndices = bedroomJSON["furnitureIndices"] || [];
            this.furnitureXCoords = bedroomJSON["furnitureXCoords"] || [];
            this.furnitureLocations = bedroomJSON["furnitureLocations"] || [];

            this.wallpaperItem = new BedroomItem("wallpaper", this.wallpaperIndex, 0, 0, 0);
            this.floorItem = new BedroomItem("floor", this.floorIndex, 0, this.floorPos, 0);
            this.furnitureItems = [];
            this.wallItemItems = [];
            this.exportObjects();
        }

        isValidObjectType(objectType) {
            const validTypes = ['wallpaper', 'floor', 'wallItem', 'furniture'];
            return validTypes.includes(objectType);
        }

        serializeBedroom() {
            return {
                "wallpaperIndex": this.wallpaperIndex,
                "floorIndex": this.floorIndex,
                "wallItemIndices": this.wallItemIndices,
                "wallItemXCoords": this.wallItemXCoords,
                "furnitureIndices": this.furnitureIndices,
                "furnitureXCoords": this.furnitureXCoords,
            };
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

        //maybe change to item reference to be sexier
        checkCollision(furnitureType, objectIndex, xCoord, yCoord, position = null) {
            if (!this.isValidObjectType(furnitureType) || ['wallpaper', 'floor'].includes(furnitureType)) {
                throw new Error('checkCollision: invalid objectType');
            }

            const objectConfig = this.bedroomConfig[furnitureType][objectIndex];
            if (!objectConfig.xTrim) {
                throw new Error('checkCollision: object must have xTrim property');
            }
            let itemArray = this[`${furnitureType}Items`];
            if(furnitureType === "furniture") {
                itemArray = itemArray.filter(item => item.position === position);
            }
            const indices = itemArray.map(item => item.typeIndex);
            const xCoords = itemArray.map(item => item.x);
            const yCoords = itemArray.map(item => item.y);
            let objectType;
            if( position === "far" ) {
                objectType = this.bedroomConfig["farFurniture"];
            } else if( position === "near") {
                objectType = this.bedroomConfig["nearFurniture"];
            }else{
                objectType = this.bedroomConfig[furnitureType];
            }
            const leftWallCollision = xCoord < objectType.xLeftBound;
            const rightWallCollision = xCoord + objectConfig.xTrim > objectType.xRightBound;
            const floorCollision = furnitureType === "wallItem" ? yCoord < objectType.yTopBound : false;
            const ceilingCollision = furnitureType === "wallItem" ? yCoord + objectConfig.yTrim > objectType.yBottomBound : false;
            
             // If the object collides with any wall (or floor/ceiling if applicable)
            if (leftWallCollision || rightWallCollision || floorCollision || ceilingCollision) {
                return false;
            } 

            // Check collision with other items
            return !indices.some((itemIndex, i) => {
                const item = this.bedroomConfig[furnitureType][itemIndex];
                
                const rightBoundCollision = xCoord < xCoords[i] + item.xTrim; // right side of item
                const leftBoundCollision = xCoord + objectConfig.xTrim > xCoords[i]; // left side of item
                const bottomBoundCollision = yCoord < yCoords[i] + item.yTrim; // bottom side of item
                const topBoundCollision = yCoord + objectConfig.yTrim > yCoords[i]; // top side of item

                return rightBoundCollision && leftBoundCollision && topBoundCollision && bottomBoundCollision;
            });
        }

        getObjectAt(xCoord, yCoord) {
            const furnitureTypes = ['furniture', 'wallItem'];
            for (let furnitureType of furnitureTypes) {
                const itemArray = this[`${furnitureType}Items`];
                for (let i = 0; i < itemArray.length; i++) {
                    let currentItem = itemArray[i];
                    // console.log(currentItem.x, currentItem.y, currentItem.spriteWidth, currentItem.spriteHeight, xCoord, yCoord);
                    if (currentItem.x <= xCoord && currentItem.x + currentItem.spriteWidth >= xCoord &&
                        currentItem.y <= yCoord && currentItem.y + currentItem.spriteHeight >= yCoord) {
                        return currentItem;
                    }
                }
            }
            return null;
        }

        exportObjects() {
            this.children = [this.wallpaperItem, this.floorItem, ...this.furnitureItems, ...this.wallItemItems];
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
            this.wallpaperArr = this.addFurnitureItems("wallpaper", 1);
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
                }]
            );
            this.bedroomXButton = new Button(1, 0, 7, "bedroomXButton", this.toggleInventory.bind(this));
            const editorButton = generateIconButtonClass(22, 22, 'transparent', 'transparent', 'transparent', 'transparent');
            const editorButtonSprites = spriteReaderFromStore(22, 22, "bedroomIcons.png");
            this.inventoryButton = new editorButton(85, 106, 7, editorButtonSprites[0], editorButtonSprites[1], this.toggleInventory.bind(this));
            this.editButton = new editorButton(106, 107, 7, editorButtonSprites[2], editorButtonSprites[3], this.toggleEditMode());
            this.removeButton = new editorButton(106, 107, 7, editorButtonSprites[0], editorButtonSprites[1], () => {
                this.exitPlacementMode();
            });
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
                this.placementMode = true;
                this.addChild(this.removeButton);
                this.removeChild(this.editButton);
                this.addChild(this.clickedItem);
            }
        }

        exitPlacementMode() {
            this.placementMode = false;
            this.removeChild(this.clickedItem);
            this.removeChild(this.removeButton);
            this.addChild(this.editButton);
            this.clickedItem = null;
        }

        toggleEditMode() {
            this.editMode = !this.editMode;
        }

        placementModeLoop() {
            if (this.placementMode && this.clickedItem) {
                let xCoord = this.mouseX - Math.floor(this.clickedItem.spriteWidth / 2);
                let yCoord = this.clickedItem.y + (bedroomConfig[this.clickedItem.furnitureType].spriteHeight - this.clickedItem.spriteHeight);
                let zCoord = bedroomConfig[this.clickedItem.furnitureType].zCoord - this.z + 1;
                
                if( this.clickedItem.furnitureType === "wallItem" ) {
                    yCoord = this.mouseY - Math.floor(this.clickedItem.spriteHeight / 2);
                    this.clickedItem.setCoordinate(xCoord, yCoord, zCoord);
                } else if( this.clickedItem.furnitureType === "furniture" ) {
                    if(this.mouseY > 94){ // center between near and far y levls
                        this.clickedItem.position = "near";
                        yCoord = bedroomConfig["nearFurniture"].yCoord + (bedroomConfig[this.clickedItem.furnitureType].spriteHeight - this.clickedItem.spriteHeight);
                        zCoord = bedroomConfig["nearFurniture"].zCoord - this.z + 1;
                        this.clickedItem.setCoordinate(xCoord, yCoord, zCoord);
                    }else{
                        this.clickedItem.position = "far";
                        yCoord = bedroomConfig["farFurniture"].yCoord + (bedroomConfig[this.clickedItem.furnitureType].spriteHeight - this.clickedItem.spriteHeight);
                        zCoord = bedroomConfig["farFurniture"].zCoord - this.z + 1;
                        this.clickedItem.setCoordinate(xCoord, yCoord, zCoord);
                    }
                }
                else {
                    this.clickedItem.setCoordinate(xCoord, yCoord, zCoord);
                }
                if(!this.bedroomManager.checkCollision(this.clickedItem.furnitureType, this.clickedItem.typeIndex, xCoord, yCoord, this.clickedItem.position)) {
                    this.clickedItem.opacity = .7;
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

        nextFrame() {
            // Perform frame-specific updates here
        }
    }

</script>