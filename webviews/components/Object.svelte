<script context="module">
    import { Sprite } from './Codagotchi.svelte';
    import { spriteReader, spriteReaderFromStore } from './SpriteReader.svelte';
    import objectConfig from './objectConfig.json';
    import { game } from './Game.svelte';
    import { get } from 'svelte/store';

    export class GeneratedObject {
        constructor(sprites, states, x, y, z = 0) {
            if (!sprites) {
                console.error(`Sprite matrix not found for object at coordinates: (${x}, ${y})`);
            }
            this.sprites = sprites;
            this.spriteWidth = sprites[0][0].length;
            this.spriteHeight = sprites[0].length;
            console.log('SPRITES: ', this.sprites);
            this.states = states;
            this.currentSpriteIndex = 0;
            this.state = 'default';
            this.setCoordinate(x, y, z);
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
            console.log(`Hovered over generated object at coordinates: (${this.x}, ${this.y})`);
        }

        onStopHover() {
            console.log(`Stopped hovering over generated object at coordinates: (${this.x}, ${this.y})`);
        }

        clickAction() {
            console.log(`Clicked on generated object at coordinates: (${this.x}, ${this.y})`);
        }
    }

    export class Object extends GeneratedObject {
        constructor(objectName, x, y, z = 0) {
            const config = objectConfig[objectName];
            console.log(config);
            if (!config) {
                throw new Error(`No configuration found for object type: ${objectName}`);
            }

            for (const state in config.states) {
                config.states[state] = processStateFrames(config.states[state]);
            }

            function processStateFrames(frames) {
                if (frames.length === 3 && frames[1] === '...') {
                    const start = frames[0];
                    const end = frames[2];
                    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
                }
                return frames;
            }

            const spriteMatrix = spriteReaderFromStore(config.spriteWidth, config.spriteHeight, config.spriteSheet);
            console.log('SPRITE MATRIX: ', spriteMatrix);
            super(spriteMatrix, config.states, x, y, z);
            this.spriteWidth = config.spriteWidth;
            this.spriteHeight = config.spriteHeight;
            this.objectType = objectName;
            this.config = config;
        }

        onHover() {
            console.log(`Hovered over object of type: ${this.objectType}`);
        }

        onStopHover() {
            console.log(`Stopped hovering over object of type: ${this.objectType}`);
        }
    }

    export class Button extends Object {
        constructor(objectName, x, y, action, z = 0) {
            super(objectName, x, y, z);
            this.action = action || (() => {});
        }

        clickAction() {
            this.action();
        }

        onHover() {
            console.log('Button is hovered!');
            this.updateState('hovered');
            // Add any button-specific hover effects or logic here
        }

        onStopHover() {
            console.log('Button hover stopped!');
            this.updateState('default');
            // Reset any button-specific hover effects here
        }
    }
    export class NavigationButton extends Button {
        constructor(objectName, x, y, targetRoom, z = 0) {
            super(
                objectName,
                x,
                y,
                () => {
                    // Set the current room in the game object to the target room
                    get(game).setCurrentRoom(targetRoom);
                },
                z,
            );
        }
    }
</script>
