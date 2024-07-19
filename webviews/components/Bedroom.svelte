<script context="module">
    import itemConfig from './itemConfig.json'
    import { game, Room, shouldFocus, inputValue, textInput } from './Game.svelte';
    import { TextRenderer } from './TextRenderer.svelte';
    import * as Colors from './colors.js';
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import { generateTextButtonClass, generateIconButtonClass, generateStatusBarClass, generateTextInputBar, generateInvisibleButtonClass, generateFontTextButtonClass } from './ObjectGenerators.svelte';
    import { generateColorButtonMatrix } from './MatrixFunctions.svelte';


    export class BedroomManager {
        constructor (bedroomJSON){
            this.wallpaper = bedroomJSON.wallpaper;
            this.floor = bedroomJSON.floor;
            this.wallItems = bedroomJSON.wallItems;
            this.nearFurniture = bedroomJSON.nearFurniture;
            this.farFurniture = bedroomJSON.farFurniture;
        }
        setWallpaper() {

        }

        setFloor() {

        }

        addFurniture() {

        }

        serializeBedroom() {
            return {
                wallpaperIndex: this.wallpaperIndex,
                floorIndex: this.floorIndex,
                wallItemIndices: this.wallItemIndices,
                wallItemXCoords: this.wallItemXCoords,
                nearFurnitureIndices: this.nearFurnitureIndices,
                nearFurnitureXCoords: this.nearFurnitureXCoords,
                farFurnitureIndicies: this.farFurnitureIndices,
                farFurnitureXCoords: this.farFurnitureXCoords
            }
        }

 

        exportObjects(){
            
        }

        checkAvailability() {

        }

        
        
    }


</script>