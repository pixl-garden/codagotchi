<script context="module">
    import { GeneratedObject, objectGrid } from "./Object.svelte";
    import itemConfig from './itemConfig.json';
    import { spriteReaderFromStore } from "./SpriteReader.svelte";
    import { setGlobalState, getLocalState } from "./localSave.svelte";
    const ITEMWIDTH = 32;

    export class Item extends GeneratedObject {
        constructor( itemName ){
            // maybe add an item count parameter?
            const config = itemConfig[itemName];
            if( !config ) throw new Error(`Item ${itemName} not found in itemConfig.json`);
            const objState = { default: [config.spriteIndex] }
            const spriteMatrix = spriteReaderFromStore(ITEMWIDTH, ITEMWIDTH, config.spriteSheet);
            console.log("spriteMatrix", spriteMatrix, "objState", objState, "config", config, "itemName");
            super(spriteMatrix, objState, 0, 0, 0);
            this.itemName = itemName;
            this.stackable = false;
            this.itemCount = 1;
            this.spriteHeight = ITEMWIDTH;
            this.spriteWidth = ITEMWIDTH;
            this.config = config;
            this.displayName = config.displayName;
            this.description = config.description;
        }
        getName(){
            return this.displayName;
        }
        getDescription(){
            return this.description;
        }
        //base serialization for backend
        serialize(){
            return { 
                itemName: this.itemName
            };
        }
    }

    export class Tool extends Item {
        constructor(itemName, enchantments = []) {
            super(itemName);
            this.enchantments = enchantments;
            this.stackable = false;
        }

        serialize() {
            return {
                itemName: this.itemName,
                itemType: 'tool',
                enchantments: this.enchantments,
            };
        }
    }

    export class Food extends Item {
        constructor(name, itemCount = 1) {
            super(name);
            this.stackable = true;
            this.itemCount = itemCount;
        }

        serialize() {
            return {
                itemName: this.itemName,
                itemType: 'food',
                itemCount: this.itemCount
            };
        }
    }

    export class Inventory {
        constructor() {
            this.items = new Map(); // Stores item name -> { count: Number, instances: Array }
        }

        addItem(item) {
            if (!this.items.has(item.itemName)) {
                this.items.set(item.itemName, { count: 0, instances: [] });
            }
            const entry = this.items.get(item.itemName);

            if (item.stackable) {
                entry.count += item.itemCount || 1;
            } else {
                // Determine the first available ID for this item type
                const ids = entry.instances.map(inst => inst.id).sort((a, b) => a - b);
                let newId = 0;
                for (let i = 0; i < ids.length; i++) {
                    if (ids[i] > i) {
                        newId = i;
                        break;
                    }
                    newId = i + 1; // Continue to next possible ID
                }
                item.id = newId; // Assign the first available ID
                // Insert the item at the correct position based on its ID
                entry.instances.splice(newId, 0, item);
            }
        }

        //Attempt to remove an item from the inventory
        removeItem(itemName, quantity = 1) {
            if (this.items.has(itemName)) {
                let entry = this.items.get(itemName);
                if (entry.count >= quantity) {
                    entry.count -= quantity;
                    if (entry.count === 0 && entry.instances.length === 0) {
                        this.items.delete(itemName);
                    }
                    return true;
                }
            }
            return false; // Item not found or insufficient quantity
        }

        // Attempt to remove a set of items (for crafting, etc.)
        // Returns true and removes items if all are available, otherwise returns false
        removeItems(itemList) {
            // Check availability first
            for (const { itemName, quantity } of itemList) {
                if (!this.hasItem(itemName, quantity)) {
                    return false; // Early return if any item is not available in required quantity
                }
            }
            // If all items are available, remove them
            itemList.forEach(({ itemName, quantity }) => this.removeItem(itemName, quantity));
            return true;
        }

        removeNonStackableItemById(itemName, itemId) {
            if (this.items.has(itemName)) {
                const entry = this.items.get(itemName);
                const index = entry.instances.findIndex(item => item.id === itemId);
                if (index > -1) {
                    entry.instances.splice(index, 1);
                    return true; // Item found and removed
                }
            }
            return false; // Item not found
        }

        hasItem(itemName, quantity = 1) {
            if (this.items.has(itemName)) {
                let entry = this.items.get(itemName);
                return entry.count >= quantity || entry.instances.length >= quantity;
            }
            return false;
        }

        serialize() {
            let serializedInventory = {};
            this.items.forEach((entry, itemName) => {
                serializedInventory[itemName] = {
                    count: entry.count,
                    instances: entry.instances.map(instance => instance.serialize())
                };
            });
            return JSON.stringify(serializedInventory);
        }
    }

    function reconstructItem(itemData) {
        const config = itemConfig[itemData.itemName];
        if (!config) throw new Error(`Configuration for item ${itemData.name} not found`);

        switch (config.type) {
            case 'tool':
                return new Tool(itemData.itemName, itemData.enchantments);
            case 'food':
                return new Food(itemData.itemName, itemData.itemCount);
            default:
                throw new Error(`Unknown item type for ${itemData.name}`);
        }
    }

    export function createInventoryFromSave(savedData) {
        const inventory = new Inventory();
        const data = JSON.parse(savedData);

        // Reconstruct items with unique properties
        if (data.items) {
            for (const itemData of data.items) {
                const item = reconstructItem(itemData);
                inventory.items.push(item); // Directly push reconstructed items
            }
        }

        // Reconstruct simple stackable items' counts
        if (data.counts) {
            for (const { name, itemCount } of data.counts) {
                inventory.itemCounts.set(name, itemCount);
            }
        }

        return inventory;
    }

    export function setItem(serializedItem) {
        let currentState = getLocalState();
        let inventory = currentState.inventory || [];
        const itemIndex = inventory.findIndex(item => item.itemName === serializedItem.itemName);

        if (itemIndex > -1) {
            // Update existing item
            inventory[itemIndex] = serializedItem;
        } else {
            // Add new item
            inventory.push(serializedItem);
        }

        setGlobalState({ "inventory": inventory });
        getLocalState();
    }

    export function removeItem(itemName){
        let currentState = getLocalState();
        let inventory = currentState.inventory || [];
        inventory = inventory.filter(item => item.itemName !== itemName);

        setGlobalState({ ...currentState, inventory });
        getLocalState();
    }


    export class inventoryGrid extends objectGrid{
        constructor(columns, columnSpacing, rows, rowSpacing, x, y, z, items, totalSlots, itemSlotConstructor, toolTip){
            let constructedItems = constructInventoryObjects(itemSlotConstructor, items, totalSlots);
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
            function constructInventoryObjects(createSlotInstance, items, totalSlots) {
                let inventoryGrid = [];
                for(let i = 0; i < totalSlots; i++) {
                    let item = items[i];
                    let slotInstance = createSlotInstance(); // Use the factory function to create a new instance
                    // console.log("Slot Instance: ", slotInstance); // Check the instance
                    console.log(slotInstance instanceof GeneratedObject);
                    if(item) {
                        // console.log("Item: ", item); // Check the item (should be a GeneratedObject instance
                        slotInstance.addChild(item);
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