<script context="module">
    import { get, writable } from 'svelte/store';
    import { Inventory, createInventoryFromSave } from './Inventory.svelte';
    export class Game {
        constructor() {
            if (Game.instance) {
                return Game.instance;
            }

            this.rooms = {};
            this.currentRoom = null;
            this.localState = {};

            Game.instance = this;
            this.syncLocalToGlobalState();
            this.inventory;
            this.localUserData;
        }

        updateRooms(roomName, roomObj) {
            this.rooms[roomName] = roomObj;
        }

        setCurrentRoom(name) {
            this.currentRoom?.exit()
            inputValue.set(''); // Clear input field
            if (this.rooms[name]) {
                this.currentRoom = this.rooms[name];
                this.currentRoomName = name;
                this.currentRoom.enter();
            } else {
                console.error(`Room ${name} does not exist!`);
            }
        }

        getCurrentRoom() {
            return this.currentRoom;
        } 

        getObjectsOfCurrentRoom() {
            return this.rooms[this.currentRoomName].getObjects();
        }

        // synchronizes local state (game.localState) with global state (vscode API)
        syncLocalToGlobalState() {
            tsvscode.postMessage({ type: 'getGlobalState'});
        };
        
        // pushes new state info to global state (vscode API)
        pushToGlobalState( stateInfo ) {
            // TODO: Implement caching here later
            tsvscode.postMessage({ type: 'pushToGlobalState', value: stateInfo });
        };

        clearGlobalState() {
            tsvscode.postMessage({ type: 'clearGlobalState' });
        }

        removeItemFromGlobalState(key, itemIdToRemove) {
            console.log("Removing item from global state: ", itemIdToRemove)
            if(this.inventory.hasItemInInstance(itemIdToRemove)){
                this.inventory.removeItemByIdFromInstance(itemIdToRemove);
                tsvscode.postMessage({
                    type: 'removeItemFromState',
                    key: key,
                    itemIdToRemove: itemIdToRemove
                });
            }
        }

        // push new data to global state and synchronize local and global states
        pushToSaveData( stateInfo ){
            //pushToSaveData({ "inventory": this.inventory.serialize() })
            this.pushToGlobalState( stateInfo )
            this.syncLocalToGlobalState();
        }

        // sets local state (game.localState) to the state info (called when syncLocalToGlobalState is called)
        setLocalState( stateInfo ) {
            console.log("Setting local state: ", stateInfo)
            game.localState = stateInfo
        }

        getLocalState () {
            return game.localState
        }

        constructInventory() {
            //TODO: get from user data instead of directly in local state
            this.inventory = createInventoryFromSave(this.getLocalState().inventory || {});
            // console.log("Constructed inventory: ", this.inventory);
        }

        constructUserData(){
            this.localUserData = this.getLocalState().userData || {};
        }

        addStackableItem(itemIdString, quantity = 1) {
            this.pushToSaveData({ 
                "inventory": (this.inventory.addStackableItemToInstance(itemIdString, quantity)).serialize()
            });
        }

        addUnstackableItem(itemIdString, properties) {
            this.pushToSaveData({ 
                "inventory": (this.inventory.addUnstackableItemToInstance(itemIdString, properties)).serialize()
            });
        }

        hasStackableItems(itemIdString, quantity = 1) {
            return this.inventory.hasStackableItemsInInstance(itemIdString, quantity);
        }

        subtractStackableItem(itemIdString, quantity = 1) {
            let itemInstance = this.inventory.subtractStackableItemFromInstance(itemIdString, quantity)
            if(itemInstance) {
                console.log("subtracted item count: ", itemInstance.itemCount)
                if(itemInstance.itemCount <= 0){
                    this.removeItemFromGlobalState("inventory", itemInstance.inventoryId);
                } else {
                    this.pushToSaveData({ 
                        "inventory": itemInstance.serialize()
                    });
                }
            }
            else{
                console.error("subtractStackableItem: Item not found in inventory: ", itemIdString);
            }
        }

    }

    export const game = writable(new Game());

    export function handleGitHubLogin() {
        tsvscode.postMessage({ type: 'openOAuthURL', value: '${O_AUTH_URL}' });
    };

    export class Room {
        constructor(roomName, enterLogic = () => {}, exitLogic = () => {}, updateLogic = () => {}) {
            this.name = roomName;
            this.adjacentRooms = new Set(); // Set ensures no duplicate rooms in list
            this.objects = [];
            this.enter = enterLogic || this.enter;
            this.exit = exitLogic || this.exit;
            this.update = updateLogic || this.update;
            get(game).updateRooms(roomName, this); // Add room to game object
        }
        addAdjacentRoom(room) {
            this.adjacentRooms.add(room);
        }
        getName() {
            return this.name;
        }

        addObject(...objects) {
            //allows for multiple object parameters to be added at once
            for (let object of objects) {
                this.objects.push(object);
            }
        }

        getObjects() {
            return this.objects;
        }

        enter() {
            // Default logic when entering the room
        }

        exit() {
            // Default logic when exiting the room
        }

        update() {
            // Default room-specific logic and updates
        }
        removeObject(...objects) {
            for (let object of objects) {
                this.objects = this.objects.filter((obj) => obj !== object);
            }
        }
    }

    export class textInput {
        static instances = [];
        constructor(
            updateTextFunction,
            charMap
        ) {
            textInput.instances.push(this);
            this.updateTextFunction = updateTextFunction;
            this.charMap = charMap;
        }

        static updateAllInstances(inputText) {
            textInput.instances.forEach(instance => instance.updateTextFunction(instance.filterCharacter(inputText)));
        }

        clearAll() {
            textInput.updateAllInstances('');
            inputValue.set('');
        }
        
        filterCharacter(filterText) {
            let output = "";
            for( let i = 0; i<filterText.length; i++ ) {
                if(this.charMap.includes(filterText[i])) {
                    output = output.concat(filterText[i]);
                }
            }
            return output;
        }
    }

    export const shouldFocus = writable(false); // boolean to determine if input field should be focused
    export const inputValue = writable(''); // input field value
</script>
