function generateScreen(sprites, xSize, ySize) {
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
                    screen[y][x] = spriteMatrix[matrixY][matrixX];
                }
            }
        }
    });
    return screen;
}

module.exports = {
   generateScreen: generateScreen
};