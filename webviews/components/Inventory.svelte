<script context="module">
    import Object, { GeneratedObject, ObjectGrid, activeTextRenderer } from "./Object.svelte";
    import itemConfig from './itemConfig.json';
    import bedroomConfig from './config/bedroomConfig.json';
    import { spriteReaderFromStore } from "./SpriteReader.svelte";
    import { generateEmptyMatrix, scaleMatrix, roundSpriteMatrix } from "./MatrixFunctions.svelte";
    import { Sprite } from "./SpriteComponent.svelte";
    import { compute_rest_props } from "svelte/internal";
    import { trimSpriteMatrix, flipMatrixByAxis } from "./MatrixFunctions.svelte";
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
        constructor( config, itemName, x = 0, y = 0, z = 0) {
            const xTrim = config.xTrim || config.spriteWidth;
            const yTrim = config.yTrim || config.spriteHeight || config.spriteWidth;
            // maybe add an item count parameter?
            const spriteMatrix = spriteReaderFromStore(config.spriteWidth, config.spriteHeight || config.spriteWidth, config.spriteSheet, xTrim, yTrim);
            super(spriteMatrix, config.states, x, y, z);
            /** @property {string} itemName - The internal name of the item. */
            this.itemName = itemName;
            /** @property {boolean} stackable - Indicates if the item can be stacked. */
            this.stackable = false;
            /** @property {number} itemCount - The count of this item in inventory. */
            this.itemCount = 1;
            /** @property {number} spriteHeight - The height of the item's sprite. */
            this.spriteHeight = yTrim;
            /** @property {number} spriteWidth - The width of the item's sprite. */
            this.spriteWidth = xTrim;
            /** @property {Object} config - Configuration details for the item. */
            this.config = config;
            /** @property {string} displayName - The display name of the item. */
            this.displayName = config.displayName;
            /** @property {string} description - The description of the item. */
            this.description = config.description || " ";
            /** @property {string} itemType - The type category of the item. */
            this.itemType = config.type;
            /** @property {number | undefined} inventoryId - The unique ID of the item in the inventory. */
            this.inventoryId;
            /** @property {Object} properties - Custom properties specific to the item. */
            this.properties = {};
            this.mouseInteractions = false;
            this.hasThumbnail = false;
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
        getThumbnail(){
            return roundSpriteMatrix(trimSpriteMatrix(this.sprites[this.currentSpriteIndex], this.thumbnailStartX, this.thumbnailEndX, this.thumbnailStartY, this.thumbnailEndY), 4);
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

    export class InventoryItem extends Item {
        constructor(itemName, x = 0, y = 0, z = 0) {
            const config = itemConfig[itemName];
            if( !config ) throw new Error(`Item ${itemName} not found in itemConfig.json`);
            super(config, itemName, x, y, z);
        }
    }
    //constructor(furnitureType, typeIndex)
    export class BedroomItem extends Item {
        constructor(furnitureType, typeIndex, x = 0, y = bedroomConfig[furnitureType]["yCoord"], z = bedroomConfig[furnitureType]["zCoord"]) {
            const typeConfig = bedroomConfig[furnitureType];
            let instanceConfig = bedroomConfig[furnitureType][typeIndex];
            if( !instanceConfig ) throw new Error(`Item ${typeIndex} not found in bedroomConfig.json: ${furnitureType}`);
            instanceConfig["spriteWidth"] = typeConfig["spriteWidth"];
            instanceConfig["spriteHeight"] = typeConfig["spriteHeight"];
            instanceConfig["type"] = furnitureType;
            super(instanceConfig, typeIndex, x, y, z);
            this.furnitureType = furnitureType;
            this.typeIndex = typeIndex;
            this.position = null; // used for determining near or far furniture
            this.isFlipped = false;
            this.stackedChildren = [];
            if( ['wallpaper', 'floor'].includes(furnitureType) ) {
                this.hasThumbnail = true;
                this.thumbnailStartX = typeConfig["thumbnailCoords"][0];
                this.thumbnailEndX = typeConfig["thumbnailCoords"][1];
                this.thumbnailStartY = typeConfig["thumbnailCoords"][2];
                this.thumbnailEndY = typeConfig["thumbnailCoords"][3];
            } else if( furnitureType === "wallItem") {
                this.yTopBound = typeConfig["yTopBound"];
                this.yBottomBound = typeConfig["yBottomBound"];
            } else if( furnitureType === "furnitureItems" || furnitureType === "stackableItems") {
                this.position = "near";
                if(instanceConfig["stackDimensions"]) {
                    this.stackYCoord = instanceConfig["stackDimensions"][0];
                    this.stackLeftBound = instanceConfig["stackDimensions"][1];
                    this.stackRightBound = instanceConfig["stackDimensions"][2];
                }
            }
        }
        addChild(child) {
            this.stackedChildren.push(child);
        }

        removeChild(child) {
            this.stackedChildren = this.stackedChildren.filter(item => item !== child);
        }

        getSprite(){
            let matrix = this.isFlipped ? 
                flipMatrixByAxis(trimSpriteMatrix(this.sprites[this.currentSpriteIndex], 0, this.spriteWidth, 0, this.spriteHeight), "x") :
                trimSpriteMatrix(this.sprites[this.currentSpriteIndex], 0, this.spriteWidth, 0, this.spriteHeight);
            return new Sprite(matrix, this.x, this.y, this.z, this.opacity);
        }

        flip() {
            this.isFlipped = !this.isFlipped;
        }
        getJSON(){
            if(this.furnitureType === "wallItems"){
                return {
                    "index": this.typeIndex,
                    "x": this.x,
                    "y": this.y,
                    "flipped": this.isFlipped ? 1 : 0,
                    "variation": 0 //TODO: add variation
                }
            }
            else if(this.furnitureType === "furnitureItems" || this.furnitureType === "stackableItems"){
                return {
                    "index": this.typeIndex,
                    "x": this.x,
                    "position": this.position == "near" ? 1 : 0,
                    "flipped": this.isFlipped ? 1 : 0,
                    "variation": 0 //TODO: add variation
                }
            }
            else{
                console.error("Invalid furniture type");
            }
        }
    }

    export class Inventory {
        constructor(savedData) {
            this.items = new Map(); // Stores itemName -> item instance
            this.stackableItems = new Map(); // Stores itemName -> item instance for stackable items
            this.itemsByType = new Map(); // Stores itemType -> Set of itemNames
            
            console.log('Saved Data:', savedData); // For debugging

           if (savedData && typeof savedData === 'object') {
                const sortedItems = this.sortInventory(savedData);
                
                for (let i = 0; i < sortedItems.length; i++) {
                    const [itemName, count] = sortedItems[i];
                    const item = this.createItem(itemName, count);
                    this.items.set(itemName, item);

                    if (stackableTypes.includes(item.itemType)) {
                        this.stackableItems.set(itemName, item);
                    }

                    const typeSet = this.itemsByType.get(item.itemType) || new Set();
                    typeSet.add(itemName);
                    this.itemsByType.set(item.itemType, typeSet);
                }
            }
        }

        sortInventory(savedData) {
            const items = [];
            for (const itemName in savedData) {
                if (savedData.hasOwnProperty(itemName)) {
                    items.push([itemName, savedData[itemName]]);
                }
            }
            return items.sort((a, b) => {
                const typeA = itemConfig[a[0]]?.type || '';
                const typeB = itemConfig[b[0]]?.type || '';
                if (typeA !== typeB) {
                    return typeA.localeCompare(typeB);
                }
                return a[0].localeCompare(b[0]);
            });
        }

        createItem(itemName, count) {
            const item = new InventoryItem(itemName);
            item.itemCount = count;
            item.stackable = stackableTypes.includes(item.itemType);
            return item;
        }
        // Add item to the type index (used for quick access to items of a certain type)
        addStackableItemToInstance(itemName, quantity = 1) {
            let item;
            if (this.items.has(itemName)) {
                item = this.items.get(itemName);
                item.itemCount += quantity;
            } else {
                item = this.createItem(itemName, quantity);
                this.items.set(itemName, item);
                this.stackableItems.set(itemName, item);
                this.addItemToTypeIndex(item);
            }
            return item;
        }

        subtractStackableItemFromInstance(itemName, quantity = 1) {
            if (this.items.has(itemName)) {
                const item = this.items.get(itemName);
                item.itemCount -= quantity;
                if (item.itemCount <= 0) {
                    this.items.delete(itemName);
                    this.stackableItems.delete(itemName);
                    this.removeItemFromTypeIndex(item);
                }
                return item;
            } else {
                throw new Error(`Item ${itemName} not found in inventory`);
            }
        }

        addItemToTypeIndex(item) {
            const typeSet = this.itemsByType.get(item.itemType) || new Set();
            typeSet.add(item.itemName);
            this.itemsByType.set(item.itemType, typeSet);
        }

        removeItemFromTypeIndex(item) {
            const typeSet = this.itemsByType.get(item.itemType);
            if (typeSet) {
                typeSet.delete(item.itemName);
                if (typeSet.size === 0) this.itemsByType.delete(item.itemType);
            }
        }

        addUnstackableItemToInstance(itemIdString, properties) {
            const newId = this.getFirstAvailableId();
            const newItem = new InventoryItem(itemIdString, properties);
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
            console.log("ItemsByType", this.itemsByType, "type", this.itemsByType.get(itemType));
            const inventoryIds = this.itemsByType.get(itemType) || new Set();
            return Array.from(inventoryIds).map(id => this.items.get(id));
        }
    }

    // Function to reconstruct items from serialized data
    function reconstructItem(itemData) {
        const config = itemConfig[itemData.itemName];
        if (!config) throw new Error(`Configuration for item ${itemData.itemName} not found`);

        const item = new InventoryItem(itemData.itemName, itemData.properties);
        item.inventoryId = itemData.inventoryId;
        item.itemCount = itemData.itemCount || 1;
        item.properties = itemData.properties || {};
        item.itemType = config.type;

        return item;
    }

    export class inventoryGrid extends ObjectGrid{
        constructor({columns, rows, spacing, position, items, slotFactory, 
                toolTip, numberTextRenderer, slotClickAction = () => {}, 
                itemOffset = { x: 0, y: 0, z: 1 }}) {
            let constructedItems = constructInventoryObjects(slotFactory, items, rows*columns, numberTextRenderer, slotClickAction, itemOffset.x, itemOffset.y, itemOffset.z);
            super(columns, spacing.x, rows, spacing.y, position.x, position.y, position.z, constructedItems, true);
            this.slotFactory = slotFactory;
            this.totalSlots = this.objects.length;
            this.items = items;
            this.numberTextRenderer = numberTextRenderer;
            this.displayToolTip = false;
            this.hoverWithChildren = true;
            this.itemX = itemOffset.x;
            this.itemY = itemOffset.y;
            this.itemZ = itemOffset.z;
            this.toolTip = toolTip;
            this.hoveredItem = null;
            this.toolTip?.setCoordinate(0, 0, this.itemZ+1);
            this.updateItemSlots(items);
            this.clickAction = () => {};
            this.slotClickAction = (item)=>{slotClickAction(item); this.displayToolTip = false; this.hoveredItem = null; this.hoveredChild = null; this.onStopHover()};
            this.renderChildren = true;
            this.renderEmpty = false;
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
            //output tooltip sprite if displayToolTip is true
            if(this.displayToolTip && this.toolTip != null){
                return this.toolTip.getSprite();
            }
        }

        //update the item slots with new items
        updateItemSlots(itemsArray){
            let itemSlotExport = constructInventoryObjects(this.slotFactory, itemsArray, itemsArray.length, this.numberTextRenderer, this.slotClickAction, this.itemX, this.itemY, this.itemZ);
            console.log("ItemSlotExport", itemSlotExport)
            // update the objects rendered in the grid (from objectGrid superclass)
            this.objects = itemSlotExport;
            this.generateObjectGrid();
            this.setHoverLogic();
        }

    }

    // function instead of method so that it can be called before the super constructor (doesn't need this. to call it)
    // maybe change this later
    function constructInventoryObjects(createSlotInstance, items, totalSlots, numberTextRenderer, clickAction = () => {}, itemX = 0, itemY = 0, itemZ = 1) {
        let inventoryGrid = [];
        for(let i = 0; i < totalSlots; i++) {
            let item = items[i];
            let slotInstance = createSlotInstance(); // Use the factory function to create a new instance
            
            if(item) {
                // if item has thumbnail set it as displayItem, otherwise use item sprite
                let displayItem = item.hasThumbnail ? new GeneratedObject([item.getThumbnail()], {default: [0]}, 0, 0, slotInstance.z + 1) : item;
                // find x and y coordinates that will center item
                let newItemX = Math.floor((slotInstance.spriteWidth - displayItem.spriteWidth) / 2) + itemX;
                let newItemY = Math.floor((slotInstance.spriteHeight - displayItem.spriteHeight) / 2) + itemY;

                displayItem.setCoordinate(newItemX, newItemY, slotInstance.z + itemZ);
                // ignore click events on the display item
                displayItem.mouseInteractions = false;
                slotInstance.addChild(displayItem);
                // item ref for click action usage
                slotInstance.slotItem = item;
                
                if(numberTextRenderer != null) {
                    let numberRenderer = new activeTextRenderer(numberTextRenderer, 4, 14, slotInstance.z + 2, ()=> {}, {maxWidth: 25, position: "center"});
                    numberRenderer.setText(item.itemCount.toString());
                    slotInstance.addChild(numberRenderer);
                }
                slotInstance.actionOnClick = () => {
                    clickAction(item);
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
        constructor(x, y, z, gameRef, inventoryGrid, tabs, scaledItem, itemInfoDisplay, prevPageButton, nextPageButton) {
            let emptyMatrix = generateEmptyMatrix(128, 128);
            super([emptyMatrix], {default: [0]}, x, y, z);
            this.inventoryGrid = inventoryGrid;
            this.tabs = tabs;
            this.currentTab = 'food';
            this.currentPage = 0;
            this.totalSlots = inventoryGrid.totalSlots;
            this.scaledItem = scaledItem;
            this.itemInfoDisplay = itemInfoDisplay;
            this.hoveredItemName;
            this.hoveredItemInfo;
            this.children = [inventoryGrid, scaledItem, tabs, itemInfoDisplay, prevPageButton, nextPageButton];
            this.startIndex = 0;
            this.gameRef = gameRef
            this.currentTabArray = this.gameRef.inventory.getItemsByType(this.currentTab);
            this.inventoryGrid.whileHover = () => {
                if(this.inventoryGrid.hoveredItem != null){
                    this.scaledItem.setItem(this.inventoryGrid.hoveredItem);
                    this.itemInfoDisplay.setItemInfo(this.inventoryGrid.hoveredItem.displayName);
                }
            }
        }

        setTab(tab){
            this.currentTab = tab;
            this.currentPage = 0;
            this.currentTabArray = this.gameRef.inventory.getItemsByType(this.currentTab);
            this.inventoryGrid.updateItemSlots(this.currentTabArray)
        }

        whileHover(){

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
            let textSprite = this.textRenderer.renderText(this.itemName, {overflowPosition: "right", position: "left"});
            return new Sprite(textSprite, this.x, this.y, this.z);
        }
    }
</script>