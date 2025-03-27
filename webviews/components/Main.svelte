<script>
    import { onMount } from 'svelte';
    import { renderScreenWebGL, initWebGL } from './ScreenManager.svelte';
    import { game, shouldFocus, inputValue, textInput } from './Game.svelte';
    import { handleMouseMove, handleClick, handleMouseOut, handleMouseDown, handleMouseUp, focus, handleScroll } from './MouseEvents.svelte';
    import { loadSpriteData } from './SpriteReader.svelte';
    import { preloadObjects, roomMain } from './Rooms.svelte';
    import { get } from 'svelte/store';

    const FPS = 20; //frames per second
    let screen = [];
    let currentRoom;
    let canvas;
    const screenWidth = 128; // Game logic resolution
    let startTime, endTime;
    let webglContext;

    function pre() {
        // $game.clearGlobalState();
        $game.syncLocalToGlobalState({});
        $game.constructInventory();
        preloadObjects();
        $game.setCurrentRoom('mainRoom');
    }

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
                    if (Array.isArray(sprite)) {
                        sprites.push(...sprite);
                    } else {
                        sprites.push(sprite);
                    }
                });
            }
            const sprite = obj.getSprite();
            if (Array.isArray(sprite)) {
                sprites.push(...sprite);
            } else if (sprite) {
                sprites.push(sprite);
            }
        }
        
        // screen = generateScreen(sprites, screenWidth, screenWidth);
        renderScreenWebGL(webglContext, screenWidth, sprites);
    }

    function handleResize() {
        const size = Math.min(window.innerWidth, window.innerHeight);
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
    }

    onMount(async () => {
        canvas = document.getElementsByClassName('pixel-grid')[0];
        
        webglContext = initWebGL(canvas);
        if (!webglContext) {
            console.error('WebGL initialization failed');
            return;
        }
        handleResize();

        window.addEventListener('message', async (event) => {
            const message = event.data;
            switch (message.type) {
                case 'sprite-data':
                    startTime = performance.now();
                    loadSpriteData(message.data).then(() => {
                        console.log('Sprite data loaded and parsed');
                        pre();
                        endTime = performance.now();
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
                    break;
                
                case 'openUserBedroom':
                    $game.openUserBedroom(message.value);
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
     on:mouseup={(e) => handleMouseUp(e, get(game))}
     on:mouseleave={(e) => handleMouseOut(e)}
     on:wheel={(e) => handleScroll(e, get(game))}>
</canvas>