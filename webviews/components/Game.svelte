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
        constructor(roomName) {
            this.name = roomName;
            this.objects = [];
            get(game).updateRooms(roomName, this); // Automatically add the room to the game
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
    }
</script>