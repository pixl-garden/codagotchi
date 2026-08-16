<script>
    import { onMount } from 'svelte';
    import { renderScreenWebGL, initWebGL } from './ScreenManager.svelte';
    import { game, shouldFocus, inputValue, textInput } from './Game.svelte';
    import { handleMouseMove, handleClick, handleMouseOut, handleMouseDown, handleMouseUp, focus, handleScroll } from './MouseEvents.svelte';
    import { loadSpriteData } from './SpriteReader.svelte';
    import { preloadObjects, roomMain as activePlanesMain } from './Rooms.svelte';
    import { get } from 'svelte/store';

    const FPS = 20; //frames per second
    let canvas;

    const virtualHeight = 10000;
    let virtualWidth;

    function pre() {
        // $game.clearGlobalState();
        $game.syncLocalToGlobalState({});
        // $game.constructInventory();
        preloadObjects();
    }

    function main() {
        activePlanesMain();
        renderScreenWebGL($game.activePlanes, virtualHeight, virtualWidth);
    }

    function handleResize() {
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        virtualWidth = (window.innerWidth / window.innerHeight) * virtualHeight;
    }

    onMount(async () => {
        canvas = document.getElementsByClassName('pixel-grid')[0];
        handleResize();

        window.addEventListener('message', async (event) => {
            const message = event.data;
            switch (message.type) {
                case 'atlas-loaded':
                    const imageUri = message.imageUri;
                    console.log('Received atlas image URI:', imageUri, canvas);
                    initWebGL(canvas, imageUri);
                    pre();
                    setInterval(main, Math.floor(1000 / FPS));
                    break;

                case 'sprite-data':
                    loadSpriteData(message.data);
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