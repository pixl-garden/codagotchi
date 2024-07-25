<script context="module">
    import itemConfig from './itemConfig.json'
    import { game, Room, shouldFocus, inputValue, textInput } from './Game.svelte';
    import { TextRenderer } from './TextRenderer.svelte';
    import * as Colors from './colors.js';
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import { generateTextButtonClass, generateIconButtonClass, generateStatusBarClass, generateTextInputBar, generateInvisibleButtonClass, generateFontTextButtonClass } from './ObjectGenerators.svelte';
    import { generateColorButtonMatrix, generateEmptyMatrix } from './MatrixFunctions.svelte';
    import bedroomConfig from './config/bedroomConfig.json';
    import { inventoryGrid } from './Inventory.svelte';
    import { Pet, Button, Background, ConfigObject, GeneratedObject, toolTip, textButtonList, activeTextRenderer, ItemSlot, ObjectGrid, Menu, ButtonList} from './Object.svelte';



    export class BedroomManager {
        constructor(bedroomJSON) {
            this.bedroomConfig = bedroomConfig;
            this.wallpaperIndex = bedroomJSON["wallpaperIndex"] || 0;
            this.floorIndex = bedroomJSON["floorIndex"] || 0;
            this.wallItemIndices = bedroomJSON["wallItemIndices"] || [];
            this.wallItemXCoords = bedroomJSON["wallItemXCoords"] || [];
            this.nearFurnitureIndices = bedroomJSON["nearFurnitureIndices"] || [];
            this.nearFurnitureXCoords = bedroomJSON["nearFurnitureXCoords"] || [];
            this.farFurnitureIndices = bedroomJSON["farFurnitureIndices"] || [];
            this.farFurnitureXCoords = bedroomJSON["farFurnitureXCoords"] || [];
        }

        isValidObjectType(objectType) {
            const validTypes = ['wallpaper', 'floor', 'wallItem', 'nearFurniture', 'farFurniture'];
            return validTypes.includes(objectType);
        }

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
        replaceObject(objectType, configIndex) {
            if (!this.isValidObjectType(objectType) || !['wallpaper', 'floor'].includes(objectType)) {
                throw new Error('replaceObject: objectType must be wallpaper or floor');
            }
            this[`${objectType}Index`] = configIndex;
        }

        // Used to add a wallItem, nearFurniture, or farFurniture
        addObject(objectType, configIndex, xCoord) {
            if (!this.isValidObjectType(objectType) || ['wallpaper', 'floor'].includes(objectType)) {
                throw new Error('addObject: invalid objectType');
            }
            if (!this.checkCollision(objectType, configIndex, xCoord)) {
                throw new Error(`addObject: Cannot place ${objectType} at xCoord ${xCoord}`);
            }
            this[`${objectType}Indices`].push(configIndex);
            this[`${objectType}XCoords`].push(xCoord);
        }

        // Used to remove a wallItem, nearFurniture, or farFurniture
        removeObject(objectType, objectIndex) {
            if (!this.isValidObjectType(objectType) || ['wallpaper', 'floor'].includes(objectType)) {
                throw new Error('removeObject: invalid objectType');
            }

            const indices = this[`${objectType}Indices`];
            const xCoords = this[`${objectType}XCoords`];

            this[`${objectType}Indices`] = indices.filter((index) => index !== objectIndex);
            this[`${objectType}XCoords`] = xCoords.filter((_, index) => index !== objectIndex);
        }


        checkCollision(objectType, objectIndex, xCoord) {
            if (!this.isValidObjectType(objectType) || ['wallpaper', 'floor'].includes(objectType)) {
                throw new Error('checkAvailability: invalid objectType');
            }

            const objectConfig = this.bedroomConfig[objectType][objectIndex];
            if (!objectConfig.xTrim) {
                throw new Error('checkAvailability: object must have xTrim property');
            }

            const indices = this[`${objectType}Indices`];
            const xCoords = this[`${objectType}XCoords`];

            // Check if an existing object has overlapping xCoords
            return !indices.some((index, i) => 
                xCoords[i] + this.bedroomConfig[objectType][index].xTrim >= xCoord &&
                xCoords[i] <= xCoord
            );
        }

        exportObjects() {
            const exportArray = [];

            ['wallItem', 'nearFurniture', 'farFurniture'].forEach(objectType => {
                const indices = this[`${objectType}Indices`];
                const xCoords = this[`${objectType}XCoords`];
                console.log('indices:', indices);

                indices.forEach((configIndex, i) => {
                    const xCoord = xCoords[i];
                    console.log('configIndex:', configIndex, 'xCoord:', xCoord)
                    exportArray.push(new BedroomObject(objectType, configIndex, xCoord));
                });
            });
            exportArray.push(new BedroomObject('wallpaper', this.wallpaperIndex, 0));
            exportArray.push(new BedroomObject('floor', this.floorIndex, 0));

            return exportArray;
        }
    }

    class BedroomObject extends GeneratedObject {
        constructor(objectType, configIndex, xCoord, config = bedroomConfig) {
            const objectTypeConfig = config[objectType];
            const objectConfig = objectTypeConfig[configIndex];
            const spriteMatrix = spriteReaderFromStore(
                objectTypeConfig.spriteWidth,
                objectTypeConfig.spriteHeight,
                objectConfig.spriteSheet,
                objectConfig.xTrim || objectTypeConfig.spriteWidth,
                objectConfig.yTrim || objectTypeConfig.spriteHeight
            );
            const spriteIndex = objectConfig.spriteIndex || 0;
            const yCoord = objectTypeConfig.yCoord + (objectConfig.yTrim ? objectTypeConfig.spriteHeight - objectConfig.yTrim : 0);
            super(spriteMatrix, {default: [spriteIndex]}, xCoord, yCoord, objectTypeConfig.zCoord);
            this.spriteWidth = objectConfig.xTrim || objectTypeConfig.spriteWidth;
            this.spriteHeight = objectConfig.yTrim || objectTypeConfig.spriteHeight;
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

    function createItemSlotXL() {
        let output = new ConfigObject("itemSlotXL", 0, 0, 0);
        output.hoverWithChildren = true;
        output.passMouseCoords = true;
        return output;
    }
    export class BedroomEditor extends GeneratedObject {
        constructor(gameRef) {
            let emptySpriteMatrix = generateEmptyMatrix(128, 128);
            super(emptySpriteMatrix, {default: [0]}, 0, 0, 0);
            this.menu = new Menu(10, 19, 10, 108, 108, '#8B9BB4', '#616C7E', Colors.black, 2, 3, 3, 1);
            this.inventoryGrid = new inventoryGrid(2, 2, 2, 2, 2, 2, 11, [], createItemSlotXL, null, null, 1, 1, 1);
            this.menu.children = [this.inventoryGrid]
            this.children = [this.menu];
        }
        toggleInventory(){
            if(this.menu.y < 22){
                this.menu.startMovingTo(10, 108);
                // this.inventoryGrid.startMovingTo(15, 113);
            }
            else{
                this.menu.startMovingTo(10, 19);
                // this.inventoryGrid.startMovingTo(15, 24);
            }
        }
        nextFrame(){
            this.children.forEach(child => child.nextFrame());
        }
    }
</script>