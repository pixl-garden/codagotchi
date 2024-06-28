<script context="module">
    const GRIDWIDTH = 128;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const pixelSize = Math.min(width / GRIDWIDTH, height / GRIDWIDTH);
    let screenWidth = GRIDWIDTH * pixelSize;
    let padding = 0;

    export function generateScreen(sprites, xSize, ySize) {
        // Initialize an empty screen with the given size
        let screen = Array(ySize)
            .fill()
            .map(() => Array(xSize).fill('transparent'));

        sprites.sort((a, b) => a.getZ() - b.getZ());

        sprites.forEach((sprite) => {
            let spriteMatrix = sprite.getMatrix();
            // Calculate the bounds for y and x within the screen and sprite matrix
            if (spriteMatrix !== undefined || spriteMatrix !== null ){
                let spriteMatrixYLen = spriteMatrix ? spriteMatrix.length : 0;
                let spriteMatrixXLen = spriteMatrix ? spriteMatrix[0].length : 0;
                let startY = Math.max(0, sprite.y);
                let endY = Math.min(ySize, sprite.y + spriteMatrixYLen);
                let startX = Math.max(0, sprite.x);
                let endX = Math.min(xSize, sprite.x + spriteMatrixXLen);
                
                for (let y = startY; y < endY; y++) {
                    let matrixY = y - sprite.y;
                    for (let x = startX; x < endX; x++) {
                        let matrixX = x - sprite.x;
                        if (spriteMatrix[matrixY][matrixX] !== 'transparent') {
                            screen[y][x] = spriteMatrix[matrixY][matrixX]; // Swap x and y here
                        }
                    }
                }
            }
            });

        return screen;
    }

    export function handleResize() {
        console.log("handleResize")
        updateDimensions();
        updateStyles();
    }

    export function getPadding() {
        return padding;
    }

    export function getPixelSize() {
        return pixelSize;
    }

    function updateDimensions() {
        width = window.innerWidth;
        height = window.innerHeight;
        // pixelSize = Math.min(width / GRIDWIDTH, height / GRIDWIDTH);
        // screenWidth = Math.floor(GRIDWIDTH * pixelSize);
        screenWidth = width;
        // console.log("width: " + width + " height: " + height + " pixelSize: " + pixelSize + " screenWidth: " + screenWidth);
    }

    function updateStyles() {
        // document.documentElement.style.setProperty('--container-padding', `${padding}px`);
        document.documentElement.style.setProperty('--pixel-size', `${pixelSize}px`);
        document.documentElement.style.setProperty('--screen-width', `${screenWidth}px`);
    }
</script>
