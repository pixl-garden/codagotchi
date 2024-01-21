<<<<<<< HEAD
<script context='module'>
    import { spriteReader } from "./SpriteReader.svelte";

    export function generateEmptyMatrix(width, height) {
        const sprite = [];
        for (let i = 0; i < height; i++) {
            const row = Array(width).fill('transparent');
            sprite.push(row);
        }
        return sprite;
    }

    export function generateRectangleMatrix(width, height, color) {
        const sprite = [];
        for (let i = 0; i < height; i++) {
            const row = Array(width).fill(color);
            sprite.push(row);
        }
        return sprite;
    }

    export function generateRoundedRectangleMatrix(width, height, color, rounding) {
    const sprite = [];

    // Adjust the rounding value if it's too large
    rounding = Math.min(rounding, height / 2, width / 2);

    // Function to check if a pixel should be colored based on rounded corners
    function shouldColorPixel(x, y) {
        // Check for corners
        if (x < rounding && y < rounding) {  // Top-left corner
            return (x - rounding) ** 2 + (y - rounding) ** 2 <= rounding ** 2;
        }
        if (x >= width - rounding && y < rounding) {  // Top-right corner
            return (x - (width - 1 - rounding)) ** 2 + (y - rounding) ** 2 <= rounding ** 2;
        }
        if (x < rounding && y >= height - rounding) {  // Bottom-left corner
            return (x - rounding) ** 2 + (y - (height - 1 - rounding)) ** 2 <= rounding ** 2;
        }
        if (x >= width - rounding && y >= height - rounding) {  // Bottom-right corner
            return (x - (width - 1 - rounding)) ** 2 + (y - (height - 1 - rounding)) ** 2 <= rounding ** 2;
        }
        return true;  // All non-corner cases
    }

    // Fill the sprite matrix
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            row.push(shouldColorPixel(x, y) ? color : 'transparent');
        }
        sprite.push(row);
    }

    return sprite;
}






    export function overlayMatrix(baseSprite, overlaySprite, startX, startY) {
        for (let y = 0; y < overlaySprite.length; y++) {
            for (let x = 0; x < overlaySprite[y].length; x++) {
                if (overlaySprite[y][x] !== 'transparent') {
                    baseSprite[startY + y][startX + x] = overlaySprite[y][x];
                }
            }
        }
        return baseSprite;
    }

    export function concatenateMatrixes(matrix1, matrix2) {
        if (matrix1.length !== matrix2.length) {
            throw new Error('Both matrices must have the same number of rows');
        }

        const concatenated = [];
        for (let i = 0; i < matrix1.length; i++) {
            concatenated.push([...matrix1[i], ...matrix2[i]]);
        }

        return concatenated;
    }

    export function replaceMatrixColor(matrix, colorToReplace, replacementColor) {
        if (!matrix || !Array.isArray(matrix)) {
            console.error('Invalid matrix provided:', matrix);
            return;
        }

        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x] === colorToReplace) {
                    matrix[y][x] = replacementColor;
                }
            }
        }

        return matrix; // Return the modified matrix
    }

    export function generateButtonMatrix(
        width,
        height,
        bgColor,
        borderColor,
        textSprite,
    ) {
        // Generate the outer rectangle sprite for the button border
        const outerSprite = generateRectangleMatrix(width, height, borderColor);

        // Generate the inner rectangle sprite for the button background
        const innerWidth = width - 2;
        const innerHeight = height - 2;
        const innerSprite = generateRectangleMatrix(innerWidth, innerHeight, bgColor);

        // Overlay the inner sprite onto the outer sprite to create the button
        overlayMatrix(outerSprite, innerSprite, 1, 1);

        // Overlay the text sprite in the center of the button
        const textX = Math.floor((width - textSprite[0].length) / 2);
        const textY = Math.floor((height - textSprite.length) / 2);
        overlayMatrix(outerSprite, textSprite, textX, textY);
        // console.log('OUTER SPRITE: ', outerSprite);
        return outerSprite;
    }

    export function generateStatusBarSprite(
    width,
    height,
    borderColor,
    bgColor,
    statusBarColor,
    filledWidth,
    roundness
) {
    // Create the full inner rectangle which includes the background and filled status
    const innerWidth = width - 2; // Adjust for border
    const innerHeight = height - 2; // Adjust for border
    const innerSprite = generateRoundedRectangleMatrix(innerWidth, innerHeight, bgColor, roundness);

    // Overlay the filled part of the status bar onto the inner background
    if (filledWidth > 0) {
        // Adjust the filledWidth to not overlap the border
        filledWidth = Math.min(filledWidth, innerWidth);
        const statusBarSprite = generateRoundedRectangleMatrix(filledWidth, innerHeight, statusBarColor, roundness);
        overlayMatrix(innerSprite, statusBarSprite, 0, 0);
    }

    // Create the outer rounded border
    const borderSprite = generateRoundedRectangleMatrix(width, height, borderColor, roundness);

    // Overlay the inner sprite onto the border, creating the full sprite
    overlayMatrix(borderSprite, innerSprite, 1, 1);

    return borderSprite;
}

    export function generateStatusBarSpriteSheet(
        width,
        height,
        borderColor,
        bgColor,
        statusBarColor,
        roundness
    ) {
        let spriteSheet = [];

        for (let i = 0; i < width - 2; i++) {
            const statusBarSprite = generateStatusBarSprite(width, height, borderColor, bgColor, statusBarColor, i, roundness);
            if (i === 0) {
                spriteSheet = statusBarSprite;
            } else {
                spriteSheet = concatenateMatrixes(spriteSheet, statusBarSprite);
            }
        }

        return spriteReader(width, height, spriteSheet);
    }
