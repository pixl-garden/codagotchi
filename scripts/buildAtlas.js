/* eslint-disable curly */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Configuration
const SPRITE_DIR = './images1';
const OUTPUT_IMAGE = './media/atlas.png';
const OUTPUT_JSON = './webviews/components/config/atlas.json';
const PADDING = 1; // 1px padding prevents texture bleeding in WebGL

class GrowingPacker {
    constructor() { this.root = null; }

    fit(blocks) {
        if (blocks.length === 0) return;
        this.root = { x: 0, y: 0, w: blocks[0].w, h: blocks[0].h };
        for (let block of blocks) {
            let node = this.findNode(this.root, block.w, block.h);
            block.fit = node ? this.splitNode(node, block.w, block.h) : this.growNode(block.w, block.h);
        }
    }

    findNode(root, w, h) {
        if (root.used) return this.findNode(root.right, w, h) || this.findNode(root.down, w, h);
        else if ((w <= root.w) && (h <= root.h)) return root;
        return null;
    }

    splitNode(node, w, h) {
        node.used = true;
        node.down  = { x: node.x, y: node.y + h, w: node.w, h: node.h - h };
        node.right = { x: node.x + w, y: node.y, w: node.w - w, h: h };
        return node;
    }

    growNode(w, h) {
        const canGrowDown  = (w <= this.root.w);
        const canGrowRight = (h <= this.root.h);

        // Attempt to keep the atlas somewhat square
        const shouldGrowRight = canGrowRight && (this.root.h >= (this.root.w + w));
        const shouldGrowDown  = canGrowDown  && (this.root.w >= (this.root.h + h));

        if (shouldGrowRight) return this.growRight(w, h);
        else if (shouldGrowDown) return this.growDown(w, h);
        else if (canGrowRight) return this.growRight(w, h);
        else if (canGrowDown) return this.growDown(w, h);
        return null; 
    }

    growRight(w, h) {
        this.root = {
            used: true, x: 0, y: 0, w: this.root.w + w, h: this.root.h,
            down: this.root, right: { x: this.root.w, y: 0, w: w, h: this.root.h }
        };
        let node = this.findNode(this.root, w, h);
        if (node) return this.splitNode(node, w, h);
        return null;
    }

    growDown(w, h) {
        this.root = {
            used: true, x: 0, y: 0, w: this.root.w, h: this.root.h + h,
            down: { x: 0, y: this.root.h, w: this.root.w, h: h }, right: this.root
        };
        let node = this.findNode(this.root, w, h);
        if (node) return this.splitNode(node, w, h);
        return null;
    }
}

async function buildAtlas() {
    console.log('Building texture atlas...');
// 1. Read metadata for all images with explicit filtering and error handling
    const files = fs.readdirSync(SPRITE_DIR).filter(f => 
        f.endsWith('.png') && !f.startsWith('._') // Exclude macOS metadata files
    );

    const blocks = [];

    for (const file of files) {
        const filePath = path.join(SPRITE_DIR, file);

        // Skip 0-byte files
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
            console.warn(`[SKIP] File is empty (0 bytes): ${file}`);
            continue;
        }

        try {
            const metadata = await sharp(filePath).metadata();
            
            blocks.push({
                name: path.parse(file).name,
                file: filePath,
                width: metadata.width,
                height: metadata.height,
                w: metadata.width + (PADDING * 2),
                h: metadata.height + (PADDING * 2)
            });
        } catch (err) {
            console.error(`[ERROR] Invalid PNG file "${file}": ${err.message}`);
        }
    }

    if (blocks.length === 0) {
        console.log('No valid PNGs found to pack.');
        return;
    }

    // 2. Sort by max dimension descending for tightest packing
    blocks.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));

    // 3. Run the bin packing algorithm
    const packer = new GrowingPacker();
    packer.fit(blocks);

    const atlasWidth = packer.root.w;
    const atlasHeight = packer.root.h;

    // 4. Prepare data for sharp composite and JSON index
    const compositeOperations = [];
    const atlasIndex = {};

    for (let block of blocks) {
        if (!block.fit) continue;

        // Calculate actual pixel positions (accounting for the padding)
        const x = block.fit.x + PADDING;
        const y = block.fit.y + PADDING;

        compositeOperations.push({
            input: block.file,
            top: y,
            left: x
        });

        // Pre-calculate WebGL UV coordinates (0.0 to 1.0)
        atlasIndex[`${block.name}.png`] = {
            x: x,
            y: y,
            w: block.width,
            h: block.height,
            uv: {
                minU: x / atlasWidth,
                minV: y / atlasHeight,
                maxU: (x + block.width) / atlasWidth,
                maxV: (y + block.height) / atlasHeight
            }
        };
    }

    // 5. Generate the composite image
    await sharp({
        create: {
            width: atlasWidth,
            height: atlasHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
    .composite(compositeOperations)
    .png()
    .toFile(OUTPUT_IMAGE);

    // 6. Save the JSON index map
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(atlasIndex, null, 2));

    console.log(`Atlas built successfully! Size: ${atlasWidth}x${atlasHeight}`);
}

buildAtlas().catch(console.error);