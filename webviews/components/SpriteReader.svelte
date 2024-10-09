<script context="module">
    import { get } from 'svelte/store';
    import { preloadedSpriteSheets } from './store.js';
    import pako from 'pako'; // Make sure to import pako for decompression

    let spriteData = null;
    export function spriteReader(spriteWidth, spriteHeight, pixelMatrix, trimWidth = spriteWidth, trimHeight = spriteHeight) {
        if (!pixelMatrix || !Array.isArray(pixelMatrix) || pixelMatrix.length === 0) {
            console.error('Invalid sprite matrix provided:', pixelMatrix);
            return [];
        }

        // Check if pixelMatrix[0] is defined and is an array
        if (!pixelMatrix[0] || !Array.isArray(pixelMatrix[0])) {
            console.error('Invalid sprite matrix[0] provided:', pixelMatrix[0]);
            return [];
        }

        let sprites = [];

        const spriteCountWidth = Math.floor(pixelMatrix[0].length / spriteWidth); // Use Math.floor() here
        const spriteCountHeight = Math.floor(pixelMatrix.length / spriteHeight); // Optional: Also here for consistency

        // Loop over each sprite
        for (let y = 0; y < spriteCountHeight; y++) {
            for (let x = 0; x < spriteCountWidth; x++) {
                let sprite = [];
                // Each y level of sprite
                for (let sy = 0; sy < trimHeight; sy++) {
                    if (pixelMatrix[y * trimHeight + sy]) {
                        // Add the x level of sprite as an array
                        sprite.push(pixelMatrix[y * spriteHeight + sy].slice(x * spriteWidth, (x * spriteWidth) + trimWidth));
                    } else {
                        console.warn(`Invalid index y:${y + sy}`);
                        break;
                    }
                }
                if (sprite.length === trimHeight) {
                    sprites.push(sprite);
                }
            }
        }
        return sprites;
    }

    export async function loadSpriteData(base64Data) {
        const decompressedData = await decompressData(base64Data);
        spriteData = parseSpriteData(decompressedData);
        await preloadAllSpriteSheets();
        return spriteData;
    }

    async function decompressData(base64Data) {
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return pako.inflate(bytes);
    }

function parseSpriteData(decompressedData) {
    const dataView = new DataView(decompressedData.buffer);
    let offset = 0;

    const paletteSize = dataView.getUint32(offset, true);
    offset += 4;
    const bitsPerIndex = dataView.getUint16(offset, true);
    offset += 2;

    const palette = [];
    for (let i = 0; i < paletteSize; i++) {
        const r = dataView.getUint8(offset);
        const g = dataView.getUint8(offset + 1);
        const b = dataView.getUint8(offset + 2);
        const a = dataView.getUint8(offset + 3);
        
        if (r === 0 && g === 0 && b === 0 && a === 0) {
            palette.push('transparent');
        } else {
            palette.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
        }
        offset += 4;
    }

    const FILE_NAME_LENGTH = 32;
    const sprites = {};

    while (offset < decompressedData.length) {
        let spriteName = new TextDecoder().decode(decompressedData.slice(offset, offset + FILE_NAME_LENGTH)).replace(/\0/g, '');
        offset += FILE_NAME_LENGTH;
        
        spriteName = spriteName.replace(/\.png$/, '');
        
        const width = dataView.getUint16(offset, true);
        offset += 2;
        const height = dataView.getUint16(offset, true);
        offset += 2;

        const indices = unpackIndices(decompressedData, offset, width * height, bitsPerIndex);
        offset += Math.ceil((width * height * bitsPerIndex) / 8);

        sprites[spriteName] = { width, height, indices };
    }

    return { palette, sprites, bitsPerIndex };
}

function unpackIndices(data, startOffset, count, bitsPerIndex) {
    const indices = [];
    let bitOffset = 0;
    let byteOffset = startOffset;
    let currentByte = data[byteOffset];

    for (let i = 0; i < count; i++) {
        let index = 0;
        let bitsRead = 0;
        while (bitsRead < bitsPerIndex) {
            const availableBits = 8 - bitOffset;
            const bitsToRead = Math.min(bitsPerIndex - bitsRead, availableBits);
            const mask = (1 << bitsToRead) - 1;
            index |= ((currentByte >> bitOffset) & mask) << bitsRead;

            bitOffset += bitsToRead;
            bitsRead += bitsToRead;

            if (bitOffset === 8) {
                byteOffset++;
                currentByte = data[byteOffset];
                bitOffset = 0;
            }
        }
        indices.push(index);
    }
    return indices;
}

async function preloadAllSpriteSheets() {
    if (!spriteData) {
        console.error('Sprite data not loaded');
        return;
    }

    const preloadPromises = Object.entries(spriteData.sprites).map(([name, sprite]) => 
        preloadSpriteSheet(name, sprite)
    );

    await Promise.all(preloadPromises);
}

async function preloadSpriteSheet(name, spriteInfo) {
    const pixelMatrix = convertIndicesToPixelMatrix(spriteInfo);
    preloadedSpriteSheets.update(sheets => ({
        ...sheets,
        [name]: pixelMatrix
    }));
}

function convertIndicesToPixelMatrix({ width, height, indices }) {
    const pixelMatrix = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            const index = indices[y * width + x];
            const color = spriteData.palette[index];
            row.push(color);
        }
        pixelMatrix.push(row);
    }
    return pixelMatrix;
}

export function spriteReaderFromStore(spriteWidth, spriteHeight, spriteSheetFile, trimWidth = spriteWidth, trimHeight = spriteHeight) {
    const preloaded = get(preloadedSpriteSheets);
    if (!preloaded || !spriteData) {
        console.error('Sprite data not loaded');
        return [];
    }

    let pixelMatrix = preloaded[spriteSheetFile];
    if (!pixelMatrix) {
        pixelMatrix = preloaded[spriteSheetFile.replace(/\.png$/, '')];
    }
    if (!pixelMatrix) {
        pixelMatrix = preloaded[`${spriteSheetFile}.png`];
    }

    if (!pixelMatrix) {
        console.error('Sprite sheet not found:', spriteSheetFile);
        return [];
    }
    console.log("Reading sprite: ", spriteSheetFile, " pixel matrix: ", pixelMatrix)

    return spriteReader(spriteWidth, spriteHeight, pixelMatrix, trimWidth, trimHeight);
}

function indexToColor(colorValue) {
    return colorValue;
}
</script>