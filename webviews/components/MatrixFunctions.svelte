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
        filledWidth
    ) {
        // Create the outer border
        const borderSprite = generateRectangleMatrix(width, height, borderColor);

        // Create the inner background
        const innerWidth = width - 2; // Adjust for border
        const innerHeight = height - 2; // Adjust for border
        const backgroundSprite = generateRectangleMatrix(innerWidth, innerHeight, bgColor);

        // Overlay the background onto the border
        overlayMatrix(borderSprite, backgroundSprite, 1, 1);

        // Create the filled part of the status bar
        if (filledWidth > 0) {
            const statusBarSprite = generateRectangleMatrix(filledWidth, innerHeight, statusBarColor);
            overlayMatrix(borderSprite, statusBarSprite, 1, 1);
        }

        return borderSprite;
    }

    export function generateStatusBarSpriteSheet(
        width,
        height,
        borderColor,
        bgColor,
        statusBarColor
    ) {
        let spriteSheet = [];

        for (let i = 0; i < width - 2; i++) {
            const statusBarSprite = generateStatusBarSprite(width, height, borderColor, bgColor, statusBarColor, i);
            if (i === 0) {
                spriteSheet = statusBarSprite;
            } else {
                spriteSheet = concatenateMatrixes(spriteSheet, statusBarSprite);
            }
        }

        return spriteReader(width, height, spriteSheet);
    }
</script>
