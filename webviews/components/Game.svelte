<script context="module">
    import { get, writable } from 'svelte/store';
    import { NavigationButton } from './Object.svelte';
    export class Game {
        constructor() {
            if (Game.instance) {
                return Game.instance;
            }

            this.rooms = {};
            this.currentRoom = null;

            Game.instance = this;
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
    }

    export const game = writable(new Game());

    export class Room {
        constructor(roomName, enterLogic = false, exitLogic = false, updateLogic = false) {
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

                // Check if the object is a NavigationButton
                if (object instanceof NavigationButton) {
                    // If so, add the target room to the list of adjacent rooms
                    this.adjacentRooms.add(object.targetRoom);
                }
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
    }
</script>
