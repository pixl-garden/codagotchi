<script context="module">
    export class Sprite {
      constructor(matrix, x, y, z = 0) {
        this.matrix = matrix;
        this.x = x;
        this.y = y;
        this.z = z;
      }

      getZ() {
        return this.z;
      }
  
      getPixelValueAt(x, y) {
        return this.matrix[y][x];
      }

      getMatrix() {
        return this.matrix;
      }
  
      setCoordinate(newX, newY, newZ) {
        this.x = newX;
        this.y = newY;
        this.z = newZ;
      }
    }
</script>
<!-- 
    Example usage:
    let sprite = new Sprite(
      [
        [1, 0, 1],
        [0, 1, 0],
        [1, 0, 1]
      ],
      5,
      5
    );
-->