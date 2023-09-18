<script context="module">
    export class Sprite {
      constructor(matrix, x, y) {
        this.matrix = matrix;
        this.x = x;
        this.y = y;
      }
  
      getPixelValueAt(x, y) {
        return this.matrix[y][x];
      }

      getMatrix() {
        return this.matrix;
      }
  
      setCoordinate(newX, newY) {
        this.x = newX;
        this.y = newY;
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