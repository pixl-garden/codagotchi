<script context="module">
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import { replaceMatrixColor } from './MatrixFunctions.svelte';

    //export a function that renders text
    export function createTextRenderer(
    charmap,
    spriteWidth,
    spriteHeight,
    backgroundColor,
    renderColor,
    letterSpacing = 0,
    charMappingString,
    textShadowColor = null,
    textShadowXOffset = 0,
    textShadowYOffset = 0
) {
    let charSprites = spriteReaderFromStore(spriteWidth, spriteHeight, charmap);
    const charsArray = Array.from(charMappingString);
    const charToSpriteIndex = {};
    for (let i = 0; i < charsArray.length; i++) {
        charToSpriteIndex[charsArray[i]] = i;
    }

    return function renderText(text) {
        if(typeof text !== 'string') {
            throw new Error('renderText: Text must be a string');
        }
        // Create a larger matrix to accommodate shadows
        const matrixWidth = text.length * (spriteWidth + letterSpacing);
        const matrixHeight = spriteHeight + Math.abs(textShadowYOffset);
        const matrix = Array(matrixHeight).fill(null).map(() => Array(matrixWidth).fill(backgroundColor));

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (charToSpriteIndex[char] !== undefined) {
                const spriteIndex = charToSpriteIndex[char];
                const sprite = charSprites[spriteIndex];

                // Render shadow first if enabled
                if (textShadowColor !== null) {
                    for (let y = 0; y < spriteHeight; y++) {
                        for (let x = 0; x < spriteWidth; x++) {
                            // Calculate position for shadow
                            const posX = i * (spriteWidth + letterSpacing) + x + textShadowXOffset;
                            const posY = y + textShadowYOffset;
                            // Apply shadow color if the current pixel is not transparent
                            if (sprite[y][x] !== backgroundColor) {
                                matrix[posY][posX] = textShadowColor;
                            }
                        }
                    }
                }

                // Then render the character itself
                for (let y = 0; y < spriteHeight; y++) {
                    for (let x = 0; x < spriteWidth; x++) {
                        // Calculate position for character
                        const posX = i * (spriteWidth + letterSpacing) + x;
                        const posY = y;
                        // Apply character color if the current pixel is not transparent
                        if (sprite[y][x] !== backgroundColor) {
                            matrix[posY][posX] = renderColor;
                        }
                    }
                }
            }
        }

        // Finally, convert all backgroundColor pixels to 'transparent'
        for (let y = 0; y < matrixHeight; y++) {
            for (let x = 0; x < matrixWidth; x++) {
                if (matrix[y][x] === backgroundColor) {
                    matrix[y][x] = 'transparent';
                }
            }
        }

        // Now trim the empty columns from the matrix
        let firstNonEmptyColumn = 0;
        let lastNonEmptyColumn = matrixWidth - 1;

        // Find the first non-empty column from the left
        while (firstNonEmptyColumn < matrixWidth && isColumnEmpty(matrix, firstNonEmptyColumn)) {
            firstNonEmptyColumn++;
        }

        // Find the first non-empty column from the right
        while (lastNonEmptyColumn >= 0 && isColumnEmpty(matrix, lastNonEmptyColumn)) {
            lastNonEmptyColumn--;
        }

        // If there are empty columns on either side, slice the matrix to exclude them
        if (firstNonEmptyColumn > 0 || lastNonEmptyColumn < matrixWidth - 1) {
            for (let i = 0; i < matrix.length; i++) {
                matrix[i] = matrix[i].slice(firstNonEmptyColumn, lastNonEmptyColumn + 1);
            }
        }

        return matrix;
    };
}

//TODO: needs to be drastically modified when non mono-spaced fonts are implemented
export function createTextMeasureFunction(spriteWidth, letterSpacing) {
    // This function returns the width of the text based on the sprite width and letter spacing
    return function measureText(text) {
        if (typeof text !== 'string') {
            throw new Error('measureText: Text must be a string');
        }

        let numChars = text.length;
        // Calculate total width as number of characters times sprite width plus the spaces between them
        return (spriteWidth + letterSpacing) * numChars - letterSpacing; // Subtract letterSpacing once for the last character
    };
}

// Function to check if a column is empty (transparent)
function isColumnEmpty(matrix, columnIndex) {
    for (let i = 0; i < matrix.length; i++) {
        if (matrix[i][columnIndex] !== 'transparent') {
            return false;
        }
    }
    return true;
}

    // Example instantiation
    // const renderBasicText = createTextRenderer('basic.png', 8, 8, 'black', -3, ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
</script>
