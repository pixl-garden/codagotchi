<script context="module">
    import { Sprite, spriteReader } from './Codagotchi.svelte';
    import { spritesLoaded } from './store.js'

    

    export function createTextRenderer(charmap, spriteWidth, spriteHeight, charMappingString) {
        let charSprites = spriteReader(spriteWidth, spriteHeight, charmap);
        let sprites = [];
        
        // Create mapping from charMappingString
        const charToSpriteIndex = {};
        for (let i = 0; i < charMappingString.length; i++) {
            charToSpriteIndex[charMappingString[i]] = i;
        }

        return function renderText(text, startX, startY) {
            let x = startX;
            let y = startY;
            let newSprites = [];

            for (const char of text) {
                if (char === '\n') {
                    y += spriteHeight;
                    x = startX;
                    continue;
                }
                if (charToSpriteIndex[char] !== undefined) {
                    const spriteIndex = charToSpriteIndex[char];
                    const sprite = new Sprite(charSprites[spriteIndex], x, y);
                    newSprites.push(sprite);
                    x += spriteWidth;
                }
            }
            return newSprites;
        };
    }

    // Example instantiation
    export const renderBasicText = createTextRenderer('charmap1.png', 7, 9, ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`);
</script>