<script context="module">
    export class Object {
      constructor(sprites, x, y) {
        this.sprites = sprites;
        this.x = x;
        this.y = y;
      }

      setCoordinate(newX, newY) {
        this.x = newX;
        this.y = newY;
      }
    }
</script>