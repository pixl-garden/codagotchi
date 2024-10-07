const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const zlib = require('zlib');

const SPRITE_DIR = path.join(__dirname, '..', 'images');
const OUTPUT_FILE = path.join(__dirname, '..', 'media', 'spriteData.bin');
const MAX_PALETTE_SIZE = 8192;

function rgbaToRGB565(r, g, b, a) {
    if (a < 128) return 0;
    const r5 = (r >> 3) & 0x1F;
    const g6 = (g >> 2) & 0x3F;
    const b5 = (b >> 3) & 0x1F;
    return (r5 << 11) | (g6 << 5) | b5;
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
    let paletteIndex = 0;

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
            const color = rgbaToRGB565(
                imageData.data[i],
                imageData.data[i + 1],
                imageData.data[i + 2],
                imageData.data[i + 3]
            );

            let index = palette.get(color);
            if (index === undefined) {
                if (paletteIndex >= MAX_PALETTE_SIZE) {
                    console.warn(`Warning: Palette size exceeds ${MAX_PALETTE_SIZE} colors. Some colors will be approximated.`);
                    index = Math.floor(Math.random() * MAX_PALETTE_SIZE);
                } else {
                    index = paletteIndex++;
                    palette.set(color, index);
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

    const paletteArray = Array.from(palette.keys());
    const bitsPerIndex = calculateBitsNeeded(paletteArray.length);

    // Prepare binary data
    const chunks = [];

    // Write header: palette size, bits per index
    const headerBuffer = Buffer.alloc(6);
    headerBuffer.writeUInt32LE(paletteArray.length, 0);
    headerBuffer.writeUInt16LE(bitsPerIndex, 4);
    chunks.push(headerBuffer);

    // Write palette
    const paletteBuffer = Buffer.alloc(paletteArray.length * 2);
    paletteArray.forEach((color, index) => {
        paletteBuffer.writeUInt16LE(color, index * 2);
    });
    chunks.push(paletteBuffer);

    // Write sprites
    for (const [name, sprite] of Object.entries(sprites)) {
        const nameBuffer = Buffer.alloc(8);
        nameBuffer.write(name.padEnd(8, '\0'), 0, 8);
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

    fs.writeFileSync(OUTPUT_FILE, combinedBuffer);
    console.log(`Compressed sprite data written to ${OUTPUT_FILE}`);
    console.log(`Total colors in palette: ${paletteArray.length}`);
    console.log(`Bits per index: ${bitsPerIndex}`);
    console.log(`Original size: ${combinedBuffer.length} bytes`);
    console.log(`Compressed size: ${compressedBuffer.length} bytes`);
}

convertSprites().catch(console.error);