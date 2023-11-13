<script context="module">
    import { Sprite } from './Codagotchi.svelte';
    import { spriteReader, spriteReaderFromStore } from './SpriteReader.svelte';
    import objectConfig from './objectConfig.json';
    import petConfig from './petConfig.json';
    import { game } from './Game.svelte';
    import { get } from 'svelte/store';

    export class GeneratedObject {
        constructor(sprites, states, x, y, z = 0, actionOnClick = null) {
            if (!sprites) {
                console.error(`Sprite matrix not found for object with states: ${states}`);
            }
            this.sprites = sprites;
            this.spriteWidth = sprites[0][0].length;
            this.spriteHeight = sprites[0].length;
            this.states = states;
            this.currentSpriteIndex = 0;
            this.state = 'default';
            this.setCoordinate(x, y, z);
            this.actionOnClick = actionOnClick;
        }

        setCoordinate(newX, newY, newZ) {
            this.x = newX;
            this.y = newY;
            this.z = newZ;
        }

        getSprite() {
            return new Sprite(this.sprites[this.currentSpriteIndex], this.x, this.y);
        }

        updateState(newState) {
            if (this.states[newState]) {
                this.state = newState;
                this.currentSpriteIndex = this.states[newState][0]; // set to the first sprite of the new state
            }
        }

        nextFrame() {
            const stateSprites = this.config.states[this.state];
            this.currentSpriteIndex++;

            // If the index goes beyond the number of sprites for the current state, wrap around
            if (this.currentSpriteIndex >= stateSprites.length) {
                this.currentSpriteIndex = this.config.states[this.state][0];
            }
        }

        onHover() {
            // console.log(`Hovered over generated object at coordinates: (${this.x}, ${this.y})`);
        }

        onStopHover() {
            // console.log(`Stopped hovering over generated object at coordinates: (${this.x}, ${this.y})`);
        }

        clickAction() {
            this.actionOnClick();
        }
    }

    function processStateFrames(frames) {
        if (frames.length === 3 && frames[1] === '...') {
            const start = frames[0];
            const end = frames[2];
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
        }
        return frames;
    }

    export class Pet extends GeneratedObject {
    constructor(petType, x, y, z) {
        const config = petConfig[petType];
        if (!config) {
            throw new Error(`No configuration found for pet type: ${petType}`);
        }

        
        const spriteMatrix = spriteReaderFromStore(config.spriteWidth, config.spriteHeight, config.spriteSheet);
        super(spriteMatrix, config.states, x, y, z, () => {
            this.queueState('idle-animation');
            this.queueState('idle-animation');
            this.queueState('default');
        });
        
        this.processStates(config.states);
        this.currentStateFrames = [];
        this.currentGroupState = null;
        this.stateQueue = [];
        this.isStateCompleted = false;
        this.updateState('default');
    }

    processStates(states) {
        for (const key in states) {
            if (typeof states[key] === 'object' && !Array.isArray(states[key])) {
                this.processStatesWithOdds(states[key]);
            } else {
                states[key] = processStateFrames(states[key]);
            }
        }
    }

    processStatesWithOdds(states) {
        for (const stateName in states) {
            let state = states[stateName];
            if (typeof state === 'object' && state.odds !== undefined) {
                state.frames = processStateFrames(state.frames);
            }
        }
    }

    selectRandomStateInGroup(groupName) {
        const stateGroup = this.states[groupName];
        if (!stateGroup) {
            console.error(`State group '${groupName}' not found.`);
            return null;
        }

        let weightedList = [];

        for (const stateName in stateGroup) {
            const state = stateGroup[stateName];
            for (let i = 0; i < state.odds; i++) {
                weightedList.push({ stateName, frames: state.frames });
            }
        }

        const randomIndex = Math.floor(Math.random() * weightedList.length);
        return weightedList[randomIndex];
    }

    updateState(newState) {
        if (typeof this.states[newState] === 'object' && !Array.isArray(this.states[newState])) {
            const randomState = this.selectRandomStateInGroup(newState);
            if (randomState) {
                this.currentGroupState = randomState.stateName;
                this.currentStateFrames = randomState.frames;
            }
        } else if (this.states[newState]) {
            this.currentGroupState = null;
            this.currentStateFrames = this.states[newState];
        } else {
            console.error(`State '${newState}' not found.`);
            return;
        }

        this.state = newState;
        this.currentSpriteIndex = 0;
        this.isStateCompleted = false;
    }

    nextFrame() {
        if (this.currentStateFrames.length === 0) {
            console.error('No frames available for the current state.');
            return;
        }

        this.currentSpriteIndex++;

        if (this.currentSpriteIndex >= this.currentStateFrames.length) {
            this.currentSpriteIndex = 0; // Reset to the first frame
            this.isStateCompleted = true;
            this.nextState();
        }
    }

    queueState(state) {
        this.stateQueue.push(state);
        if (!this.state || this.isStateCompleted) {
            this.nextState();
        }
    }

    nextState() {
        if (this.stateQueue.length > 0) {
            const nextState = this.stateQueue.shift();
            this.updateState(nextState);
        }
    }
}


    export class Object extends GeneratedObject {
        constructor(objectName, x, y, z = 0, actionOnClick = null) {
            const config = objectConfig[objectName];
            // console.log(config);
            if (!config) {
                throw new Error(`No configuration found for object type: ${objectName}`);
            }

            for (const state in config.states) {
                config.states[state] = processStateFrames(config.states[state]);
            }

            const spriteMatrix = spriteReaderFromStore(config.spriteWidth, config.spriteHeight, config.spriteSheet);
            // console.log('SPRITE MATRIX: ', spriteMatrix);
            super(spriteMatrix, config.states, x, y, z, actionOnClick);
            this.spriteWidth = config.spriteWidth;
            this.spriteHeight = config.spriteHeight;
            this.objectType = objectName;
            this.config = config;
        }

        onHover() {
            // console.log(`Hovered over object of type: ${this.objectType}`);
        }

        onStopHover() {
            // console.log(`Stopped hovering over object of type: ${this.objectType}`);
        }
    }

    export class Button extends Object {
        constructor(objectName, x, y, actionOnClick, z = 0) {
            super(objectName, x, y, z, actionOnClick);
            this.action = actionOnClick || (() => {});
        }

        onHover() {
            // console.log('Button is hovered!');
            this.updateState('hovered');
            // Add any button-specific hover effects or logic here
        }

        onStopHover() {
            // console.log('Button hover stopped!');
            this.updateState('default');
            // Reset any button-specific hover effects here
        }
    }
    export class NavigationButton extends Button {
        constructor(objectName, x, y, targetRoom, z = 0) {
            super(
                objectName, x, y, () => {
                    // Set the current room in the game object to the target room
                    get(game).setCurrentRoom(targetRoom); 
                }, z
            );
        }
    }
</script>
