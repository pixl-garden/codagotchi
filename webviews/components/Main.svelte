<script>
    import { onMount, afterUpdate } from 'svelte';
    import { generateScreen, spriteReader, preloadAllSpriteSheets, Sprite, createTextRenderer } from './Codagotchi.svelte';
    import { images } from './store.js';

    // Variables and Constants
    const SCREENWIDTH = 162;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let padding = (width - SCREENWIDTH) / 2;
    let screen = [];
    let renderBasicText;

    onMount(async () => {
        window.addEventListener('message', async (event) => {
            const message = event.data;
            if (message.type === 'image-uris') {
                images.set(message.uris);

                //wait until all sprites are loaded
                await preloadAllSpriteSheets().then( () => {

                    // //subscribe screen to spriteStore (when spriteStore updates every tick, screen updates)
                    // const unsubscribe = spriteStore.subscribe(sprites => {
                    //     screen = generateScreen(sprites, 26, 36);
                    // });

                    //start main loop
                    renderBasicText = createTextRenderer('charmap1.png', 7, 9, ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`);
                    setInterval(main, 100);
                })
            }
        });
        tsvscode.postMessage({ type: 'webview-ready' });
        window.addEventListener('resize', handleResize);
    });

    function handleResize() {
        width = window.innerWidth;
        height = window.innerHeight;
        padding = (width - SCREENWIDTH) / 2;
        document.documentElement.style.setProperty('--container-padding', `${padding}px`);
    }

    afterUpdate(() => {
        document.documentElement.style.setProperty('--container-padding', `${padding}px`);
    });

    //main loop
    function main() {

        // let sprites = spriteReader(7, 9, 'charmap1.png');
        // const sprite1 = new Sprite(sprites[4], 0, 0);  // Example
        let sprites = renderBasicText("ABCDEFG", 0, 0);

        // Update the store with new data
        // console.log(sprites)
        screen = generateScreen(sprites, 54, 54);
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