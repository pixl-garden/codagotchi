<script context="module">
    import { writable, get } from 'svelte/store';
    import { Sprite } from './SpriteComponent.svelte';
    import { spriteReader } from './SpriteReader.svelte';
    import { renderBasicText, createTextRenderer } from './TextRenderer.svelte';

    // Create a writable store
    export const spriteStore = writable([]);

    // This is your main game logic function
    function main() {

        let sprites = spriteReader(7, 9, 'charmap1.png');
        const sprite1 = new Sprite(sprites[4], 0, 0);  // Example
        // let sprites = renderBasicText("ABC", 0, 0);

        // Update the store with new data
        // console.log(sprites)
        spriteStore.set([sprite1]);
    }

    // When Main.svelte is instantiated, start the game loop
    setInterval(main, 100); // Execute `main` 10 times a second (every 100ms)
</script>