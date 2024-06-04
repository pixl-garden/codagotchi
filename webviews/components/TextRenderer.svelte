<script context="module">
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import { replaceMatrixColor } from './MatrixFunctions.svelte';


    /**
    * Class for rendering text, use renderText method to render text
    */
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
        this.trimCharacterWidth();
    }

    // function for trimming excess pixels from the sides of the character sprites (for non-monospaced font rendering)
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

    /**
     * Renders the given text as a matrix of pixels
     * @param {string} text The text to render
     * @param {string} renderColor The color of the text, if not provided, the renderer's renderColor will be used
     * @param {string} textShadowColor The color of the text shadow, if not provided, the renderer's textShadowColor will be used
     * @returns {string[][]} Matrix of pixels (color strings) representing the rendered text
     */
    renderText(text, renderColor = this.renderColor, textShadowColor = this.textShadowColor) {
        if (typeof text !== 'string') {
            throw new Error('renderText: Text must be a string');
        }

        // Used to calculate the x position of each character in the rendered text
        let currentWidth = 0;
        const characterOffsets = [];

        // Set characterOffsets for each character in the text
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            // Get the width of the character from the characterWidths map
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

        // Extend base matrix to acount for text shadow
        currentWidth += Math.abs(this.textShadowXOffset);

        // If the text is empty, return an empty 2d matrix
        if (currentWidth <= 0) { 
            return [[]];
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
                            matrix[posY][posX] = textShadowColor;
                        }
                    });
                });
            }

            sprite.forEach((row, y) => {
                row.forEach((pixel, x) => {
                    if (pixel !== this.backgroundColor) {
                        const posX = characterOffsets[i] + x;
                        matrix[y][posX] = renderColor;
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

    /**
     * Measures the width of given text in pixels
     * @param {string} text The text to measure
     * @returns {number} The width of the text in pixels as integer
     */
    measureText(text){
        if (typeof text !== 'string') {
            throw new Error('measureText: Text must be a string');
        }
        let textLength = 0;
        for(let i = 0; i < text.length; i++){
            textLength += this.characterWidths.get(text[i]) + this.letterSpacing;
        }
        return textLength;
    }
}
</script>
