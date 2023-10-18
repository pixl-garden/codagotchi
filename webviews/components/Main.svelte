<script>
    import { onMount, afterUpdate } from 'svelte';
    import { generateScreen, spriteReader, preloadAllSpriteSheets, Sprite, createTextRenderer } from './Codagotchi.svelte';
    import { images } from './store.js';
    import { Object, Button, NavigationButton } from './Object.svelte';
    import { Room, game } from './Game.svelte';
    
    const GRIDWIDTH = 48;
    const FPS = 10; //second / frames per second
    let width = window.innerWidth;
    let height = window.innerHeight;
    let pixelSize = Math.floor(width / GRIDWIDTH);
    let screenWidth = GRIDWIDTH * pixelSize;
    let screen = [];
    let padding;
    let lastHoveredObject = null;
    let renderBasicText;

    //run once before main loop
    function pre() {
        handleResize();
        renderBasicText = createTextRenderer('charmap1.png', 7, 9, ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`);
        // myObject = new Button('objectType3', 10, 10, () => {console.log("clicked")});
        // myObject = new Button('buttonObject', 10, 10, () => {console.log("clicked")} );
        // objectsOnScreen.push(myObject);

        let room1 = new Room("room1");
        let room2 = new Room("room2");

        let toRoom1 = new NavigationButton('buttonObject', 0, 0, "room1");
        let toRoom2 = new NavigationButton('buttonObject', 18, 0, "room2");

        // Add objects to rooms as needed
        room1.addObject(toRoom2);
        room2.addObject(toRoom1);

        // Set the initial room in the game
        $game.setCurrentRoom("room1");
    }

    //main loop
    function main() {
        let sprites = []; // Clear previous sprites

        // Get the current room from the game object
        let currentRoom = $game.getCurrentRoom();

        // Render objects in the current room
        for (let obj of currentRoom.getObjects()) {
            sprites.push(obj.getSprite());
        }

        screen = generateScreen(sprites, 48, 48);
    }

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
        for (let obj of $game.getObjectsOfCurrentRoom() ) {
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