<script context="module">  
    const GRIDWIDTH = 64;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let pixelSize = Math.floor(width / GRIDWIDTH);
    let screenWidth = GRIDWIDTH * pixelSize;
    let padding;

    export function generateScreen(sprites, xSize, ySize) {
        // Initialize an empty screen with the given size
        let screen = Array(ySize).fill().map(() => Array(xSize).fill("transparent"));

        sprites.sort((a, b) => a.getZ() - b.getZ());

        sprites.forEach(sprite => {
            let spriteMatrix = sprite.getMatrix();
            // Calculate the bounds for y and x within the screen and sprite matrix
            let startY = Math.max(0, sprite.y);
            let endY = Math.min(ySize, sprite.y + spriteMatrix.length);
            let startX = Math.max(0, sprite.x);
            let endX = Math.min(xSize, sprite.x + spriteMatrix[0].length);

            for (let y = startY; y < endY; y++) {
                let matrixY = y - sprite.y;
                for (let x = startX; x < endX; x++) {
                    let matrixX = x - sprite.x;
                    if (spriteMatrix[matrixY][matrixX] !== "transparent") {
                        screen[x][y] = spriteMatrix[matrixY][matrixX];  // Swap x and y here
                    }
                }
            }
        });

        return screen;
    }

    export function handleResize() {
        updateDimensions();
        updateButtonContainer();
        updateStyles();
    }

    function updateDimensions() {
        width = window.innerWidth;
        height = window.innerHeight;
        pixelSize = Math.floor(width / GRIDWIDTH);
        screenWidth = GRIDWIDTH * pixelSize;
        padding = (width - screenWidth) / 2;
    }

    function updateButtonContainer() {
        let buttonContainerHeight = 50;
        let buttonContainerTop = height - buttonContainerHeight;
        document.documentElement.style.setProperty('--button-container-top', `${buttonContainerTop}px`);
    }

    function updateStyles() {
        document.documentElement.style.setProperty('--container-padding', `${padding}px`);
        document.documentElement.style.setProperty('--pixel-size', `${pixelSize}px`);
        document.documentElement.style.setProperty('--screen-width', `${screenWidth}px`);
    }

</script>