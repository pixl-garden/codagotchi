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
            this.timeoutTime = 10000; // 10 seconds
            this.handleInactivity = this.handleInactivity.bind(this);
            this.resetActivityTimeout = this.resetActivityTimeout.bind(this);
            this.timeoutHandler = setTimeout(this.handleInactivity, this.timeoutTime);
            this.isActive = false;
            this.inbox;

            this.pendingUpdates = {
                inventory: {},
                xp: 0,
                pet: {},
                customization: {}
            };
            this.startPeriodicSync();
        }

        //function to call when player goes inactive
        handleInactivity() {
            console.log("Inactivity timeout reached.") 
            this.currentRoom?.onInactivity();
            this.isActive = false;
        }

        resetActivityTimeout() {
            if(!this.isActive){
                this.currentRoom.onActivity();
            }
            console.log("Resetting inactivity timeout.")
            this.isActive = true;
            clearTimeout(this.timeoutHandler);
            this.timeoutHandler = setTimeout(this.handleInactivity, this.timeoutTime);
        }

        updateRooms(roomName, roomObj) {
            this.rooms[roomName] = roomObj;
        }

        setCurrentRoom(name) {
            this.currentRoom?.exit()
            if(this.currentRoom && this.currentRoom.clearTextOnExit){
                inputValue.set('');
            }
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
            tsvscode.postMessage({ type: 'syncLocalToGlobalState'});
        };
        
        // updates global state with merging (also syncs local state to global state after global state is updated)
        updateGlobalState( stateInfo ) {
            // TODO: Implement caching here later
            tsvscode.postMessage({ type: 'updateGlobalState', value: stateInfo });
        };

        clearGlobalState() {
            tsvscode.postMessage({ type: 'clearGlobalState' });
        }

        // removes from global state (also syncs local state to global state after global state is updated)
        // supports nested itemIds (e.g. "friendRequest.1234")
        removeItemFromGlobalState(key, itemIdToRemove) {
            // if(this.inventory.hasItemInInstance(itemIdToRemove)){
            //     this.inventory.removeItemByIdFromInstance(itemIdToRemove);
            //     tsvscode.postMessage({
            //         type: 'removeItemFromState',
            //         key: key,
            //         itemIdToRemove: itemIdToRemove
            //     });
            // }
            tsvscode.postMessage({
                    type: 'removeItemFromState',
                    key: key,
                    itemIdToRemove: itemIdToRemove
                });
        }

        // sets local state (game.localState) to the state info (called when syncLocalToGlobalState is called)
        setLocalState( stateInfo ) {
            // console.log("Setting local state: ", stateInfo)
            game.localState = stateInfo
        }

        getLocalState () {
            console.log("Getting local state: ", game.localState);
            return game.localState
        }

        constructInventory() {
            //TODO: get from user data instead of directly in local state
            this.inventory = createInventoryFromSave(this.getLocalState().inventory || {});
        }

        retrieveInbox() {
            tsvscode.postMessage({ type: 'retrieveInbox' });
        }

        // for refreshing inbox after receiving new data since its async (should could be done cleaner, but this works for now)
        refreshInbox() {
            //this.syncLocalToGlobalState() 
            //console.log("local state: ", this.getLocalState());
            this.inbox = new Inbox(this.getLocalState().inbox || {});
            return this.inbox
        }

        async initializeWithCache(cachedUserInbox) {
            console.log('Initializing game with cached userInbox:', cachedUserInbox);
            if (cachedUserInbox) {
                this.updateGlobalState({ userInbox: cachedUserInbox });
            }
            console.log("Global state after initializing with cache: ", game);
        }

        constructUserData(){
            this.localUserData = this.getLocalState().userData || {};
        }

        addStackableItem(itemIdString, quantity = 1) {
            this.updateGlobalState({ 
                "inventory": (this.inventory.addStackableItemToInstance(itemIdString, quantity)).serialize()
            });
            this.pendingUpdates.inventory[itemIdString] = (this.pendingUpdates.inventory[itemIdString] || 0) + quantity;
        }

        addUnstackableItem(itemIdString, properties) {
            this.updateGlobalState({ 
                "inventory": (this.inventory.addUnstackableItemToInstance(itemIdString, properties)).serialize()
            });
            // TODO: handle the properties of unstackable items
            this.pendingUpdates.inventory[itemIdString] = (this.pendingUpdates.inventory[itemIdString] || 0) + 1;
        }

        hasStackableItems(itemIdString, quantity = 1) {
            return this.inventory.hasStackableItemsInInstance(itemIdString, quantity);
        }

        subtractStackableItem(itemIdString, quantity = 1) {
            let itemInstance = this.inventory.subtractStackableItemFromInstance(itemIdString, quantity);
            if(itemInstance) {
                if(itemInstance.itemCount <= 0){
                    this.removeItemFromGlobalState("inventory", itemInstance.inventoryId);
                } else {
                    this.updateGlobalState({ 
                        "inventory": itemInstance.serialize()
                    });
                }
                this.pendingUpdates.inventory[itemIdString] = (this.pendingUpdates.inventory[itemIdString] || 0) - quantity;
            }
        }

        syncUserData() {
            console.log("Sending user data updates to server...");
            const updates = {
                inventoryUpdates: this.generateInventoryUpdates(),
                xp: this.pendingUpdates.xp,
                // petUpdates: this.generatePetUpdates(),
                // customizationUpdates: this.generateCustomizationUpdates()
            };

            if (Object.keys(updates.inventoryUpdates).length > 0 || 
                updates.xp !== 0 || 
                Object.keys(updates.petUpdates).length > 0 || 
                Object.keys(updates.customizationUpdates).length > 0) {

                console.log("userData updates:", updates);
                
                tsvscode.postMessage({ type: 'syncUserData', userData: updates });
                
                // Clear pending updates after sending
                this.pendingUpdates = {
                    inventory: {},
                    xp: 0,
                    pet: {},
                    customization: {}
                };
            }
        }

        generateInventoryUpdates() {
            return Object.entries(this.pendingUpdates.inventory)
                .filter(([_, amount]) => amount !== 0)
                .map(([itemId, amount]) => ({ itemId, amount }));
        }

        generatePetUpdates() {
            // Implement this method based on your pet data structure
            return {
                hunger: this.pet.hunger,
                happiness: this.pet.happiness,
                // Add other pet-related fields
            };
        }

        generateCustomizationUpdates() {
            // Implement this method based on your customization data structure
            return {
                background: this.customization.background,
                petClothing: this.customization.petClothing,
                // Add other customization-related fields
            };
        }

        // Add a method to start periodic syncing
        startPeriodicSync(interval = 60000) { // 60000 ms = 1 minute
            setInterval(() => {
                if (Object.keys(this.pendingUpdates.inventory).length > 0) {
                    this.syncUserData();
                }
            }, interval);
        }
    }

    class Inbox {
        constructor(inboxJSON) {
            this.friendRequests = inboxJSON.friendRequests || {};
            this.friends = inboxJSON.friends || {};
            this.postcards = inboxJSON.postcards || {};
        }

        removeRequest(requestID) {
            delete this.friendRequests[requestID];
        }
    }

    export const game = writable(new Game());

    export function handleGitHubLogin() {
        tsvscode.postMessage({ type: 'openOAuthURL', value: '${O_AUTH_URL}' });
    };

    export class Room {
        constructor(roomName, enterLogic = () => {}, exitLogic = () => {}, updateLogic = () => {}, onActivity = () => {},   
                    onInactivity = () => {}) {
            this.name = roomName;
            this.adjacentRooms = new Set(); // Set ensures no duplicate rooms in list
            this.objects = [];
            this.enter = enterLogic || this.enter;
            this.exit = exitLogic || this.exit;
            this.update = updateLogic || this.update;
            this.onActivity = onActivity || this.onActivity;
            this.onInactivity = onInactivity || this.onInactivity;
            this.clearTextOnExit = true;
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
        
        updateObject(oldObject, newObject) {
            const index = this.objects.indexOf(oldObject);
            if (index !== -1) { // Check if the oldObject is actually found
                this.objects[index] = newObject;
            } else {
                // console.log('Object not found in array.');
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

        onActivity() {
            // Default logic when player is active
        }

        onInactivity() {
            // Default logic when player is inactive
        }

        removeObject(...objects) {
            for (let object of objects) {
                this.objects = this.objects.filter((obj) => obj !== object);
            }
        }
    }

    // Pass a reference of the class as a parameter, when instantiating the class,
    //  call the objects method (setUserText) to update the object's text
    // ex: this.textInput = new textInputReference((text) => this.setUserText(text), textRenderer.charMappingString);

    // To focus the text input, set the shouldFocus store to true
    // ex: 
    // if(get(shouldFocus) === false){
    //     shouldFocus.set(true);
    // }
    // else {
    //     shouldFocus.set(false);
    // }
    // See generateTextInputBar in objectGenerators for reference
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
