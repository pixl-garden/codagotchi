<script>
    import { onMount, afterUpdate } from 'svelte';
    import { writable } from 'svelte/store';
    import { Sprite } from './SpriteComponent.svelte';
    import { generateScreen } from './ScreenComponent.svelte';
    import { SpriteLoader } from './SpriteLoader.svelte';

    //RESIZE HANDLING
    const SCREENWIDTH = 146;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let padding = (width - SCREENWIDTH) / 2;

    let images = writable({});

    onMount(async () => {
        window.addEventListener('message', (event) => {
            const message = event.data;
            console.log('Received message:', message);
            if (message.type === 'image-uris') {
                images.set(message.uris);
            }
        });
        tsvscode.postMessage({ type: 'webview-ready' });
        window.addEventListener('resize', handleResize);
    }, 250);

    function handleResize() {
        width = window.innerWidth;
        height = window.innerHeight;
        padding = (width - SCREENWIDTH) / 2;
        document.documentElement.style.setProperty('--container-padding', `${padding}px`);
    }

    afterUpdate(() => {
        document.documentElement.style.setProperty('--container-padding', `${padding}px`);
    });

    let sprite1 = new Sprite([[1, 0], [0, 1]], 0, 0);
    let sprite2 = new Sprite([[0, 1], [1, 0]], 10, 10);
    let screen = generateScreen([sprite1, sprite2], 26, 36);
</script>

<div class="grid-container">
    <img src={$images['pet.png']} alt="1" />
    {#each screen as row}
        <div class="row">
            {#each row as cell}
                <div class="pixel" style="background-color: {cell ? 'white' : 'transparent'};"></div>
            {/each}
        </div>
    {/each}
</div>

<!-- <div class="grid-container">
        {#each $gridStore as row, rowIndex}
            {#each row as cell, colIndex}
                <div class="pixel" bind:this={cell.pixel} style="background-color: {cell.color};"></div>
            {/each}
        {/each}
</div> -->

<!-- let gridStore = writable([]);
let screens = {
    Screen1: getGrid1,
    Screen2: getGrid2,
    Screen3: getGrid3
};
let currentScreen = 'Screen1';

function switchScreen(screenName) {
    currentScreen = screenName;
} -->