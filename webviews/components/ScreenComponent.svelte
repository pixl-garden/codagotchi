<script context="module">  
    export function generateScreen(sprites, xSize, ySize) {
      // Initialize an empty screen with the given size
      let screen = Array(ySize).fill().map(() => Array(xSize).fill(0));
  
      sprites.forEach(sprite => {
        let spriteMatrix = sprite.getMatrix();
        for (let y = 0; y < spriteMatrix.length; y++) {
          for (let x = 0; x < spriteMatrix[y].length; x++) {
            // Ensure we're within the bounds of the screen
            if (sprite.y + y < ySize && sprite.x + x < xSize) {
              screen[sprite.x + x][sprite.y + y] |= spriteMatrix[y][x];
            }
          }
        }
      });
  
      return screen;
    }
  </script>