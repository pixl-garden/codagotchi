<script>
    import { onMount, afterUpdate } from 'svelte';
    import { generateScreen, spriteReader, preloadAllSpriteSheets, Sprite, createTextRenderer } from './Codagotchi.svelte';
    import { images } from './store.js';

    // Variables and Constants
    const gridWidth = 48;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let pixelSize = Math.floor(width / gridWidth);
    let screenWidth = gridWidth * pixelSize;
    let padding = (width - screenWidth) / 2;
    let screen = [];
    let renderBasicText;
    let offset = -50;

    onMount(async () => {
        window.addEventListener('message', async (event) => {
            const message = event.data;
            if (message.type === 'image-uris') {
                images.set(message.uris);

                //wait until all sprites are loaded
                await preloadAllSpriteSheets().then( () => {
                    handleResize();
                    renderBasicText = createTextRenderer('charmap1.png', 7, 9, ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`);
                    setInterval(main, 40);
                })
            }
        });
        tsvscode.postMessage({ type: 'webview-ready' });
        window.addEventListener('resize', handleResize);
    });
    
    function handleResize() {
        width = window.innerWidth;
        height = window.innerHeight;
        pixelSize = Math.floor(width / gridWidth); // update pixelSize here
        screenWidth = gridWidth * pixelSize; // update screenWidth here
        padding = (width - screenWidth) / 2;
        document.documentElement.style.setProperty('--container-padding', `${padding}px`);
        document.documentElement.style.setProperty('--pixel-size', `${pixelSize}px`);
        document.documentElement.style.setProperty('--screen-width', `${screenWidth}px`);
    }

    //main loop
    function main() {
        let sprites = renderBasicText("bruh", offset, 0);
        offset++;
        if(offset >= 7*7){
            offset = -50;
        }

        screen = generateScreen(sprites, 48, 48);
    }
</script>

<div class="grid-container">
    {#each screen as row}
        <div class="row">
            {#each row as cell}
                <div class="pixel" style="background-color: {cell ? 'white' : 'transparent'};"></div>
            {/each}
        </div>
    {/each}
</div>