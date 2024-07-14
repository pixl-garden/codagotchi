<script context="module">
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import { generateEmptyMatrix, concatenateMatrixes } from './MatrixFunctions.svelte';

    /**
    * Class for rendering text, use renderText method to render text
    * @param {string} charmap The name of the spriteSheet to use
    * @param {number} spriteWidth The width of the character sprites
    * @param {number} spriteHeight The height of the character sprites
    * @param {string} backgroundColor The background color of the spritesheet
    * @param {string|string[]} foregroundColor The color of the text in the spritesheet, can be a single color or an array of colors for multi-color text rendering
    * @param {string|string[]} renderColor The color of the rendered text, can be a single color or an array of colors for multi-color text rendering (must match the length of foregroundColor)
    * @param {number} letterSpacing The space between characters
    * @param {string} charMappingString A string containing all the characters in the spritesheet in order
    * @param {string} textShadowColor The color of the text shadow
    * @param {number} textShadowXOffset The x offset of the text shadow
    * @param {number} textShadowYOffset The y offset of the text shadow
    */
export class TextRenderer {
    constructor (
        charmap,
        spriteWidth,
        spriteHeight,
        backgroundColor,
        foregroundColor,
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
        this.foregroundColor = foregroundColor;
        this.renderColor = renderColor;
        this.letterSpacing = letterSpacing;
        this.charMappingString = charMappingString;
        this.textShadowColor = textShadowColor;
        this.textShadowXOffset = textShadowXOffset;
        this.textShadowYOffset = textShadowYOffset;
        this.characterWidths = new Map();

        this.displayedText = "";
        this.text = "";

        // If renderColor is an array, set renderColorCount to the length of the array, otherwise set it to 1
        this.foregroundColorCount = Array.isArray(this.foregroundColor) ? this.foregroundColor.length : 1;

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

    // return the text with overflow characters at the specified position if the text exceeds the maxWidth
    getOverflowText(text, overflowPosition, maxWidth) {
        let resultText = text;
        let concatText = text
        // remove characters until ellipses will fit within max width
        while (this.measureText(resultText) > maxWidth) {
                if(overflowPosition === "left") {
                    concatText = concatText.slice(1);  // continuously remove the first character
                    resultText = "..." + concatText;
                } else if(overflowPosition === "right") {
                    concatText = concatText.slice(0, -1);  // continuously remove the last character
                    resultText = concatText + "...";
                } else {
                    throw Error("Invalid overflow position, please select either left or right")
                }
            }
        return resultText
    }

    // function for trimming excess pixels from the sides of the character sprites (used for non-monospaced font rendering)
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
     * @param {string} position The position of the text, can be "left", "center" or "right"
     * @param {string} overflowPosition The position of the text overflowing (...llo or hel...), can be "left" or "right"
     * @param {number} maxWidth The maximum width of the rendered text, used for overflow text and center/right positioning
     * @returns {string[][]} Matrix of pixels (color strings) representing the rendered text
     */
    renderText(text, { renderColor = this.renderColor, textShadowColor = this.textShadowColor, position = "left", overflowPosition = null, maxWidth = 128 } = {}) {
        if (typeof text !== 'string') {
            throw new Error('renderText: Text must be a string');
        }
        if (this.foregroundColorCount > 1 && renderColor.length !== this.foregroundColorCount) {
            throw new Error('renderText: renderColor must be an array of the same length as the renderer\'s renderColor for multi-color text rendering');
        }
        this.text = text;
        
        // Used to calculate the x position of each character in the rendered text
        let currentWidth = 0;
        const characterOffsets = [];
        
        // If overflow is specified get overflow text
        if(overflowPosition != null) {
            this.displayedText = this.getOverflowText(text, overflowPosition, maxWidth);
        } else {
            this.displayedText = text;
        }

        // Set characterOffsets for each character in the text
        for (let i = 0; i < this.displayedText.length; i++) {
            const char = this.displayedText[i];
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
        let matrix = Array(matrixHeight).fill(null).map(() => Array(currentWidth).fill(this.backgroundColor));

        for (let y = 0; y < matrixHeight; y++) {
            for (let x = 0; x < currentWidth; x++) {
                if (matrix[y][x] === this.backgroundColor) {
                    matrix[y][x] = 'transparent';
                }
            }
        }

        this.displayedText.split('').forEach((char, i) => {
            const spriteIndex = this.charToSpriteIndex[char];
            const sprite = this.currentCharSprites[spriteIndex];

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
                        if(this.foregroundColorCount > 1){
                            let foregroundIndex = this.foregroundColor.indexOf(pixel)
                            matrix[y][posX] = renderColor[foregroundIndex];
                        }
                        else{
                            matrix[y][posX] = renderColor;
                        }
                    }
                });
            });
        });
        
        // move text to specified position
        // Add padding to left for center and right positioning
        if(position === "right"){
            let leftPadding = maxWidth - this.measureText(this.displayedText);
            let leftPaddingMatrix = generateEmptyMatrix(leftPadding, matrixHeight);
            matrix = concatenateMatrixes(leftPaddingMatrix, matrix);
        } else if(position === "center"){
            let leftPadding = Math.floor((maxWidth - this.measureText(this.displayedText)) / 2);
            let leftPaddingMatrix = generateEmptyMatrix(leftPadding, matrixHeight);
            matrix = concatenateMatrixes(leftPaddingMatrix, matrix);
        } else if(position !== "left"){
            throw Error("Invalid position, please select either left, center or right")
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
