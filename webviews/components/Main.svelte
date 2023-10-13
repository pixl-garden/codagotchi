<script>
    import { onMount, afterUpdate } from 'svelte';
    import { generateScreen, spriteReader, preloadAllSpriteSheets, Sprite, createTextRenderer } from './Codagotchi.svelte';
    import { images } from './store.js';
    import { Object } from './Object.svelte';
    
    const GRIDWIDTH = 48;
    const FPS = 15; //second / frames per second
    let width = window.innerWidth;
    let height = window.innerHeight;
    let pixelSize = Math.floor(width / GRIDWIDTH);
    let screenWidth = GRIDWIDTH * pixelSize;
    let screen = [];
    let padding;
    let renderBasicText;
    let myObject;
    let offset = -50;

    onMount(async () => {
        window.addEventListener('message', async (event) => {
            const message = event.data;
            if (message.type === 'image-uris') {
                images.set(message.uris);
                //wait until all sprites are loaded
                await preloadAllSpriteSheets().then( () => {
                    //call pre() once and start main loop
                    pre();
                    setInterval(main, Math.floor(1000/FPS));
                })
            }
        });
        tsvscode.postMessage({ type: 'webview-ready' });
        window.addEventListener('resize', handleResize);
    });
    
    function handleClick(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const gridX = Math.floor(x / pixelSize);
        const gridY = Math.floor(y / pixelSize);

        console.log("grid x:", gridX, "grid y:", gridY);
    }

    function handleResize() {
        width = window.innerWidth;
        height = window.innerHeight;
        pixelSize = Math.floor(width / GRIDWIDTH); // update pixelSize here
        screenWidth = GRIDWIDTH * pixelSize; // update screenWidth here
        padding = (width - screenWidth) / 2;
        document.documentElement.style.setProperty('--container-padding', `${padding}px`);
        document.documentElement.style.setProperty('--pixel-size', `${pixelSize}px`);
        document.documentElement.style.setProperty('--screen-width', `${screenWidth}px`);
    }

    //run once before main loop
    function pre() {
        handleResize();
        renderBasicText = createTextRenderer('charmap1.png', 7, 9, ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`);
        myObject = new Object('objectType2');
        myObject.setCoordinate(10, 10);
    }

    //main loop
    function main() {
        let sprites = renderBasicText("bruh", offset, 0);
        myObject.setCoordinate(10, 10);
        myObject.nextFrame();
        offset++;
        if(offset >= 7*7){
            offset = -50;
        }
        let sprites1 = [myObject.getSprite()];

        screen = generateScreen(sprites1, 48, 48);
    }
</script>

<div class="grid-container" on:click={handleClick} on:keypress={null}>
    {#each screen as row}
        <div class="row">
            {#each row as cell}
                <div class="pixel" style="background-color: {cell ? 'white' : 'transparent'};"></div>
            {/each}
        </div>
    {/each}
</div>