<script context="module">
    import { get, writable } from 'svelte/store';
    import { onAuthStateChanged } from 'firebase/auth';
    import { auth } from '../firebase/firebaseConfig.js';
    import { listenToUserPublicData } from '../firebase/firebaseClientHelpers.js'; 
    export class Game {
        constructor() {
            if (Game.instance) {
                return Game.instance;
            }

            this.rooms = {};
            this.currentRoom = null;
            this.localState = {};

            Game.instance = this;
            this.initializeUser();
            this.getGlobalState();
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

        getGlobalState() {
            tsvscode.postMessage({ type: 'getGlobalState'});
        };

        setGlobalState( stateInfo ) {
            tsvscode.postMessage({ type: 'setGlobalState', value: stateInfo });
        };

        setLocalState( stateInfo ) {
            game.localState = stateInfo
        }

        getLocalState () {
            return game.localState
        }

        initializeUser() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                listenToUserPublicData(user.uid, (userData) => {
                    this.setLocalState({ ...this.localState, user: userData });
                    user.set(userData);
                });
            } else {
                this.setLocalState({ ...this.localState, user: null });
                user.set(null); 
            }
        });
      }
    }

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
