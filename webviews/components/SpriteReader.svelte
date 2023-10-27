<script context="module">
    import { get } from 'svelte/store';
    import { images, preloadedSpriteSheets } from './store.js';

    // Update spriteReader to extract individual sprites from the preloaded sprite sheets
    export function spriteReader(spriteWidth, spriteHeight, spriteSheet) {
        const pixelSheet = get(preloadedSpriteSheets)[spriteSheet];
        if (!pixelSheet) {
            console.error("Sprite sheet not preloaded:", spriteSheet);
            return [];
        }

        let sprites = [];
        let spriteCount = 0;

        //iterate by sprite size
        const spriteCountWidth = pixelSheet[0].length / spriteWidth;
        const spriteCountHeight = pixelSheet.length / spriteHeight;

        //loop over each sprite
        for (let y = 0; y < spriteCountHeight; y++){
            for (let x = 0; x < spriteCountWidth; x++){
                let sprite = [];
                //each y level of sprite
                for (let sy = 0; sy < spriteHeight; sy++){
                    if (pixelSheet[(y * spriteHeight) + sy]) {
                        //add the x level of sprite as an array
                        sprite.push(pixelSheet[(y * spriteHeight) + sy].slice(x * spriteWidth, (x + 1) * spriteWidth));
                    } else {
                        console.warn(`Invalid index y:${y + sy} for spriteSheet:${spriteSheet}`);
                        break;
                    }
                }
                if (sprite.length === spriteHeight) {
                    sprites.push(sprite);
                }
                spriteCount++;
            }
        }
        
        return sprites;
    }

    export async function preloadAllSpriteSheets() {
        for (let spriteSheet in get(images)) {
            const pixelSheet = await spriteSheetToPixels(spriteSheet);
            preloadedSpriteSheets.update(sheets => {
                sheets[spriteSheet] = pixelSheet;
                return sheets;
            });
        }
    }

    async function spriteSheetToPixels(spriteSheet) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = get(images)[spriteSheet];
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                let colorData = [];
                for (let y = 0; y < img.height; y++) {
                    let row = [];
                    for (let x = 0; x < img.width; x++) {
                        const pixel = ctx.getImageData(x, y, 1, 1).data;
                        if (pixel[3] === 0) {
                            row.push("transparent");
                        } else {
                            const hexColor = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase();
                            row.push(hexColor);
                        }
                    }
                    colorData.push(row);
                }
                resolve(colorData);
            };
            img.onerror = () => reject("Failed to load image");
        });
    }
  </script>
  