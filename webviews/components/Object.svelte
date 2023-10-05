<script context="module">
  import { Sprite, spriteReader } from './Codagotchi.svelte';
  export class Object {
    constructor(objectName, spriteSheet) {
      const config = objectConfig[objectName];
      if (!config) {
        throw new Error(`No configuration found for object type: ${objectType}`);
      }

      this.state = "hidden"; 
      this.objectType = objectName;
      this.config = config;
      this.sprites = spriteReader(config.spriteWidth, config.spriteHeight, spriteSheet);
      this.currentSpriteIndex = 0;
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
      const stateSprites = this.config.states[this.state];
      return Sprite(stateSprites[this.currentSpriteIndex], this.x, this.y);
    }
  }
</script>