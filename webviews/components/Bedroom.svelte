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
                console.log("children=", this.children);
                throw new Error(`addObject: Cannot place ${item.typeIndex} at xCoord ${item.x}`);
            }
            this[`${item.furnitureType}Items`].push(item);
            this.exportObjects();
            console.log(this.children)
        }

        // Used to remove a wallItem, nearFurniture, or farFurniture
        removeObject(selectedItem) {
            if (!this.isValidObjectType(selectedItem.furnitureType) || ['wallpaper', 'floor'].includes(selectedItem.furnitureType)) {
                throw new Error('removeObject: invalid objectType');
            }
            
            this[`${selectedItem.furnitureType}Items`] = this[`${selectedItem.furnitureType}Items`].filter((item) => item !== selectedItem);
            this.exportObjects();
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
            return !indices.some((itemIndex, i) => 
                xCoords[i] + this.bedroomConfig[furnitureType][itemIndex].xTrim >= xCoord && // right bound
                xCoords[i] <= xCoord + objectConfig.xTrim //left bound
            );
        }

        getObjectAt(xCoord, yCoord) {
            const furnitureTypes = ['nearFurniture', 'farFurniture', 'wallItem'];
            for (let furnitureType of furnitureTypes) {
                const itemArray = this[`${furnitureType}Items`];
                for (let i = 0; i < itemArray.length; i++) {
                    let currentItem = itemArray[i];
                    console.log(currentItem.x, currentItem.y, currentItem.spriteWidth, currentItem.spriteHeight, xCoord, yCoord);
                    if (currentItem.x <= xCoord && currentItem.x + currentItem.spriteWidth >= xCoord &&
                        currentItem.y <= yCoord && currentItem.y + currentItem.spriteHeight >= yCoord) {
                        console.log("YUP");
                        return currentItem;
                    }
                }
            }
            console.log("UHHH");
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

    // add wall items (y placement)
    // finish wallpaper and floor customization
    // add stacking to items
    // designate wall borders in room
    // edit mode (select and move/delete items)
    // add x limits to furniture items
    // add red tint to overlapping items??

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
            this.removeButton = new smallButton(112, 112, 11, "X", ()=>{
                // this.bedroomManager.removeChild(this.clickedItem);
                this.bedroomManager.removeObject(this.clickedItem);
                this.clickedItem = null;
            });
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
        toggleInventory() {
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
                if(this.clickedItem) {
                    this.removeChild(this.clickedItem);
                }
                this.clickedItem = new BedroomItem(item.furnitureType, item.typeIndex, this.mouseX, this.mouseY, item.zCoord);
                this.placementMode = true;
                this.addChild(this.clickedItem);
            }
        }

        toggleEditMode() {
            this.editMode = !this.editMode;
            if(this.editMode) {
                this.addChild(this.removeButton);
            } else {
                this.removeChild(this.removeButton);
            }
            // make items clickable/hoverable
            // allow for wall/floor selection (clickable) (will also be able to select in inventory)
        }

        placementModeLoop() {
            if(this.placementMode && this.clickedItem) {
                let yCoord = this.clickedItem.yCoord + (bedroomConfig[this.clickedItem.furnitureType].spriteHeight - this.clickedItem.spriteHeight);
                this.clickedItem.setCoordinate(this.mouseX - Math.floor(this.clickedItem.spriteWidth / 2), yCoord);
            }
        }
        whileHover() {
            this.placementModeLoop();
        }

        clickAction(mouseX, mouseY) {
            // selecting an item in edit mode
            if(this.editMode && !this.placementMode){
                this.clickedItem = this.bedroomManager.getObjectAt(mouseX, mouseY);
                if(this.clickedItem) {
                    this.placementMode = true;
                }
            }
            // placing an item in placement mode
            else if(this.placementMode && this.clickedItem) {
                this.bedroomManager.removeObject(this.clickedItem); // to bypass collision check
                this.bedroomManager.addObject(this.clickedItem);
                this.removeChild(this.clickedItem);
                this.placementMode = false;
            }
        }

        nextFrame(){
            // this.children.forEach(child => child.nextFrame()); 
        }
    }
</script>