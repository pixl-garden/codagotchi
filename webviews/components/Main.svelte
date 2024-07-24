<script>
    import { onMount } from 'svelte';
    import { generateScreen, handleResize } from './ScreenManager.svelte';
    import { images } from './store.js';
    import { Room, game, shouldFocus, inputValue, textInput } from './Game.svelte';
    import { handleMouseMove, handleClick, handleMouseOut, handleMouseDown, handleMouseUp, focus, handleScroll } from './MouseEvents.svelte';
    import { preloadAllSpriteSheets } from './SpriteReader.svelte';
    import { preloadObjects, roomMain } from './Rooms.svelte';
    import { getPixelSize } from './ScreenManager.svelte';
    import { get } from 'svelte/store';

    const FPS = 16; //frames per second
    let screen = [];
    let hasMainLoopStarted = false;
    let currentRoom;
    let canvas, ctx;
    let screenWidth = 128;
    let cacheManager;
    let hasPreBeenCalled = false;
    let cachedUserInbox = null;
    let startTime, endTime;

    async function initializeGame() {
        if (!hasPreBeenCalled) {
            await preloadAllSpriteSheets();
            if (cachedUserInbox) {
                await $game.initializeWithCache(cachedUserInbox);
            }
            pre();
            endTime = performance.now();  // End timing
            console.log(`Time taken: ${endTime - startTime} milliseconds`);
            setInterval(main, Math.floor(1000 / FPS));
            hasPreBeenCalled = true;
        }
    }

    //run once before main loop
    async function pre() {
        $game.clearGlobalState(); // Clear global state

        $game.syncLocalToGlobalState({});
        $game.constructInventory();
        
        // console.log("ItemByType Map: ", $game.inventory.itemsByType);
        // console.log("Stamp Items: ", $game.inventory.getItemsByType('stamp'));
        handleResize();
        preloadObjects();
        //prettier-ignore

        // Set the initial room in the game
        $game.setCurrentRoom('mainRoom');
    }

    //main loop
    function main() {
        let sprites = []; // Clear previous sprites
        roomMain();
        
        // Get the current room from the game object
        currentRoom = $game.getCurrentRoom();
        hasMainLoopStarted = true;
        
        // Render objects in the current room
        for (let obj of currentRoom.getObjects()) {
            const children = obj.getChildren();
            if(children.length > 0 && obj.renderChildren) {
                obj.getChildSprites().forEach((sprite) => {
                    // console.log("Child sprite: ", sprite)
                    if (Array.isArray(sprite)) {
                        sprites.push(...sprite);
                    //if not an array, push sprite
                    } else {
                        sprites.push(sprite);
                    }
                });
            }
            const sprite = obj.getSprite();
            //if an array, unpack array and push each sprite individually
            if (Array.isArray(sprite)) {
                sprites.push(...sprite);
            //if not an array, push sprite
            } else if (sprite){
                sprites.push(sprite);
            }
        }
        
        screen = generateScreen(sprites, screenWidth, screenWidth);
        renderScreen(screen);
    }

    function renderScreen(screen) {
        let pixelSize = getPixelSize();
        screen.forEach((row, y) => {
            row.forEach((color, x) => {
                if(color === 'transparent'){
                    ctx.clearRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize );
                }else{
                    ctx.fillStyle = color;
                    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                }
            });
        });
    }

    onMount(async () => {
        canvas = document.getElementsByClassName('pixel-grid')[0];
        let screenSize = window.innerWidth;
        canvas.width = screenSize;
        canvas.height = screenSize;
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;

        let cacheManagerReceived = false;
        let imageUrisReceived = false;

        window.addEventListener('message', async (event) => {
            const message = event.data;
            if (message.type === 'image-uris') {
                startTime = performance.now();  // Start timing

                images.set(message.uris);
                imageUrisReceived = true;

                if (cacheManagerReceived) {
                    await initializeGame();
                }
            }
            else if (message.type === 'documentSaved'){
                $game.resetActivityTimeout();
            }
            else if (message.type === 'fetchedGlobalState') {
                $game.setLocalState(message.value);
            }
            else if(message.type === 'resize'){
                handleResize();
            }
            else if (message.type === 'cached-user-inbox') {
                cachedUserInbox = message.userInbox;
                console.log('Received cached userInbox:', cachedUserInbox);
                cacheManagerReceived = true;

                if (imageUrisReceived) {
                    await initializeGame();
                }
            }
        });

        tsvscode.postMessage({ type: 'webview-ready' });
        window.addEventListener('resize', handleResize);
    });

    $: if ($shouldFocus) {
        // console.log('Input is focused');
    }
    // $: console.log('Input Value:', $inputValue);

    $: {
        const inputValueStore = $inputValue;
        textInput.updateAllInstances(inputValueStore);
    }
</script>

<input type="text" id="hiddenInput" bind:value={$inputValue} use:focus={$shouldFocus} />
<canvas class="pixel-grid"
     on:click={(e) => handleClick(e, get(game))}
     on:mousemove={(e) => handleMouseMove(e, get(game))}
     on:mousedown={(e) => handleMouseDown(e, get(game))}
     on:mouseup={handleMouseUp}
     on:mouseleave={(e) => handleMouseOut(e)}
     on:wheel={(e) => handleScroll(e, get(game))}
     on:keypress={null}
     on:blur={null}>
</canvas>