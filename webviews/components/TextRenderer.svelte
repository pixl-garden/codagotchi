<script context="module">
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import { replaceMatrixColor } from './MatrixFunctions.svelte';

    //export a function that renders text
    export class TextRenderer {
    constructor (
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
        this.charmap = charmap;
        this.spriteWidth = spriteWidth;
        this.spriteHeight = spriteHeight;
        this.backgroundColor = backgroundColor;
        this.renderColor = renderColor;
        this.letterSpacing = letterSpacing;
        this.charMappingString = charMappingString;
        this.textShadowColor = textShadowColor;
        this.textShadowXOffset = textShadowXOffset;
        this.textShadowYOffset = textShadowYOffset;

        this.charSprites = spriteReaderFromStore(spriteWidth, spriteHeight, charmap);
        const charsArray = Array.from(charMappingString);
        this.charToSpriteIndex = {};
        for (let i = 0; i < charsArray.length; i++) {
            this.charToSpriteIndex[charsArray[i]] = i;
        }
    }

    renderText(text) {
        if(typeof text !== 'string') {
            throw new Error('renderText: Text must be a string');
        }
        this.text = text;
        // Create a larger matrix to accommodate shadows
        const matrixWidth = text.length * (this.spriteWidth + this.letterSpacing);
        const matrixHeight = this.spriteHeight + Math.abs(this.textShadowYOffset);
        const matrix = Array(matrixHeight).fill(null).map(() => Array(matrixWidth).fill(this.backgroundColor));

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (this.charToSpriteIndex[char] !== undefined) {
                const spriteIndex = this.charToSpriteIndex[char];
                const sprite = this.charSprites[spriteIndex];

                // Render shadow first if enabled
                if (this.textShadowColor !== null) { 
                    for (let y = 0; y < this.spriteHeight; y++) {
                        for (let x = 0; x < this.spriteWidth; x++) {
                            // Calculate position for shadow
                            const posX = i * (this.spriteWidth + this.letterSpacing) + x + this.textShadowXOffset;
                            const posY = y + this.textShadowYOffset;
                            // Apply shadow color if the current pixel is not transparent
                            if (sprite[y][x] !== this.backgroundColor) {
                                matrix[posY][posX] = this.textShadowColor;
                            }
                        }
                    }
                }

                // Then render the character itself
                for (let y = 0; y < this.spriteHeight; y++) {
                    for (let x = 0; x < this.spriteWidth; x++) {
                        // Calculate position for character
                        const posX = i * (this.spriteWidth + this.letterSpacing) + x;
                        const posY = y;
                        // Apply character color if the current pixel is not transparent
                        if (sprite[y][x] !== this.backgroundColor) {
                            matrix[posY][posX] = this.renderColor;
                        }
                    }
                }
            }
        }

        // Finally, convert all backgroundColor pixels to 'transparent'
        for (let y = 0; y < matrixHeight; y++) {
            for (let x = 0; x < matrixWidth; x++) {
                if (matrix[y][x] === this.backgroundColor) {
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
