const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const zlib = require('zlib');

const SPRITE_DIR = path.join(__dirname, '..', 'images');
const OUTPUT_FILE = path.join(__dirname, '..', 'media', 'spriteData.bin');
const MAX_PALETTE_SIZE = 16777216; // 2^24, maximum possible colors in 24-bit RGB
const FILE_NAME_LENGTH = 32;
const TRANSPARENT_INDEX = 0;

function rgbaToHex(r, g, b, a) {
    // Return a special value for fully transparent pixels
    if (a === 0) {
        return 'transparent';
    }
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
}

function calculateBitsNeeded(numColors) {
    return Math.ceil(Math.log2(numColors));
}

function packIndices(indices, bitsPerIndex) {
    const packedData = [];
    let currentByte = 0;
    let bitsWritten = 0;

    for (const index of indices) {
        currentByte |= (index << bitsWritten);
        bitsWritten += bitsPerIndex;

        while (bitsWritten >= 8) {
            packedData.push(currentByte & 0xFF);
            currentByte >>= 8;
            bitsWritten -= 8;
        }
    }

    if (bitsWritten > 0) {
        packedData.push(currentByte);
    }

    return Buffer.from(packedData);
}

async function convertSprites() {
    const sprites = {};
    const palette = new Map();
    let paletteIndex = 1; // Start at 1, reserving 0 for transparent

    // Add transparent color as the first entry in the palette
    palette.set('transparent', TRANSPARENT_INDEX);

    const files = fs.readdirSync(SPRITE_DIR).filter(file => file.endsWith('.png'));

    for (const file of files) {
        const filePath = path.join(SPRITE_DIR, file);
        const image = await loadImage(filePath);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, image.width, image.height);

        const spriteData = [];
        for (let i = 0; i < imageData.data.length; i += 4) {
            const color = rgbaToHex(
                imageData.data[i],
                imageData.data[i + 1],
                imageData.data[i + 2],
                imageData.data[i + 3]
            );

            let index;
            if (color === 'transparent') {
                index = TRANSPARENT_INDEX;
            } else {
                index = palette.get(color);
                if (index === undefined) {
                    if (paletteIndex >= MAX_PALETTE_SIZE) {
                        console.warn(`Warning: Palette size exceeds ${MAX_PALETTE_SIZE} colors. Some colors will be approximated.`);
                        index = Math.floor(Math.random() * (MAX_PALETTE_SIZE - 1)) + 1; // Avoid using 0
                    } else {
                        index = paletteIndex++;
                        palette.set(color, index);
                    }
                }
            }
            spriteData.push(index);
        }

        sprites[file] = {
            width: image.width,
            height: image.height,
            data: spriteData
        };
    }

    const paletteArray = Array.from(palette.entries()).sort((a, b) => a[1] - b[1]).map(([color]) => color);
    const bitsPerIndex = calculateBitsNeeded(paletteArray.length);

    // Prepare binary data
    const chunks = [];

    // Write header: palette size, bits per index
    const headerBuffer = Buffer.alloc(6);
    headerBuffer.writeUInt32LE(paletteArray.length, 0);
    headerBuffer.writeUInt16LE(bitsPerIndex, 4);
    chunks.push(headerBuffer);

    // Write palette
    const paletteBuffer = Buffer.alloc(paletteArray.length * 4); // 4 bytes per color (RGBA)
    paletteArray.forEach((color, index) => {
        if (color === 'transparent') {
            // Write a special value for transparent (all zeros)
            paletteBuffer.writeUInt32LE(0, index * 4);
        } else {
            const r = parseInt(color.substr(1, 2), 16);
            const g = parseInt(color.substr(3, 2), 16);
            const b = parseInt(color.substr(5, 2), 16);
            const a = parseInt(color.substr(7, 2), 16);
            paletteBuffer.writeUInt8(r, index * 4);
            paletteBuffer.writeUInt8(g, index * 4 + 1);
            paletteBuffer.writeUInt8(b, index * 4 + 2);
            paletteBuffer.writeUInt8(a, index * 4 + 3);
        }
    });
    chunks.push(paletteBuffer);

    // Write sprites
    for (const [name, sprite] of Object.entries(sprites)) {
        const nameBuffer = Buffer.alloc(FILE_NAME_LENGTH);
        nameBuffer.write(name.slice(0, FILE_NAME_LENGTH - 1), 0, FILE_NAME_LENGTH - 1);
        chunks.push(nameBuffer);

        const sizeBuffer = Buffer.alloc(4);
        sizeBuffer.writeUInt16LE(sprite.width, 0);
        sizeBuffer.writeUInt16LE(sprite.height, 2);
        chunks.push(sizeBuffer);

        const packedData = packIndices(sprite.data, bitsPerIndex);
        chunks.push(packedData);
    }

    const combinedBuffer = Buffer.concat(chunks);
    const compressedBuffer = zlib.deflateSync(combinedBuffer);

    fs.writeFileSync(OUTPUT_FILE, compressedBuffer);
    console.log(`Compressed sprite data written to ${OUTPUT_FILE}`);
    console.log(`Total colors in palette: ${paletteArray.length}`);
    console.log(`Bits per index: ${bitsPerIndex}`);
    console.log(`Original size: ${combinedBuffer.length} bytes`);
    console.log(`Compressed size: ${compressedBuffer.length} bytes`);
}

convertSprites().catch(console.error);