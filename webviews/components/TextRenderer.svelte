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
        this.characterWidths = new Map();

        // Load the character sprites from the store into an array of matrices
        this.charSprites = spriteReaderFromStore(spriteWidth, spriteHeight, charmap);
        // Create a mapping from characters to sprite indexes
        const charsArray = Array.from(charMappingString);
        this.charToSpriteIndex = {};
        for (let i = 0; i < charsArray.length; i++) {
            this.charToSpriteIndex[charsArray[i]] = i;
        }

        console.log("UNTRIMMED ARRAY: ", this.charSprites);
        console.log("TRIMMED ARRAY: ", this.trimCharacterWidth());
    }

    trimCharacterWidth(spaceWidth = 3) {
        let outputMatrixArray = [];
        for (let spriteIndex = 0; spriteIndex < this.charSprites.length; spriteIndex++) {
            let leftTrim = this.spriteWidth;  // Initialize to max width
            let rightTrim = 0;
            for (let y = 0; y < this.spriteHeight; y++) {
                for (let x = 0; x < this.spriteWidth; x++) {
                    if (this.charSprites[spriteIndex][y][x] !== this.backgroundColor) {
                        if (x < leftTrim) leftTrim = x;
                        if (x > rightTrim) rightTrim = x;
                    }
                }
            }

            let character = Object.keys(this.charToSpriteIndex).find(key => this.charToSpriteIndex[key] === spriteIndex);
            
            if (character === " ") {
                this.characterWidths.set(" ", spaceWidth);
                let spaceMatrix = Array.from({ length: this.spriteHeight }, () => Array(spaceWidth).fill(this.backgroundColor));
                outputMatrixArray.push(spaceMatrix);
            } else {
                this.characterWidths.set(character, rightTrim - leftTrim + 1);
                let trimmedSprite = this.charSprites[spriteIndex].map(row => row.slice(leftTrim, rightTrim + 1));
                outputMatrixArray.push(trimmedSprite);
            }
        }
        this.currentCharSprites = outputMatrixArray;
        return outputMatrixArray;
    }

    renderText(text) {
        if (typeof text !== 'string') {
            throw new Error('renderText: Text must be a string');
        }

        let currentWidth = 0;
        const characterOffsets = [];
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const charWidth = this.characterWidths.get(char);
            if (charWidth === undefined) {
                console.warn(`No character width found for '${char}', using default width of spriteWidth.`);
                continue;
            }
            if (i > 0) {
                currentWidth += this.letterSpacing;
            }
            characterOffsets.push(currentWidth);
            currentWidth += charWidth;
        }

        if (currentWidth <= 0) {
            console.warn('Invalid total width for text rendering, returning empty matrix.');
            return [];
        }

        const matrixHeight = this.spriteHeight + Math.abs(this.textShadowYOffset);
        const matrix = Array(matrixHeight).fill(null).map(() => Array(currentWidth).fill(this.backgroundColor));

        text.split('').forEach((char, i) => {
            const spriteIndex = this.charToSpriteIndex[char];
            const sprite = this.currentCharSprites[spriteIndex];
            const spriteWidth = sprite[0].length;

            if (this.textShadowColor !== null) {
                sprite.forEach((row, y) => {
                    row.forEach((pixel, x) => {
                        if (pixel !== this.backgroundColor) {
                            const posX = characterOffsets[i] + x + this.textShadowXOffset;
                            const posY = y + this.textShadowYOffset;
                            matrix[posY][posX] = this.textShadowColor;
                        }
                    });
                });
            }

            sprite.forEach((row, y) => {
                row.forEach((pixel, x) => {
                    if (pixel !== this.backgroundColor) {
                        const posX = characterOffsets[i] + x;
                        matrix[y][posX] = this.renderColor;
                    }
                });
            });
        });

        for (let y = 0; y < matrixHeight; y++) {
            for (let x = 0; x < currentWidth; x++) {
                if (matrix[y][x] === this.backgroundColor) {
                    matrix[y][x] = 'transparent';
                }
            }
        }

        return matrix;
    }
}

export function createTextMeasureFunction(spriteWidth, letterSpacing) {
    return function measureText(text) {
        if (typeof text !== 'string') {
            throw new Error('measureText: Text must be a string');
        }
        let numChars = text.length;
        return (spriteWidth + letterSpacing) * numChars - letterSpacing;
    };
}

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
