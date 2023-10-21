<script context="module">
  import { Sprite, spriteReader } from './Codagotchi.svelte';
  import objectConfig from './objectConfig.json';
  import { game } from './Game.svelte';
  import { get } from 'svelte/store';
    import { EnvironmentVariableMutatorType, TreeItemCheckboxState } from 'vscode';
  export class Object {
    constructor(objectName, x, y) {
    const config = objectConfig[objectName];
    if (!config) {
        throw new Error(`No configuration found for object type: ${objectType}`);
    }

    // Process states
    for (const state in config.states) {
        config.states[state] = processStateFrames(config.states[state]);
    }

    function processStateFrames(frames) {
        if (frames.length === 3 && frames[1] === "...") {
            const start = frames[0];
            const end = frames[2];
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
        }
        return frames;
    }

    this.state = "default";
    this.objectType = objectName;
    this.config = config;
    this.sprites = spriteReader(config.spriteWidth, config.spriteHeight, config.spriteSheet);
    this.currentSpriteIndex = 0;
    this.setCoordinate(x, y);
  }

    updateState(newState) {
      if (this.config.states[newState]) {
        this.state = newState;
        this.currentSpriteIndex = this.config.states[newState][0]; // set to the first sprite of the new state
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

    setCoordinate(newX, newY) {
      this.x = newX;
      this.y = newY;
    }

    getSprite() {
      return new Sprite(this.sprites[this.currentSpriteIndex], this.x, this.y);
    }

    onHover() {
        console.log(`Hovered over object of type: ${this.objectType}`);
    }

    onStopHover() {
        console.log(`Stopped hovering over object of type: ${this.objectType}`); 
    }
  }

  export class Button extends Object {
    constructor(objectName, x, y, action) {
      super(objectName, x, y);
      this.action = action || (() => {});
    }

    clickAction() {
      this.action();
    }

    onHover() {
        console.log("Button is hovered!");
        this.updateState("hovered")
        // Add any button-specific hover effects or logic here
    }

    onStopHover() {
        console.log("Button hover stopped!");
        this.updateState("default")
        // Reset any button-specific hover effects here
    }
  }
  export class NavigationButton extends Button {
    constructor(objectName, x, y, targetRoom) {
        super(objectName, x, y, () => {
            // Set the current room in the game object to the target room
            get(game).setCurrentRoom(targetRoom);
        });
    }
  }

  export class Pet extends Object {
    constructor( petName, x, y ) {
      super( petName, x, y ) { 
        this.evolution;
        this.age;
        this.currentRoom;
        this.status;
        this.width;
        this.height;
        this.hat = null;
        this.happiness = 100;
        this.energy = 100;
        this.isAlive = true;
        get(game).setCurrentRoom(targetRoom);
      }
      feedPet() {
        // 
      }

      playWithPet() {

      }

      isAlive() {
        return this.isAlive;
      }

      performDance() {

      }

      equipItem() {

      }

      performEmote() {

      }

      update() {
        // Default room-specific logic and updates

      }



    }

  }
</script>