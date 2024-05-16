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
        }

        updateRooms(roomName, roomObj) {
            this.rooms[roomName] = roomObj;
        }

        setCurrentRoom(name) {
            if (this.rooms[name]) {
                this.currentRoom = this.rooms[name];
                this.currentRoomName = name;
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
            tsvscode.postMessage({ type: 'pushToGlobalState', value: stateInfo });
        };

        clearGlobalState() {
            tsvscode.postMessage({ type: 'clearGlobalState' });
        }

        // push new data to global state and synchronize local and global states
        pushToSaveData( stateInfo ){
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
            this.inventory = createInventoryFromSave(this.getLocalState().inventory || {});
            // console.log("Constructed inventory: ", this.inventory);
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

    }

    // export function setItem(serializedItem) {
    //     let currentState = getLocalState();
    //     let inventory = currentState.inventory || [];
    //     const itemIndex = inventory.findIndex(item => item.itemName === serializedItem.itemName);

    //     if (itemIndex > -1) {
    //         // Update existing item
    //         inventory[itemIndex] = serializedItem;
    //     } else {
    //         // Add new item
    //         inventory.push(serializedItem);
    //     }

    //     setGlobalState({ "inventory": inventory });
    //     getLocalState();
    // }

    // export function removeItem(itemName){
    //     let currentState = getLocalState();
    //     let inventory = currentState.inventory || [];
    //     inventory = inventory.filter(item => item.itemName !== itemName);

    //     setGlobalState({ ...currentState, inventory });
    //     getLocalState();
    // }

    export const game = writable(new Game());

    export function handleGitHubLogin() {
        tsvscode.postMessage({ type: 'openOAuthURL', value: '${O_AUTH_URL}' });
    };

    export class Room {
        constructor(roomName, enterLogic = false, exitLogic = false, updateLogic = () => {}) {
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
            this.update();
        }
        removeObject(...objects) {
            for (let object of objects) {
                this.objects = this.objects.filter((obj) => obj !== object);
            }
        }
    }

    export const shouldFocus = writable(false);
    export const inputValue = writable('');
</script>
