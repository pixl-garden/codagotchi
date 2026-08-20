<script context="module">
    import atlas from './config/atlas.json';
    export class Sprite {
        constructor(matrix, x, y, z = 0, opacity = 1, blur = 0) {
            this.matrix = matrix;
            this.x = x;
            this.y = y;
            this.z = z;
            this.opacity = opacity;
            this.blur = blur;
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

    export class TextureSprite {
        constructor(texture, x, y, z = 0){
            this.texture = texture;
            this.x = x;
            this.y = y;
            this.z = z;
        }

        getAtlas(){
            return atlas[this.texture]; 
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