</script>
=======
<script context='module'>
    import { spriteReader } from "./SpriteReader.svelte";

    export function generateEmptyMatrix(width, height) {
        const sprite = [];
        for (let i = 0; i < height; i++) {
            const row = Array(width).fill('transparent');
            sprite.push(row);
        }
        return sprite;
    }

    //TODO - combine rectangle and rounded rectangle functions into one function
    export function generateRectangleMatrix(width, height, color) {
        const sprite = [];
        for (let i = 0; i < height; i++) {
            const row = Array(width).fill(color);
            sprite.push(row);
        }
        return sprite;
    }

    export function generateRoundedRectangleMatrix(width, height, color, rounding) {
        const sprite = [];

        // Cap the rounding to half the width or height, whichever is smallest
        rounding = Math.min(rounding, height / 2, width / 2);

        // Function to check if a pixel should be colored based on rounded corners
        function shouldColorPixel(x, y) {
            // Check for corners
            if (x < rounding && y < rounding) {  // Top-left corner
                return (x - rounding) ** 2 + (y - rounding) ** 2 <= rounding ** 2;
            }
            if (x >= width - rounding && y < rounding) {  // Top-right corner
                return (x - (width - 1 - rounding)) ** 2 + (y - rounding) ** 2 <= rounding ** 2;
            }
            if (x < rounding && y >= height - rounding) {  // Bottom-left corner
                return (x - rounding) ** 2 + (y - (height - 1 - rounding)) ** 2 <= rounding ** 2;
            }
            if (x >= width - rounding && y >= height - rounding) {  // Bottom-right corner
                return (x - (width - 1 - rounding)) ** 2 + (y - (height - 1 - rounding)) ** 2 <= rounding ** 2;
            }
            return true;  // All non-corner cases
        }

        // Fill the sprite matrix
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                row.push(shouldColorPixel(x, y) ? color : 'transparent');
            }
            sprite.push(row);
        }

        return sprite;
    }

    export function overlayMatrix(baseSprite, overlaySprite, baseXOffset = 0, baseYOffset = 0, overlayXOffset = 0, overlayYOffset = 0) {
        // Define size of result sprite
        const outWidth = Math.max(baseSprite[0].length + baseXOffset, overlaySprite[0].length + overlayXOffset);
        const outHeight = Math.max(baseSprite.length + baseYOffset, overlaySprite.length + overlayYOffset);
        let outSprite = generateEmptyMatrix(outWidth, outHeight);

        for (let y = 0; y < outHeight; y++) {
            for (let x = 0; x < outWidth; x++) {
                // Calculate coordinates in base and overlay sprites
                const baseX = x - baseXOffset;
                const baseY = y - baseYOffset;
                const overlayX = x - overlayXOffset;
                const overlayY = y - overlayYOffset;

                // Check if we are within the bounds of the overlay sprite
                if (overlayX >= 0 && overlayX < overlaySprite[0].length && overlayY >= 0 && overlayY < overlaySprite.length && 
                    overlaySprite[overlayY][overlayX] !== 'transparent') {
                    outSprite[y][x] = overlaySprite[overlayY][overlayX];
                }
                // Check if we are within the bounds of the base sprite
                else if (baseX >= 0 && baseX < baseSprite[0].length && baseY >= 0 && baseY < baseSprite.length) {
                    outSprite[y][x] = baseSprite[baseY][baseX];
                }
                // Otherwise, set to transparent
                else {
                    outSprite[y][x] = 'transparent';
                }
            }
        }
        return outSprite;
    }


    export function concatenateMatrixes(matrix1, matrix2) {
        //Function used to create sprite sheets (adds matrix2 to the right of matrix1)
        if (matrix1.length !== matrix2.length) {
            throw new Error('Both matrices must have the same number of rows');
        }
        const concatenated = [];
        for (let i = 0; i < matrix1.length; i++) {
            concatenated.push([...matrix1[i], ...matrix2[i]]);
        }
        return concatenated;
    }

    export function replaceMatrixColor(matrix, colorToReplace, replacementColor) {
        //Deep copy the matrix to avoid modifying the original (because javascript is stupid)
        let outputMatrix = JSON.parse(JSON.stringify(matrix));
        if (!matrix || !Array.isArray(matrix)) {
            console.error('Invalid matrix provided:', matrix);
            return;
        }

        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x] === colorToReplace) {
                    outputMatrix[y][x] = replacementColor;
                }
            }
        }

        return outputMatrix;
    }

    export function generateButtonMatrix( width, height, bgColor, borderColor, textSprite, bottomShadowColor = null, topShadowColor = null ) {
        const outerSprite = generateRectangleMatrix(width, height, borderColor);
        const innerWidth = width - 2;
        const innerHeight = height - 2;
        const innerSprite = generateRectangleMatrix(innerWidth, innerHeight, bgColor);

        // Overlay the inner sprite onto the outer sprite to create the button
        let buttonSprite = overlayMatrix(outerSprite, innerSprite, 0, 0, 1, 1);

        // If top shadow color is provided, generate a shadow strip and overlay it
        if (topShadowColor) {
            const topShadowHorizontal = generateRectangleMatrix(innerWidth, 1, topShadowColor);
            const topShadowVertical = generateRectangleMatrix(1, innerHeight, topShadowColor); // Extend to the full height
            buttonSprite = overlayMatrix(buttonSprite, topShadowHorizontal, 0, 0, 1, 1);
            buttonSprite = overlayMatrix(buttonSprite, topShadowVertical, 0, 0, 1, 1);
        }

        // If bottom shadow color is provided, generate a shadow strip and overlay it
        if (bottomShadowColor) {
            const bottomShadowHorizontal = generateRectangleMatrix(innerWidth, 1, bottomShadowColor);
            const bottomShadowVertical = generateRectangleMatrix(1, innerHeight, bottomShadowColor); // Extend to the full height
            buttonSprite = overlayMatrix(buttonSprite, bottomShadowHorizontal, 0, 0, 1, height - 2);
            buttonSprite = overlayMatrix(buttonSprite, bottomShadowVertical, 0, 0, width - 2, 1);
        }

        const textX = Math.floor((innerWidth - textSprite[0].length) / 2) + 1;
        const textY = Math.floor((innerHeight - textSprite.length) / 2) + 1;

        // Overlay the text sprite in the center of the button
        const finalButtonSprite = overlayMatrix(buttonSprite, textSprite, 0, 0, textX, textY);

        return finalButtonSprite;
    }


    export function generateStatusBarSprite(width, height, borderColor, bgColor, statusBarColor, filledWidth, roundness) {
        const backgroundSprite = generateRoundedRectangleMatrix(width, height, borderColor, roundness);
        const innerBackground = generateRoundedRectangleMatrix(width - 2, height - 2, bgColor, roundness);
        let statusBarSprite = overlayMatrix(backgroundSprite, innerBackground, 0, 0, 1, 1);

        // Create the border overlay sprite by replacing the background color with transparent
        let borderSprite = replaceMatrixColor(statusBarSprite, bgColor, 'transparent');

        if (filledWidth > 0) {
            // Adjust the filledWidth to account for the border
            filledWidth = Math.min(filledWidth, width - 2);
            let filledStatusBarSprite = generateRoundedRectangleMatrix(filledWidth, height - 2, statusBarColor, roundness);

            // Overlay the filled status bar onto the combined border and background sprite
            statusBarSprite = overlayMatrix(statusBarSprite, filledStatusBarSprite, 0, 0, 1, 1);

            // Overlay the border onto the filled status bar sprite to cover up overlaps
            statusBarSprite = overlayMatrix(statusBarSprite, borderSprite, 0, 0, 0, 0);
        }

        return statusBarSprite;
    }

    export function generateStatusBarSpriteSheet( width, height, borderColor, bgColor, statusBarColor, roundness ) {
        let spriteSheet = [];

        for (let i = 0; i < width - 2; i++) {
            const statusBarSprite = generateStatusBarSprite(width, height, borderColor, bgColor, statusBarColor, i, roundness);
            if (i === 0) {
                spriteSheet = statusBarSprite;
            } else {
                spriteSheet = concatenateMatrixes(spriteSheet, statusBarSprite);
            }
        }

        return spriteReader(width, height, spriteSheet);
    }
</script>
>>>>>>> 733b55cb883b96dbc554a956e395f40a2348caae
