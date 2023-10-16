<script>
    import { onMount, afterUpdate } from 'svelte';
    import { generateScreen, spriteReader, preloadAllSpriteSheets, Sprite, createTextRenderer } from './Codagotchi.svelte';
    import { images } from './store.js';
    import { Object, Button } from './Object.svelte';
    
    const GRIDWIDTH = 48;
    const FPS = 10; //second / frames per second
    let width = window.innerWidth;
    let height = window.innerHeight;
    let pixelSize = Math.floor(width / GRIDWIDTH);
    let screenWidth = GRIDWIDTH * pixelSize;
    let screen = [];
    let padding;
    let renderBasicText;
    let myObject;
    let offset = -50;
    let objectsOnScreen = [];
    let lastHoveredObject = null;

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

        // Assuming you have a way to get the object at the clicked coordinates
        const clickedObject = getObjectAt(gridX, gridY);

        if (clickedObject instanceof Button) {
            clickedObject.clickAction();
        }
    }

    //handles mouse movement on screen (hovering)
    function handleMouseMove(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const gridX = Math.floor(x / pixelSize);
        const gridY = Math.floor(y / pixelSize);

        const hoveredObject = getObjectAt(gridX, gridY);

        if (hoveredObject !== lastHoveredObject) {
            if (lastHoveredObject && lastHoveredObject.onStopHover) {
                lastHoveredObject.onStopHover();
            }

            if (hoveredObject) {
                if (hoveredObject instanceof Button) {
                    event.currentTarget.style.cursor = 'pointer'; // Change cursor to pointer
                } else {
                    event.currentTarget.style.cursor = 'default'; // Reset cursor
                }

                if (hoveredObject.onHover) {
                    hoveredObject.onHover();
                }
            } else {
                event.currentTarget.style.cursor = 'default'; // Reset cursor if no object is hovered
            }

            lastHoveredObject = hoveredObject;
        }
    }

    function getObjectAt(x, y) {
        for (let obj of objectsOnScreen) {
            if (x >= obj.x && x <= obj.x + obj.config.spriteWidth &&
                y >= obj.y && y <= obj.y + obj.config.spriteHeight) {
                return obj;
            }
        }
        return null; // No object found at the clicked coordinates
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
        // myObject = new Button('objectType3', 10, 10, () => {console.log("clicked")});
        myObject = new Button('buttonObject', 10, 10, () => {console.log("clicked")} );
        objectsOnScreen.push(myObject);
    }

    //main loop
    function main() {
        let sprites = renderBasicText("bruh", offset, 0);
        // myObject.nextFrame();
        offset++;
        if(offset >= 7*7){
            offset = -50;
        }
        let sprites1 = [myObject.getSprite()];

        screen = generateScreen(sprites1, 48, 48);
    }
</script>

<div class="grid-container" 
     on:click={handleClick} 
     on:mousemove={handleMouseMove} 
     on:keypress={null}>
    {#each screen as row}
        <div class="row">
            {#each row as cell}
                <div class="pixel" style="background-color: {cell};"></div>
            {/each}
        </div>
    {/each}
</div>