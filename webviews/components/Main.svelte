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
    let currentRoom;
    let canvas, ctx;
    let screenWidth = 128;
    let startTime, endTime;

    //run once before main loop
    function pre() {
        //prettier-ignore
        // $game.clearGlobalState();
        $game.syncLocalToGlobalState( {} );
        $game.constructInventory();
        handleResize();
        preloadObjects();
        $game.setCurrentRoom('mainRoom');
    }

    //main loop
    function main() {
        let sprites = []; // Clear previous sprites
        roomMain();
        
        // Get the current room from the game object
        currentRoom = $game.getCurrentRoom();
        
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

        window.addEventListener('message', async (event) => {
            const message = event.data;
            switch (message.type) {
                case 'image-uris':
                    startTime = performance.now();  // Start timing
                    images.set(message.uris);
                    
                    // Wait until all sprites are loaded
                    await preloadAllSpriteSheets().then(() => {
                        // Call pre() once and start main loop
                        pre();
                        endTime = performance.now();  // End timing
                        console.log(`Time taken: ${endTime - startTime} milliseconds`);
                        setInterval(main, Math.floor(1000 / FPS));
                    });
                    break;

                case 'documentSaved':
                    $game.resetActivityTimeout();
                    break;

                case 'fetchedGlobalState':
                    $game.setLocalState(message.value);
                    break;

                case 'resize':
                    handleResize();
                    break;

                case 'cached-user-inbox':
                    let cachedUserInbox = message.userInbox;
                    console.log('Received cached userInbox:', cachedUserInbox);
                    await $game.initializeWithCache(cachedUserInbox);
                    break;

                case 'cached-user-inventory':
                    let cachedUserInventory = message.userInventory;
                    console.log('Received cached userInventory:', cachedUserInventory);
                    await $game.initializeWithCache({}, cachedUserInventory);
                    break;

                case 'logoutSuccess':
                    $game.updateGlobalState({isLoggedIn: false});

                    break;

                case 'loginSuccess':
                    $game.updateGlobalState({isLoggedIn: true});
                    // console.log('User logged in successfully');
                    break;

                default:
                    console.log('Unhandled message type:', message.type);
            }
        });

        tsvscode.postMessage({ type: 'webview-ready' });
        window.addEventListener('resize', handleResize);
    });

    $: if ($shouldFocus) {
        // console.log('Input is focused');
    }

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