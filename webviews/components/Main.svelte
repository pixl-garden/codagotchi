<script context="module">
    import { writable, get } from 'svelte/store';
    import { Sprite } from './SpriteComponent.svelte';
    import { spriteReader } from './spriteReader.svelte';

    // Create a writable store
    export const spriteStore = writable([]);

    // This is your main game logic function
    function main() {
        let sprites = spriteReader(7, 9, 'charmap1.png');
        const sprite1 = new Sprite(sprites[4], 0, 0);  // Example

        // Update the store with new data
        spriteStore.set([sprite1]);
    }

    // When Main.svelte is instantiated, start the game loop
    setInterval(main, 100); // Execute `main` 10 times a second (every 100ms)
</script>