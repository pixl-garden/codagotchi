<script context="module">
    import { get, writable } from 'svelte/store';
    class Game {
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
    constructor(roomName, enterLogic=false, exitLogic=false, updateLogic=false) {
        this.name = roomName;
        this.adjacentRooms = {};
        this.objects = [];
        this.enter = enterLogic || this.enter;
        this.exit = exitLogic || this.exit;
        this.update = updateLogic || this.update;
        get(game).updateRooms(roomName, this);
    }
    addAdjacentRoom(room) {
        this.adjacentRooms = room;
    }
    getName() {
        return this.name;
    }

    addObject(object) {
        this.objects.push(object);
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