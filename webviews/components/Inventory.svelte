<script context="module">
    import { GeneratedObject, objectGrid, activeTextRenderer } from "./Object.svelte";
    import itemConfig from './itemConfig.json';
    import { spriteReaderFromStore } from "./SpriteReader.svelte";
    const ITEMWIDTH = 32;
    const stackableTypes = ["food"]

    export class Item extends GeneratedObject {
        constructor( itemName ){
            // maybe add an item count parameter?
            const config = itemConfig[itemName];
            if( !config ) throw new Error(`Item ${itemName} not found in itemConfig.json`);
            const objState = { default: [config.spriteIndex] }
            const spriteMatrix = spriteReaderFromStore(ITEMWIDTH, ITEMWIDTH, config.spriteSheet);
            super(spriteMatrix, objState, 0, 0, 0);
            this.itemName = itemName;
            this.stackable = false;
            this.itemCount = 1;
            this.spriteHeight = ITEMWIDTH;
            this.spriteWidth = ITEMWIDTH;
            this.config = config;
            this.displayName = config.displayName;
            this.description = config.description;
            this.itemType = config.type;
            this.inventoryId;
            this.properties = {};
        }
        getName(){
            return this.displayName;
        }
        getDescription(){
            return this.description;
        }
        getInventoryId(){
            return this.inventoryId;
        }
        //base serialization for backend
        serialize() {
            return {
                [this.inventoryId]: {
                    itemName: this.itemName,
                    itemCount: this.itemCount,
                    properties: this.properties
                }
            };
        }
    }

    export class Inventory {
        constructor() {
            this.items = new Map(); // Stores inventoryId -> item instance
            // stackable items is redundant but is used for quick access to stackable items
            this.stackableItems = new Map(); // Stores itemIdString -> inventoryId for stackable items
        }

        // Get the first available ID for a new item
        // could be optimized by storing the last used ID or using a seperate set
        // or could keep track of free IDs and process them during low load times
        getFirstAvailableId() {
            let id = 0;
            while (this.items.has(id)) {
                id++;
            }
            return id;
        }

        addStackableItemToInstance(itemIdString, quantity = 1) {
            let item;
            if (this.stackableItems.has(itemIdString)) {
                const inventoryId = this.stackableItems.get(itemIdString);
                item = this.items.get(inventoryId);
                item.itemCount += quantity;
            } else {
                const newId = this.getFirstAvailableId();
                item = new Item(itemIdString);
                item.inventoryId = newId; // Assign the first available inventory ID
                item.itemCount = quantity;
                item.stackable = true;

                this.items.set(newId, item);
                this.stackableItems.set(itemIdString, newId);
            }
            return item;
        }

        subtractStackableItemFromInstance(itemIdString, quantity = 1) {
            let item;
            if (this.stackableItems.has(itemIdString)) {
                const inventoryId = this.stackableItems.get(itemIdString);
                item = this.items.get(inventoryId);
                item.itemCount -= quantity;
                if (item.itemCount <= 0) {
                    item.itemCount = 0;
                }
            } else{
                throw new Error(`Item ${itemIdString} not found in inventory`);
            }
            return item;
        }

        addUnstackableItemToInstance(itemIdString, properties) {
            const newId = this.getFirstAvailableId();
            const newItem = new Item(itemIdString, properties);
            newItem.inventoryId = newId; // Assign the first available inventory ID
            newItem.itemCount = 1;
            newItem.stackable = false;

            this.items.set(newId, newItem);
        }

        removeItemByIdFromInstance(inventoryId) {
            if (this.items.has(inventoryId)) {
                const item = this.items.get(inventoryId);

                if (item.stackable) {
                    item.itemCount--;
                    if (item.itemCount <= 0) {
                        this.stackableItems.delete(item.itemName);
                        this.items.delete(inventoryId);
                    }
                } else {
                    this.items.delete(inventoryId);
                }

                return true; // Item found and removed
            }
            return false; // Item not found
        }

        hasItemInInstance(itemIdString) {
            return this.items.has(itemIdString);
        }

        hasStackableItemsInInstance(itemIdString, quantity = 1) {
            if (this.stackableItems.has(itemIdString)) {
                const inventoryId = this.stackableItems.get(itemIdString);
                const item = this.items.get(inventoryId);
                return item.itemCount >= quantity;
            }
            return false;
        }

        serializedInventory() {
            let serializedInventory = {};
            this.items.forEach((item, inventoryId) => {
                serializedInventory[inventoryId] = item.serialize();
            });
            return JSON.stringify(serializedInventory);
        }

        getItemsArray() {
            // Convert the Map values to an array
            return Array.from(this.items.values());
        }
    }

    // Function to reconstruct items from serialized data
    function reconstructItem(itemData) {
        console.log("Item Data: ", itemData);
        const config = itemConfig[itemData.itemName];
        if (!config) throw new Error(`Configuration for item ${itemData.itemName} not found`);

        const item = new Item(itemData.itemName, itemData.properties);
        item.inventoryId = itemData.inventoryId;
        item.itemCount = itemData.itemCount || 1;
        item.properties = itemData.properties || {};
        item.itemType = config.type;

        return item;
    }

    export function createInventoryFromSave(savedData) {
        const inventory = new Inventory();

        // Iterate over each key in savedData, which are inventoryIds
        Object.keys(savedData).forEach(inventoryId => {
            const itemData = savedData[inventoryId];
            const item = reconstructItem(itemData);
            item.inventoryId = parseInt(inventoryId); // Ensure the inventoryId is treated as a number if needed

            inventory.items.set(item.inventoryId, item);
            if (stackableTypes.includes(item.itemType)) {
                inventory.stackableItems.set(item.itemName, item.inventoryId);
            }
        });

        return inventory;
    }
    export class inventoryGrid extends objectGrid{
        constructor(columns, columnSpacing, rows, rowSpacing, x, y, z, items, totalSlots, itemSlotConstructor, toolTip, numberTextRenderer){
            let constructedItems = constructInventoryObjects(itemSlotConstructor, items, totalSlots, numberTextRenderer);
            console.log("Constructed items: ", constructedItems);
            super(columns, columnSpacing, rows, rowSpacing, x, y, z, constructedItems, 0, 0, "vertical", 3);
            this.toolTip = toolTip;
            this.toolTip.setCoordinate(0, 0, 30);
            this.displayToolTip = false;
            this.hoverWithChildren = true;
            
            this.children.forEach((itemSlot) => {
                //while itemSlot hover, set coordinate of tooltip to mouse
                itemSlot.whileHover = () => {
                    this.toolTip.setCoordinate(this.mouseX, this.mouseY, 30);
                }
                //on itemSlot hover, display the tooltip and set the toop tip item to the item in the slot
                itemSlot.onHover = () => {
                    if(this.hoveredChild?.children[0]){
                        this.toolTip.setItem(this.hoveredChild.children[0]);
                        this.displayToolTip = true;
                    }
                    itemSlot.updateState("hovered");
                }
                //on itemSlot stop hover, hide the tooltip
                itemSlot.onStopHover = () => {
                    this.displayToolTip = false;
                    itemSlot.updateState("default");
                }
            });
            function constructInventoryObjects(createSlotInstance, items, totalSlots, numberTextRenderer) {
                let inventoryGrid = [];
                for(let i = 0; i < totalSlots; i++) {
                    let item = items[i];
                    let slotInstance = createSlotInstance(); // Use the factory function to create a new instance
                    // console.log("Slot Instance: ", slotInstance); // Check the instance
                    // console.log(slotInstance instanceof GeneratedObject);
                    if(item) {
                        // console.log("Item: ", item); // Check the item (should be a GeneratedObject instance
                        let numberRenderer = new activeTextRenderer(numberTextRenderer, 25, 23, 0);
                        numberRenderer.setText(item.itemCount.toString());
                        slotInstance.addChild(item);
                        slotInstance.addChild(numberRenderer);
                    }
                    inventoryGrid.push(slotInstance);
                }
                return inventoryGrid;
            }
        }

        //called when buttons are hovered (item grid stops being hovered)
        //its a bit redundant and more of a failsafe but if not included it stops working fairly quickly
        onStopHover(){
            if(this.hoveredChild != null && this.hoveredChild.children.length > 0){
                this.toolTip.setItem(this.hoveredChild.children[0]);
                this.toolTip.setCoordinate(this.mouseX, this.mouseY, 30);
                this.displayToolTip = true;
            }
            if(this.hoveredChild == null){
                this.displayToolTip = false;
            }
        }

        getSprite() {
            let spritesOut = [];
            //output all children sprites (item slots and items)
            if(this.children.length > 0) {
                this.getChildSprites().forEach((sprite) => {
                    if (Array.isArray(sprite)) {
                        spritesOut.push(...sprite);
                    //if not an array, push sprite
                    } else {
                        spritesOut.push(sprite);
                    }
                });
            }
            //output tooltip sprite if displayToolTip is true
            if(this.displayToolTip){
                spritesOut.push(this.toolTip.getSprite());
            }
            return spritesOut;
        }
    }
</script>