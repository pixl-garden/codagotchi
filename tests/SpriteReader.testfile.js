function spriteReader(spriteWidth, spriteHeight, spriteSheet) {
    const { get } = require('svelte/store');
    const { preloadedSpriteSheets } = require('../webviews/components/store.js');
    const pixelSheet = get(preloadedSpriteSheets)[spriteSheet];
    if (!pixelSheet) {
        console.error('Sprite sheet not preloaded:', spriteSheet);
        return [];
    }

    let sprites = [];
    let spriteCount = 0;

    //iterate by sprite size
    const spriteCountWidth = pixelSheet[0].length / spriteWidth;
    const spriteCountHeight = pixelSheet.length / spriteHeight;

    //loop over each sprite
    for (let y = 0; y < spriteCountHeight; y++) {
        for (let x = 0; x < spriteCountWidth; x++) {
            let sprite = [];
            //each y level of sprite
            for (let sy = 0; sy < spriteHeight; sy++) {
                if (pixelSheet[y * spriteHeight + sy]) {
                    //add the x level of sprite as an array
                    sprite.push(pixelSheet[y * spriteHeight + sy].slice(x * spriteWidth, (x + 1) * spriteWidth));
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

module.exports = {
    spriteReader: spriteReader,
};
