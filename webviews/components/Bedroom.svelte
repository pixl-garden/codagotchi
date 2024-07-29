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

    export class BedroomManager extends GeneratedObject{
        constructor(bedroomJSON) {
            super([generateEmptyMatrix(128, 128)], {default: [0]}, 0, 0, 0);
            this.bedroomConfig = bedroomConfig;
            this.floorPos = bedroomConfig['floor']['yCoord'];
            this.wallpaperIndex = bedroomJSON["wallpaperIndex"] || 0;
            this.floorIndex = bedroomJSON["floorIndex"] || 0;
            this.wallItemIndices = bedroomJSON["wallItemIndices"] || [];
            this.wallItemXCoords = bedroomJSON["wallItemXCoords"] || [];
            this.nearFurnitureIndices = bedroomJSON["nearFurnitureIndices"] || [];
            this.nearFurnitureXCoords = bedroomJSON["nearFurnitureXCoords"] || [];
            this.farFurnitureIndices = bedroomJSON["farFurnitureIndices"] || [];
            this.farFurnitureXCoords = bedroomJSON["farFurnitureXCoords"] || [];
            this.wallpaperItem = new BedroomItem("wallpaper", this.wallpaperIndex, 0, 0, 0);
            this.floorItem = new BedroomItem("floor", this.floorIndex, 0, this.floorPos, 0);
            this.nearFurnitureItems = [];
            this.farFurnitureItems = [];
            this.wallItemItems = [];
            this.exportObjects();
        }

        isValidObjectType(objectType) {
            const validTypes = ['wallpaper', 'floor', 'wallItem', 'nearFurniture', 'farFurniture'];
            return validTypes.includes(objectType);
        }

        // Serialization strategy?
        // 0000 0001 0002 0003 0004 0005 0006 0007 
        // 
        // 0001 1001 3
        //[type(1)][index(3)][xCoord(3)][type(2)][index(3)][xCoord(3)][type(3)][index(3)][xCoord(3)]
        // 
        serializeBedroom() {
            return {
                "wallpaperIndex": this.wallpaperIndex,
                "floorIndex": this.floorIndex,
                "wallItemIndices": this.wallItemIndices,
                "wallItemXCoords": this.wallItemXCoords,
                "nearFurnitureIndices": this.nearFurnitureIndices,
                "nearFurnitureXCoords": this.nearFurnitureXCoords,
                "farFurnitureIndices": this.farFurnitureIndices,
                "farFurnitureXCoords": this.farFurnitureXCoords
            };
        }

        // Used to replace the wallpaper or floor
        replaceObject(item) {
            if (!this.isValidObjectType(item.furnitureType) || !['wallpaper', 'floor'].includes(item.furnitureType)) {
                throw new Error('replaceObject: objectType must be wallpaper or floor');
            }
            this[`${item.furnitureType}Item`] = item;
        }

        // Used to add a wallItem, nearFurniture, or farFurniture
        addObject(item) {
            if (!this.isValidObjectType(item.furnitureType) || ['wallpaper', 'floor'].includes(item.furnitureType)) {
                throw new Error('addObject: invalid objectType');
            }
            if (!this.checkCollision(item.furnitureType, item.typeIndex, item.x)) {
                throw new Error(`addObject: Cannot place ${item.typeIndex} at xCoord ${item.x}`);
            }
            // this[`${objectType}Indices`].push(configIndex);
            // this[`${objectType}XCoords`].push(xCoord);
            this[`${item.furnitureType}Items`].push(item);
            this.exportObjects();
            console.log(this.children)
        }

        // Used to remove a wallItem, nearFurniture, or farFurniture
        removeObject(selectedItem) {
            if (!this.isValidObjectType(selectedItem.furnitureType) || ['wallpaper', 'floor'].includes(selectedItem.furnitureType)) {
                throw new Error('removeObject: invalid objectType');
            }
            
            this[`${item.furnitureType}Items`] = this[`${item.furnitureType}Items`].filter((item) => item !== selectedItem);
        }


        checkCollision(furnitureType, objectIndex, xCoord) {
            if (!this.isValidObjectType(furnitureType) || ['wallpaper', 'floor'].includes(furnitureType)) {
                throw new Error('checkCollision: invalid objectType');
            }

            const objectConfig = this.bedroomConfig[furnitureType][objectIndex];
            if (!objectConfig.xTrim) {
                throw new Error('checkCollision: object must have xTrim property');
            }
            
            const itemArray = this[`${furnitureType}Items`];
            const indices = itemArray.map(item => item.typeIndex);
            const xCoords = itemArray.map(item => item.x);

            // Check if an existing object has overlapping xCoords
            return true;
            // return !indices.some((itemIndex, i) => 
            //     xCoords[i] + this.bedroomConfig[furnitureType][itemIndex].xTrim >= xCoord &&
            //     xCoords[i] <= xCoord
            // );
        }

        getObjectAt(xCoord, yCoord) {
            ['nearFurniture', 'farFurniture', 'wallItem'].forEach(furnitureType => {
                const itemArray = this[`${furnitureType}Items`];
                for(let i = 0; i < itemArray.length; i++){
                    let currentItem = itemArray[i];
                    if(currentItem.x <= xCoord && currentItem.x + currentItem.spriteWidth >= xCoord &&
                      currentItem.y <= yCoord && currentItem.y + currentItem.spriteHeight >= yCoord) {
                        return currentItem;
                    }
                }
            });
            return null;
        }

        exportObjects() {
            this.children = [this.wallpaperItem, this.floorItem, ...this.nearFurnitureItems, ...this.farFurnitureItems, ...this.wallItemItems];
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

    function createItemSlotXL() {
        let output = new ConfigObject("itemSlots48x", 0, 0, 0);
        output.hoverWithChildren = true;
        output.passMouseCoords = true;
        return output;
    }

    export class BedroomEditor extends GeneratedObject {
        constructor(gameRef, bedroomManager) {
            const emptySpriteMatrix = generateEmptyMatrix(128, 128);
            super([emptySpriteMatrix], {default: [0]}, 0, 0, 10);
            this.menu = new Background('bedroomInventory', 0, 0, 10 );
            this.editMode = false;
            this.placementMode = false;
            this.clickedItem;
            this.passMouseCoords = true;
            this.bedroomManager = bedroomManager;
            
            this.slotClickAction = (item) => {
                this.enterPlacementMode(item);
                this.toggleInventory();
            }

            this.inventoryGrid = new inventoryGrid(2, 4, 2, 3, 14, 21, 11, [], createItemSlotXL, null, null, 1, 1, 1, this.slotClickAction);
            this.inventoryTabSprites = spriteReaderFromStore(16, 16, "bedroomTabs.png", 16, 16);
            this.inventoryTabButton = generateIconButtonClass(18, 18, 'transparent', 'transparent', 'transparent', 'transparent');
            this.inventoryTabList = new ButtonList(15, 2, 1, "horizontal", 2, this.inventoryTabButton, null,
                [this.inventoryTabSprites[0], this.inventoryTabSprites[4], ()=>{
                    console.log("tab 1")
                }],
                [this.inventoryTabSprites[1], this.inventoryTabSprites[1], ()=>{
                    console.log("tab 2")
                }],
                [this.inventoryTabSprites[2], this.inventoryTabSprites[2], ()=>{
                    console.log("tab 3")
                }],
                [this.inventoryTabSprites[3], this.inventoryTabSprites[3], ()=>{
                    console.log("tab 4")
                }]
            );
            this.bedroomXButton = new Button(2, 1, 7, "bedroomXButton", ()=>{
                this.toggleInventory();
            });
            this.menuEnabled = false;
            this.menu.children = [this.inventoryGrid, this.inventoryTabList, this.bedroomXButton];
        }
        toggleInventory(){
            if(this.menuEnabled){
                this.menuEnabled = false;
                this.removeChild(this.menu); 
            }else{
                const testCouch = new BedroomItem("farFurniture", 0, 0, 0);
                const testChair = new BedroomItem("nearFurniture", 0, 0, 0);
                this.inventoryGrid.updateItemSlots([testCouch, testChair]);
                this.menuEnabled = true;
                this.addChild(this.menu);
            }
        }

        enterPlacementMode(item) {
            if(['floor', 'wallpaper'].includes(item.furnitureType)) {
                this.bedroomManager.replaceObject(item);
            } else {
                this.clickedItem = new BedroomItem(item.furnitureType, item.typeIndex, this.mouseX, this.mouseY, item.zCoord);
                this.placementMode = true;
                this.addChild(this.clickedItem);
            }
        }

        toggleEditMode() {
            this.editMode = !this.editMode;
        }

        placementModeLoop(){
            if(this.placementMode){
                this.clickedItem.setCoordinate(this.mouseX - Math.floor(this.clickedItem.spriteWidth / 2), this.mouseY - Math.floor(this.clickedItem.spriteHeight / 2));
            }
        }
        whileHover(){
            this.placementModeLoop();
        }

        clickAction(gridX, gridY) {
            this.bedroomManager.addObject(this.clickedItem);
            this.placementMode = false;
        }

        nextFrame(){
            // this.children.forEach(child => child.nextFrame()); 
        }
    }
</script>