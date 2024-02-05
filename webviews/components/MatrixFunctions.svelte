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

    export function generateButtonMatrix( width, height, bgColor, borderColor, textSprite, bottomShadowColor = null, topShadowColor = null, layout = "center", offset = 0 ) {
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
        let textX;
        if(layout === "center"){
            textX = Math.floor((innerWidth - textSprite[0].length) / 2) + 1;
        }
        else if(layout === "left"){
            textX = 1 + offset;
        }
        else if(layout === "right"){
            textX = innerWidth - textSprite[0].length - offset;
        }
        else{
            textX = Math.floor((innerWidth - textSprite[0].length) / 2) + 1;
        }
        
        let textY = Math.floor((innerHeight - textSprite.length) / 2) + 1;

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

    export function generateTextInputMatrix(width, height, bgColor, borderColor, textSprite, roundness, textXOffset, borderThickness = 1) {
        // Ensure the border thickness doesn't exceed half the width or height of the sprite
        borderThickness = Math.min(borderThickness, Math.floor(width / 2), Math.floor(height / 2));

        // Create the outer rounded rectangle sprite for the border
        const outerSprite = generateRoundedRectangleMatrix(width, height, borderColor, roundness);

        // Adjust the innerWidth and innerHeight based on the border thickness
        const innerWidth = width - (borderThickness * 2);
        const innerHeight = height - (borderThickness * 2);

        // Create the inner rounded rectangle sprite for the input field background and cap roundness to half the width or height, whichever is smallest
        const innerRoundness = Math.min(roundness, Math.floor(innerWidth / 2), Math.floor(innerHeight / 2));
        const innerSprite = generateRoundedRectangleMatrix(innerWidth, innerHeight, bgColor, innerRoundness);

        // Overlay the inner sprite onto the outer sprite to create the text input background and offset it by the border thickness
        let textInputSprite = overlayMatrix(outerSprite, innerSprite, 0, 0, borderThickness, borderThickness);

        // Calculate the Y offset for the text
        const textYOffset = Math.floor((innerHeight - textSprite.length) / 2) + borderThickness;

        // Overlay the text sprite on the left side of the text input, starting after the border thickness
        textInputSprite = overlayMatrix(textInputSprite, textSprite, 0, 0, textXOffset + borderThickness, textYOffset);

        return textInputSprite;
    }

</script>
