<script context="module">
    import atlas from './config/atlas.json';
    import { runtimeAtlas, registerMatricesToAtlas} from './ScreenManager.svelte';
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

    export class StaticSprite {
        constructor(textureId, x, y, z = 0){
            this.textureId = textureId;
            this.x = x;
            this.y = y;
            this.z = z;
            this.atlasType = 0; // static
        }

        getAtlas(){
            return atlas[this.textureId]; 
        }
    }

    let runtimeSpriteCounter = 0;

    export class RuntimeSprite {
        constructor(matrices, x, y, z = 0){
            this.textureId = `runtime_${++runtimeSpriteCounter}`; //increment id
            this.x = x;
            this.y = y;
            this.z = z;
            this.atlasType = 1; // runtime
            registerMatricesToAtlas(this.textureId, matrices);
        }

        getAtlas() {
            return runtimeAtlas[this.textureId]; 
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
