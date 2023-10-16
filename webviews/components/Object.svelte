<script context="module">
  import { Sprite, spriteReader } from './Codagotchi.svelte';
  import objectConfig from './objectConfig.json';
  export class Object {
    constructor(objectName, x, y) {
      const config = objectConfig[objectName];
      if (!config) {
        throw new Error(`No configuration found for object type: ${objectType}`);
      }

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
        // Add any hover effects or logic here
    }

    onStopHover() {
        console.log(`Stopped hovering over object of type: ${this.objectType}`);
        // Add any logic to reset hover effects here
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
</script>