<script context="module">
    import { get } from 'svelte/store';
    import { images, preloadedSpriteSheets } from './store.js';

    // Update spriteReader to extract individual sprites from the preloaded sprite sheets
    export function spriteReader(spriteWidth, spriteHeight, spriteSheet) {
        const binarySheet = get(preloadedSpriteSheets)[spriteSheet];
        if (!binarySheet) {
            console.error("Sprite sheet not preloaded:", spriteSheet);
            return [];
        }

        let sprites = [];
        for (let y = 0; y <= binarySheet.length - spriteHeight; y += spriteHeight) {
            for (let x = 0; x <= (binarySheet[y] ? binarySheet[y].length : 0) - spriteWidth; x += spriteWidth) {
                let sprite = [];
                for (let sy = 0; sy < spriteHeight; sy++) {
                    if (binarySheet[y + sy]) {
                        sprite.push(binarySheet[y + sy].slice(x, x + spriteWidth));
                    } else {
                        console.warn(`Invalid index y:${y + sy} for spriteSheet:${spriteSheet}`);
                        break;
                    }
                }
                if (sprite.length === spriteHeight) {
                    sprites.push(sprite);
                }
            }
        }
        return sprites;
    }

    export async function preloadAllSpriteSheets() {
        for (let spriteSheet in get(images)) {
            const binarySheet = await spriteSheetToBinary(spriteSheet);
            preloadedSpriteSheets.update(sheets => {
                sheets[spriteSheet] = binarySheet;
                return sheets;
            });
        }
    }

    async function spriteSheetToBinary(spriteSheet) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = get(images)[spriteSheet];
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                let binaryData = [];
                for (let y = 0; y < img.height; y++) {
                    let row = [];
                    for (let x = 0; x < img.width; x++) {
                        const pixel = ctx.getImageData(x, y, 1, 1).data;
                        if (pixel[3] === 0 || (pixel[0] > 250 && pixel[1] > 250 && pixel[2] > 250)) {
                            row.push(0);
                        } else {
                            row.push(1);
                        }
                    }
                    binaryData.push(row);
                }
                resolve(binaryData);
            };
            img.onerror = () => reject("Failed to load image");
        });
    }
  </script>
  