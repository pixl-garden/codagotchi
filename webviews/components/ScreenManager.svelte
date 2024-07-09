<script context="module">
    const GRIDWIDTH = 128;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const pixelSize = Math.min(width / GRIDWIDTH, height / GRIDWIDTH);
    let screenWidth = GRIDWIDTH * pixelSize;
    let padding = 0;


    function hexToRGB(hex) {
        // Remove the '#' if it is present
        hex = hex.replace(/^#/, '');

        // Parse RGB values
        let r = parseInt(hex.slice(0, 2), 16);
        let g = parseInt(hex.slice(2, 4), 16);
        let b = parseInt(hex.slice(4, 6), 16);

        return { r, g, b };
    }

    function blendPixels(pixel1, pixel2, opacity) {
        let r = Math.round((1 - opacity) * pixel1.r + opacity * pixel2.r);
        let g = Math.round((1 - opacity) * pixel1.g + opacity * pixel2.g);
        let b = Math.round((1 - opacity) * pixel1.b + opacity * pixel2.b);
        return { r, g, b };
    }

    export function generateScreen(sprites, xSize, ySize) {
        // Initialize an empty screen with the given size
        let screen = Array(ySize)
            .fill()
            .map(() => Array(xSize).fill('transparent'));

        // Sort sprites by z-index (smallest to largest)
        sprites.sort((a, b) => a.getZ() - b.getZ());

        // Iterate over each sprite and draw it on the screen
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
                
                // Iterate over the sprite matrix and draw it on the screen
                for (let y = startY; y < endY; y++) {
                    let matrixY = y - sprite.y;
                    for (let x = startX; x < endX; x++) {
                        let matrixX = x - sprite.x;
                        let pixelHex = spriteMatrix[matrixY][matrixX];
                        // If sprite pixel is transparent skip it
                        if (pixelHex !== 'transparent') {
                            // If sprite pixel is not fully opaque blend it with the screen pixel (if it exists)
                            if (sprite.opacity < 1 && screen[y][x] !== 'transparent') {
                                let spritePixel = hexToRGB(pixelHex);
                                let screenPixel = hexToRGB(screen[y][x]);
                                // Blend the pixel with the background screen pixel
                                let blendedPixel = blendPixels(screenPixel, spritePixel, sprite.opacity);
                                // Convert the blended pixel back to hex
                                let hexValue = `#${((1 << 24) + (blendedPixel.r << 16) + (blendedPixel.g << 8) + blendedPixel.b).toString(16).slice(1)}`;
                                screen[y][x] = `#${hexValue.slice(1)}`;
                            } else {
                                // Fully opaque pixel, just copy it
                                screen[y][x] = pixelHex;
                            }
                        }
                    }
                }
            }
        });

        return screen;
    }

    export function handleResize() {
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
        screenWidth = width;
    }

    function updateStyles() {
        // document.documentElement.style.setProperty('--container-padding', `${padding}px`);
        document.documentElement.style.setProperty('--pixel-size', `${pixelSize}px`);
        document.documentElement.style.setProperty('--screen-width', `${screenWidth}px`);
    }
</script>
