<script context="module">
    import { GeneratedObject } from "./Object.svelte";
    import itemConfig from "itemConfig.json";
    import { spriteReaderFromStore } from "./SpriteReader.svelte";
    const ITEMWIDTH = 32;

    export class Item extends GeneratedObject {
        constructor( itemName ){
            // maybe add an item count parameter?
            console.log("HIIIIIIIIIIIIIIIIIIIIIII")
            const config = itemConfig[itemName];
            if( !config ) throw new Error(`Item ${itemName} not found in itemConfig.json`);
            const objState = { default: [config.spriteIndex] }
            const spriteMatrix = spriteReaderFromStore(ITEMWIDTH, ITEMWIDTH, config.spriteSheet);
            console.log("spriteMatrix", spriteMatrix, "objState", objState, "config", config, "itemName");
            super(spriteMatrix, objState, 0, 0, 0);
            this.spriteHeight = ITEMWIDTH;
            this.spriteWidth = ITEMWIDTH;
            this.config = config;
            this.description = config.description;
        }
        getDescription(){
            return this.description;
        }
    }
</script>