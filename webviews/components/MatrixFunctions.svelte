<script context='module'>
    import { spriteReader } from "./SpriteReader.svelte";
    import * as Colors from './colors.js';


    export function generateEmptyMatrix(width, height) {
        const sprite = [];
        for (let i = 0; i < height; i++) {
            const row = Array(width).fill('transparent');
            sprite.push(row);
        }
        return sprite;
    }

     export function flipMatrixByAxis(matrix, axis = "x") {
        // Validate input is a non-empty 2D array
        if (!Array.isArray(matrix) || matrix.length === 0 || !Array.isArray(matrix[0])) {
            throw new Error('Invalid matrix input');
        }

        if( axis === "x"){
            matrix.forEach(row => row.reverse());
        }
        else if( axis === "y"){
            matrix.reverse();
        }
        else{
            throw new Error('Invalid axis input');
        }

        return matrix;
    }


    export function roundSpriteMatrix(matrix, rounding) {
        const width = matrix.length;
        const height = matrix[0].length;
        console.log("matrix: ", matrix, "width: ", width, "height: ", height);

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

        // Iterate over each pixel to apply roundness
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                matrix[x][y] = shouldColorPixel(x, y) ? matrix[x][y] : 'transparent';
            }
        }

        return matrix;
    }


    export function trimSpriteMatrix(matrix, startX, endX, startY, endY) {  
        return matrix.slice(startY, endY).map(row => row.slice(startX, endX));
    }

    export function generateRectangleMatrix(width, height, color, rounding = 0) {
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

    //works the same as overlayMatrix but does not ignore transparent pixels
    export function setMatrix(baseSprite, overlaySprite, baseXOffset = 0, baseYOffset = 0, overlayXOffset = 0, overlayYOffset = 0) {
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
                if (overlayX >= 0 && overlayX < overlaySprite[0].length && overlayY >= 0 && overlayY < overlaySprite.length) {
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

    export function generateButtonMatrix( width, height, bgColor, borderColor, displaySprite, bottomShadowColor = null, topShadowColor = null, layout = "center", 
                                          textXOffset = 0, textYOffset = 1) {
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
        let displaySpriteX;
        if(layout === "center"){
            displaySpriteX = Math.floor((innerWidth - displaySprite[0].length) / 2) + 1;
        }
        else if(layout === "left"){
            displaySpriteX = 1 + textXOffset;
        }
        else if(layout === "right"){
            displaySpriteX = innerWidth - displaySprite[0].length - textXOffset;
        }
        else{
            displaySpriteX = Math.floor((innerWidth - displaySprite[0].length) / 2) + 1;
        }
        
        let displaySpriteY = Math.floor((innerHeight - displaySprite.length) / 2) + textYOffset;

        // Overlay the sprite in the center of the button
        const finalButtonSprite = overlayMatrix(buttonSprite, displaySprite, 0, 0, displaySpriteX, displaySpriteY);

        return finalButtonSprite;
    }

    export function generateStatusBarSprite(width, height, borderColor, bgColor, statusBarColor, filledWidth, roundness) {
        const backgroundSprite = generateRectangleMatrix(width, height, borderColor, roundness);
        const innerBackground = generateRectangleMatrix(width - 2, height - 2, bgColor, roundness);
        let statusBarSprite = overlayMatrix(backgroundSprite, innerBackground, 0, 0, 1, 1);

        // Create the border overlay sprite by replacing the background color with transparent
        let borderSprite = replaceMatrixColor(statusBarSprite, bgColor, 'transparent');

        if (filledWidth > 0) {
            // Adjust the filledWidth to account for the border
            filledWidth = Math.min(filledWidth, width - 2);
            let filledStatusBarSprite = generateRectangleMatrix(filledWidth, height - 2, statusBarColor, roundness);

            // Overlay the filled status bar onto the combined border and background sprite
            statusBarSprite = overlayMatrix(statusBarSprite, filledStatusBarSprite, 0, 0, 1, 1);

            // Overlay the border onto the filled status bar sprite to cover up overlaps
            statusBarSprite = overlayMatrix(statusBarSprite, borderSprite, 0, 0, 0, 0);
        }

        return statusBarSprite;
    }


    export function generateStatusBarSpriteSheet(width, height, borderColor, bgColor, firstColor, secondColor, thirdColor, roundness) {
    let spriteSheet = [];  // Ensure spriteSheet is an array
    for (let i = 0; i < width - 2; i++) {
        let statusBarSprite;
        if (i < (width - 2) / 3) {
            statusBarSprite = generateStatusBarSprite(width, height, borderColor, bgColor, firstColor, i, roundness);
        } else if (i < (width - 2) * (2 / 3)) { 
            statusBarSprite = generateStatusBarSprite(width, height, borderColor, bgColor, secondColor, i, roundness);
        } else {
            statusBarSprite = generateStatusBarSprite(width, height, borderColor, bgColor, thirdColor, i, roundness);
        }

        if (i === 0) {
            spriteSheet = statusBarSprite;  // Initialize with the first sprite as an element in an array
        } else {
            spriteSheet = concatenateMatrixes(spriteSheet, statusBarSprite)  // Assume each sprite can be pushed if they are not already matrices
        }
    }

    // Assuming spriteSheet now contains an array of matrices or sprites, process it accordingly
    return spriteReader(width, height, spriteSheet);
}

    export function generateTextInputMatrix(width, height, bgColor, borderColor, textSprite, roundness, textXOffset, borderThickness = 1) {
        // Ensure the border thickness doesn't exceed half the width or height of the sprite
        borderThickness = Math.min(borderThickness, Math.floor(width / 2), Math.floor(height / 2));

        // Create the outer rounded rectangle sprite for the border
        const outerSprite = generateRectangleMatrix(width, height, borderColor, roundness);

        // Adjust the innerWidth and innerHeight based on the border thickness
        const innerWidth = width - (borderThickness * 2);
        const innerHeight = height - (borderThickness * 2);

        // Create the inner rounded rectangle sprite for the input field background and cap roundness to half the width or height, whichever is smallest
        const innerRoundness = Math.min(roundness, Math.floor(innerWidth / 2), Math.floor(innerHeight / 2));
        const innerSprite = generateRectangleMatrix(innerWidth, innerHeight, bgColor, innerRoundness);

        // Overlay the inner sprite onto the outer sprite to create the text input background and offset it by the border thickness
        let textInputSprite = overlayMatrix(outerSprite, innerSprite, 0, 0, borderThickness, borderThickness);

        // Calculate the Y offset for the text
        const textYOffset = Math.floor((innerHeight - textSprite.length) / 2) + borderThickness;

        // Overlay the text sprite on the left side of the text input, starting after the border thickness
        textInputSprite = overlayMatrix(textInputSprite, textSprite, 0, 0, textXOffset + borderThickness, textYOffset);

        return textInputSprite;
    }

    export function generateTooltipSprite(titleText, borderColor, backgroundColor, rounding, padding, textRenderer) {
        // Use the textRenderer to get the text sprite matrix for the titleText
        const textSprite = textRenderer.renderText(titleText);

        // Calculate the tooltip background dimensions based on the text dimensions and padding
        const backgroundWidth = textSprite[0].length + padding * 2 + 1;
        const backgroundHeight = textSprite.length + padding * 2;

        // Generate the rounded rectangle matrix for the tooltip background
        const backgroundSprite = generateRectangleMatrix(backgroundWidth, backgroundHeight, backgroundColor, rounding);

        // Overlay the text sprite onto the background sprite, centered
        const textXOffset = padding;
        const textYOffset = padding;
        const tooltipSprite = overlayMatrix(backgroundSprite, textSprite, 0, 0, textXOffset, textYOffset);

        // Optionally, if you want a border around the tooltip, you can first generate a larger background for the border
        const borderBackgroundSprite = generateRectangleMatrix(backgroundWidth + 2, backgroundHeight + 2, borderColor, rounding + 1);
        // Then overlay the tooltip sprite (background + text) onto this border sprite
        const finalTooltipSprite = overlayMatrix(borderBackgroundSprite, tooltipSprite, 0, 0, 1, 1);

        return finalTooltipSprite;
    }

    export function generateMenuMatrix(width, height, bgColor, innerBorderColor, outerBorderColor, innerRoundness, outerRoundness, innerBorderThickness = 3 , outerBorderThickness = 1) {
        
        // Ensure the border thickness doesn't exceed half the width or height of the sprite
        innerBorderThickness = Math.min(innerBorderThickness, Math.floor(width / 2), Math.floor(height / 2));
        outerRoundness = Math.min(outerRoundness, Math.floor(width / 2), Math.floor(height / 2));
        // Create the outer rounded rectangle sprite for the border
        const outerBorderSprite = generateRectangleMatrix(width, height, outerBorderColor, outerRoundness);

        const innerBorderWidth = width - (outerBorderThickness * 2);
        const innerBorderHeight = height - (outerBorderThickness * 2);

        const innerBorderSprite = generateRectangleMatrix(innerBorderWidth, innerBorderHeight, innerBorderColor, outerRoundness);
        // Adjust the centerWidth and centerHeight based on the border thickness
        const centerWidth = width - (innerBorderThickness * 2) - (outerBorderThickness * 2);
        const centerHeight = height - (innerBorderThickness * 2) - (outerBorderThickness * 2);

        // Create the inner rounded rectangle sprite for the input field background and cap roundness to half the width or height, whichever is smallest
        innerRoundness = Math.min(innerRoundness, Math.floor(centerWidth / 2), Math.floor(centerHeight / 2));
        const innerSprite = generateRectangleMatrix(centerWidth, centerHeight, bgColor, innerRoundness);
        
        // Overlay the inner sprite onto the outer sprite to create the text input background and offset it by the border thickness
        let layerOneSprite = overlayMatrix(outerBorderSprite, innerBorderSprite, 0, 0, outerBorderThickness, outerBorderThickness);

        // Overlay the text sprite on the left side of the text input, starting after the border thickness
        let layerTwoSprite = overlayMatrix(layerOneSprite, innerSprite, 0, 0, innerBorderThickness + outerBorderThickness, innerBorderThickness + outerBorderThickness);

        return layerTwoSprite;
    }

    export function generateColorButtonMatrix(width, height, color) { 
        const topShadowColor = adjustColor(color, 10);
        const bottomShadowColor = adjustColor(color, -10);

        let buttonSprite = generateRectangleMatrix(width, height, color);

        const topShadowHorizontal = generateRectangleMatrix(width, 1, topShadowColor);
        const topShadowVertical = generateRectangleMatrix(1, height, topShadowColor); // Extend to the full height
        buttonSprite = overlayMatrix(buttonSprite, topShadowHorizontal, 0, 0, 0, 0);
        buttonSprite = overlayMatrix(buttonSprite, topShadowVertical, 0, 0, 0, 0);

        const bottomShadowHorizontal = generateRectangleMatrix(width, 1, bottomShadowColor);
        const bottomShadowVertical = generateRectangleMatrix(1, height, bottomShadowColor); // Extend to the full height
        buttonSprite = overlayMatrix(buttonSprite, bottomShadowHorizontal, 0, 0, 0, height - 1);
        buttonSprite = overlayMatrix(buttonSprite, bottomShadowVertical, 0, 0, width - 1, 0);

        return buttonSprite;
    }

    function adjustColor(hex, percent) {
        // Parse the hex color to get the RGB components
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);

        // Calculate the adjustment value based on the percent parameter
        let amount = Math.floor((percent / 100) * 255);

        // Adjust the RGB values and ensure they remain within the 0-255 range
        r = Math.max(0, Math.min(255, r + amount));
        g = Math.max(0, Math.min(255, g + amount));
        b = Math.max(0, Math.min(255, b + amount));

        // Convert the RGB values back to hexadecimal format
        r = r.toString(16).padStart(2, '0');
        g = g.toString(16).padStart(2, '0');
        b = b.toString(16).padStart(2, '0');

        // Return the new hex color
        return `#${r}${g}${b}`;
    }

    //currently only works with positive integers
    export function scaleMatrix(inputSprite, scale){
        let outputSprite = [];
        for (let y = 0; y < inputSprite.length; y++) {
            for (let i = 0; i < scale; i++) {
                let row = [];
                for (let x = 0; x < inputSprite[y].length; x++) {
                    for (let j = 0; j < scale; j++) {
                        row.push(inputSprite[y][x]);
                    }
                }
                outputSprite.push(row);
            }
        }
        return outputSprite;
    }
</script>
