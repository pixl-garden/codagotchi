<script>
    import { onMount, afterUpdate } from 'svelte';
    import { generateScreen, handleResize, Sprite } from './Codagotchi.svelte';
    import { images } from './store.js';
    import { Object, Pet, Button, GeneratedObject, NavigationButton, Background } from './Object.svelte';
    import { Room, game, shouldFocus, inputValue } from './Game.svelte';
    import { handleMouseMove, handleClick, handleMouseOut, handleMouseDown, handleMouseUp, focus } from './MouseEvents.svelte';
    import { spriteReader, preloadAllSpriteSheets } from './SpriteReader.svelte';
    import { createTextRenderer } from './TextRenderer.svelte';
    import { generateButtonClass, generateStatusBarClass } from './ObjectGenerators.svelte';
    import { getGlobalState, getLocalState, setGlobalState, setLocalState } from './localSave.svelte';
    import { preloadObjects, roomMain } from './Rooms.svelte';
    import { get } from 'svelte/store';

    const FPS = 16; //frames per second
    let screen = [];
    let hasMainLoopStarted = false;
    let currentRoom;
    let githubUsername;

    //run once before main loop
    function pre() {

        // setGlobalState( {"test": "hey", "test2": "hello noah", "test3": "whats up"} );
        getGlobalState( {} );
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
            const sprite = obj.getSprite();
            //if an array, unpack array and push each sprite individually
            if (Array.isArray(sprite)) {
                sprites.push(...sprite);
            //if not an array, push sprite
            } else {
                sprites.push(sprite);
            }
        }
        
        screen = generateScreen(sprites, 128, 128);
    }

    onMount(async () => {
        //current load times: 2.4, 1.9, 2.6, 2.5
        let startTime, endTime;

        window.addEventListener('message', async (event) => {
            const message = event.data;
            if (message.type === 'image-uris') {
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
            }
            else if (message.type === 'github-username') {
                githubUsername = message.username;
                console.log("GITHUB USERNAME: " + githubUsername);
            }
            else if (message.type === 'currentState') {
                $game.setLocalState(message.value);
            }
        });

        tsvscode.postMessage({ type: 'webview-ready' });
        window.addEventListener('resize', handleResize);
    });

    $: if ($shouldFocus) {
        console.log('Input is focused');
    }
    $: console.log('Input Value:', $inputValue);
</script>

<input type="text" id="hiddenInput" bind:value={$inputValue} use:focus={$shouldFocus} />
<div
    class="grid-container"
    on:click={(e) => handleClick(e, get(game))}
    on:mousemove={(e) => handleMouseMove(e, get(game))}
    on:mousedown={(e) => handleMouseDown(e, get(game))}
    on:mouseup={handleMouseUp}
    on:mouseleave={(e) => handleMouseOut(e)}
    on:keypress={null}
    on:blur={null}
>
    {#if hasMainLoopStarted}
        {#each screen as row}
            <div class="row">
                {#each row as cell}
                    <div class="pixel" style="background-color: {cell};"></div>
                {/each}
            </div>
        {/each}
    {/if}
</div>