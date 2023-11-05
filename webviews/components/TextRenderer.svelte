<script context="module">
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import { replaceMatrixColor } from './MatrixFunctions.svelte';

    //export a function that renders text
    export function createTextRenderer(
        charmap,
        spriteWidth,
        spriteHeight,
        backgroundColor = null,
        letterSpacing = 0,
        charMappingString,
    ) {
        let charSprites = spriteReaderFromStore(spriteWidth, spriteHeight, charmap);

        console.log(charMappingString.split(''));
        // Convert charMappingString to an array of characters
        const charsArray = Array.from(charMappingString);
        console.log('CHARS ARRAY: ', charsArray);

        // Create mapping from charsArray
        const charToSpriteIndex = {};
        for (let i = 0; i < charsArray.length; i++) {
            charToSpriteIndex[charsArray[i]] = i;
        }

        //takes in a string and returns a sprite matrix for the entire text
        return function renderText(text) {
            const matrix = Array(spriteHeight)
                .fill(null)
                .map(() => []);

            for (const char of text) {
                if (char === '\n') {
                    // If newline is encountered, this renderer currently does not handle multi-line text
                    // Therefore, we will reset the matrix, but you may adjust as needed for multi-line support
                    matrix.forEach((row) => (row.length = 0));
                    continue;
                }

                if (charToSpriteIndex[char] !== undefined) {
                    const spriteIndex = charToSpriteIndex[char];
                    for (let y = 0; y < spriteHeight; y++) {
                        matrix[y].push(...charSprites[spriteIndex][y]);
                    }

                    // Apply letterSpacing
                    if (letterSpacing !== 0) {
                        for (let y = 0; y < spriteHeight; y++) {
                            for (let s = 0; s < Math.abs(letterSpacing); s++) {
                                if (letterSpacing > 0) {
                                    matrix[y].push(backgroundColor); // Add spacing with background color
                                } else {
                                    matrix[y].pop(); // Remove spacing (ensure not to remove more than the sprite width)
                                }
                            }
                        }
                    }
                }
            }
            return backgroundColor ? replaceMatrixColor(matrix, backgroundColor, 'transparent') : matrix;
        };
    }

    // Example instantiation
    // const renderBasicText = createTextRenderer('basic.png', 8, 8, 'black', -3, ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
</script>
