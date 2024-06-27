<script context="module">
    import { GeneratedObject, ObjectGrid, activeTextRenderer } from "./Object.svelte";
    import itemConfig from './itemConfig.json';
    import { spriteReaderFromStore } from "./SpriteReader.svelte";
    import { generateEmptyMatrix, scaleMatrix } from "./MatrixFunctions.svelte";
    import { Sprite } from "./SpriteComponent.svelte";
    const stackableTypes = ["food", "stamp", "mining"]

    /**
     * Represents an item in the game inventory, extending functionalities from GeneratedObject.
     * @extends GeneratedObject
     */
    export class Item extends GeneratedObject {
        /**
         * Creates an instance of an Item.
         * @param {string} itemName - The name of the item, used to fetch its configuration.
         */
        constructor( itemName, x = 0, y = 0, z = 0){
            // maybe add an item count parameter?
            const config = itemConfig[itemName];
            if( !config ) throw new Error(`Item ${itemName} not found in itemConfig.json`);
            const spriteMatrix = spriteReaderFromStore(config.spriteWidth, config.spriteWidth, config.spriteSheet);
            super(spriteMatrix, config.states, x, y, z);
            /** @property {string} itemName - The internal name of the item. */
            this.itemName = itemName;
            /** @property {boolean} stackable - Indicates if the item can be stacked. */
            this.stackable = false;
            /** @property {number} itemCount - The count of this item in inventory. */
            this.itemCount = 1;
            /** @property {number} spriteHeight - The height of the item's sprite. */
            this.spriteHeight = config.spriteWidth;
            /** @property {number} spriteWidth - The width of the item's sprite. */
            this.spriteWidth = config.spriteWidth;
            /** @property {Object} config - Configuration details for the item. */
            this.config = config;
            /** @property {string} displayName - The display name of the item. */
            this.displayName = config.displayName;
            /** @property {string} description - The description of the item. */
            this.description = config.description;
            /** @property {string} itemType - The type category of the item. */
            this.itemType = config.type;
            /** @property {number | undefined} inventoryId - The unique ID of the item in the inventory. */
            this.inventoryId;
            /** @property {Object} properties - Custom properties specific to the item. */
            this.properties = {};
            this.mouseInteractions = false;
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
            this.itemsByType = new Map(); // Stores itemType -> Set of inventoryIds
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

        // Add item to the type index (used for quick access to items of a certain type)
        addItemToTypeIndex(item) {
            console.log("addItemToTypeIndex called");
            const typeSet = this.itemsByType.get(item.itemType) || new Set();
            typeSet.add(item.inventoryId);
            this.itemsByType.set(item.itemType, typeSet);
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
                item.inventoryId = newId;
                item.itemCount = quantity;
                item.stackable = true;

                this.items.set(newId, item);
                this.stackableItems.set(itemIdString, newId);
                this.addItemToTypeIndex(item);
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

                if (item.stackable && item.itemCount > 1) {
                    item.itemCount--;
                } else {
                    this.items.delete(inventoryId);
                    this.stackableItems.delete(item.itemName);
                    const typeSet = this.itemsByType.get(item.itemType);
                    if (typeSet) {
                        typeSet.delete(inventoryId);
                        if (typeSet.size === 0) this.itemsByType.delete(item.itemType);
                    }
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

        getItemsByType(itemType) {
            const inventoryIds = this.itemsByType.get(itemType) || new Set();
            return Array.from(inventoryIds).map(id => this.items.get(id));
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

            // Set item into the main items map
            inventory.items.set(item.inventoryId, item);
            if (stackableTypes.includes(item.itemType)) {
                inventory.stackableItems.set(item.itemName, item.inventoryId);
            }

            // Update the itemsByType map
            const typeSet = inventory.itemsByType.get(item.itemType) || new Set();
            typeSet.add(item.inventoryId);
            inventory.itemsByType.set(item.itemType, typeSet);
        });

        return inventory;
    }
    export class inventoryGrid extends ObjectGrid{
        constructor(columns, columnSpacing, rows, rowSpacing, x, y, z, items, itemSlotConstructor, toolTip, 
                    numberTextRenderer, scrollSpeed, itemX = 0, itemY = 0, itemZ = 10){
            let constructedItems = constructInventoryObjects(itemSlotConstructor, items, rows*columns, numberTextRenderer);
            console.log("Constructed items: ", constructedItems);
            super(columns, columnSpacing, rows, rowSpacing, x, y, z, constructedItems, 0, 0, "vertical", scrollSpeed);
            this.itemSlotConstructor = itemSlotConstructor;
            this.totalSlots = rows*columns;
            this.items = items;
            this.numberTextRenderer = numberTextRenderer;
            this.displayToolTip = false;
            this.hoverWithChildren = true;
            this.itemX = itemX;
            this.itemY = itemY;
            this.itemZ = itemZ;
            this.toolTip = toolTip;
            this.hoveredItem = null;
            this.toolTip?.setCoordinate(0, 0, this.itemZ+1);
            // this.setHoverLogic();
        }


        setHoverLogic() {
            this.children.forEach((itemSlot) => {
                //while itemSlot hover, set coordinate of tooltip to mouse
                itemSlot.whileHover = () => {
                    this.toolTip?.setCoordinate(this.mouseX, this.mouseY, this.itemZ+1);
                }
                //on itemSlot hover, display the tooltip and set the toop tip item to the item in the slot
                itemSlot.onHover = () => {
                    if(itemSlot.slotItem != null){
                        this.toolTip?.setItem(itemSlot.slotItem);
                        this.hoveredItem = itemSlot.slotItem;
                        this.scaledItemRef?.setItem(itemSlot.slotItem);
                        this.displayToolTip = true;
                    }
                    itemSlot.updateState("hovered");
                }
                //on itemSlot stop hover, hide the tooltip
                itemSlot.onStopHover = () => {
                    this.displayToolTip = false;
                    this.hoveredItem = null;
                    itemSlot.updateState("default");
                }
            });
        }

        //called when buttons are hovered (item grid stops being hovered)
        //its a bit redundant and more of a failsafe but if not included it stops working fairly quickly
        onStopHover(){
            if(this.hoveredChild != null && this.hoveredChild.children.length > 0){
                this.toolTip?.setItem(this.hoveredChild.slotItem);
                this.hoveredItem = this.hoveredChild.slotItem;
                this.toolTip?.setCoordinate(this.mouseX, this.mouseY, this.itemZ+1);
                this.displayToolTip = true;
            }
            if(this.hoveredChild == null){
                this.displayToolTip = false;
                this.hoveredItem = null;
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
            if(this.displayToolTip && this.toolTip != null){
                spritesOut.push(this.toolTip.getSprite());
            }
            return spritesOut;
        }

        //update the item slots with new items
        updateItemSlots(itemsArray){
            let itemSlotExport = constructInventoryObjects(this.itemSlotConstructor, itemsArray, this.totalSlots, this.numberTextRenderer, this.itemX, this.itemY, this.itemZ);
            // update the objects rendered in the grid (from objectGrid superclass)
            this.updateObjects(itemSlotExport);
            console.log("Item Slot Export: ", itemSlotExport);
            this.setHoverLogic();
        }
    }

    // function instead of method so that it can be called before the super constructor (doesn't need this. to call it)
    // maybe change this later
    function constructInventoryObjects(createSlotInstance, items, totalSlots, numberTextRenderer, itemX, itemY, itemZ) {
        let inventoryGrid = [];
        for(let i = 0; i < totalSlots; i++) {
            let item = items[i];
            let slotInstance = createSlotInstance(); // Use the factory function to create a new instance
            
            // console.log("Slot Instance: ", slotInstance); // Check the instance
            // console.log(slotInstance instanceof GeneratedObject);
            if(item) {
                console.log("Slot Instance: ", slotInstance, numberTextRenderer); // Check the instance
                item.setCoordinate(itemX, itemY, itemZ);
                slotInstance.slotItem = item;
                // item.mouseInteractions = false;
                slotInstance.addChild(item);
                if(numberTextRenderer != null){
                    let numberRenderer = new activeTextRenderer(numberTextRenderer, 14, 14, itemZ+10);
                    numberRenderer.setText(item.itemCount.toString());
                    // numberRenderer.mouseInteractions = false;
                    slotInstance.addChild(numberRenderer);
                }
            }
            else{
                slotInstance.slotItem = null;
            }
            inventoryGrid.push(slotInstance);
        }
        return inventoryGrid;
    }
    export class inventoryDisplayManager extends GeneratedObject{
        constructor(x, y, z, inventoryGrid, tabs, scaledItem, itemInfoDisplay) {
            let emptyMatrix = generateEmptyMatrix(128, 128);
            super([emptyMatrix], {default: [0]}, x, y, z);
            this.inventoryGrid = inventoryGrid;
            this.tabs = tabs;
            this.scaledItem = scaledItem;
            this.itemInfoDisplay = itemInfoDisplay;
            this.hoveredItemName;
            this.hoveredItemInfo;
            this.children = [inventoryGrid, scaledItem, tabs, itemInfoDisplay];
        }
        whileHover(){
            if(this.inventoryGrid.hoveredItem != null){
                this.scaledItem.setItem(this.inventoryGrid.hoveredItem);
                this.itemInfoDisplay.setItemInfo(this.inventoryGrid.hoveredItem.displayName);
            }
        }
        onStopHover(){
            this.scaledItem.setItem(null);
            this.itemInfoDisplay.setItemInfo(" ");
        }
        setItemInfo(x, y, z) {

        }

        setScaledItem(x, y, z) {
            
        }

        setPageButtons(backX, backY, backZ, forwardX, forwardY, forwardZ) {

        }

        setItemTabs() {
            
        }


    }

    export class itemScaler extends GeneratedObject{
        constructor(x, y, z, scale){
            super(generateEmptyMatrix(1, 1), { default: [0] }, x, y, z);
            this.item = null;
            this.scale = scale;
        }
        setItem(item){
            this.item = item;
        }
        getSprite(){
            if(this.item){
                let baseMatrix = this.item.getSprite().getMatrix();
                let scaledMatrix = scaleMatrix(baseMatrix, this.scale);
                return new Sprite(scaledMatrix, this.x, this.y, this.z);
            }
            else{
                return new Sprite(generateEmptyMatrix(1, 1), this.x, this.y, this.z);
            }
        }
    }

    export class itemInfoDisplay extends GeneratedObject{
        constructor(x, y, z, textRenderer){
            super(generateEmptyMatrix(1, 1), { default: [0] }, x, y, z);
            this.textRenderer = textRenderer;
            this.itemName = "";
            this.itemInfo = "";
        }
        setItemInfo(itemName){
            this.itemName = itemName;
        }
        getSprite(){
            let textSprite = this.textRenderer.renderText(this.itemName);
            return new Sprite(textSprite, this.x, this.y, this.z);
        }
    }
</script>