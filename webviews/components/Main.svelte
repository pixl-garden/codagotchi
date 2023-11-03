<script>
    import { onMount, afterUpdate } from 'svelte';
    import { generateScreen, handleResize, Sprite } from './Codagotchi.svelte';
    import { images } from './store.js';
    import { Object, Button, NavigationButton } from './Object.svelte';
    import { Room, game } from './Game.svelte';
    import { handleMouseMove, handleClick } from './MouseEvents.svelte';
    import { spriteReader, preloadAllSpriteSheets} from './SpriteReader.svelte';
    
    const FPS = 10; //second / frames per second
    let screen = [];
    let renderBasicText;
    let petObject;
    let hasMainLoopStarted = false;
    let currentRoom;
    const CLIENT_ID = "a253a1599d7b631b091a";
    const REDIRECT_URI = encodeURIComponent("https://codagotchi.firebaseapp.com/__/auth/handler");
    const REQUESTED_SCOPES = "user,read:user";

    const O_AUTH_URL = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${REQUESTED_SCOPES}`;

    //run once before main loop
    function pre() {
        handleResize();

        let room1 = new Room("room1");
        let room2 = new Room("room2");
        let settingsRoom = new Room("settingsRoom");
        petObject = new Object('objectType3', 14, 14)
        let toRoom1 = new NavigationButton('buttonObject', 0, 0, "room1");
        let toRoom2 = new NavigationButton('buttonObject', 18, 0, "room2");
        room1.addObject(petObject);
        room2.addObject(toRoom1);
        room1.addObject(toRoom2);

        // Set the initial room in the game
        $game.setCurrentRoom("room1");
        
    }
    //main loop
    function main() {
        let sprites = []; // Clear previous sprites
        petObject.nextFrame();

        // Get the current room from the game object
        currentRoom = $game.getCurrentRoom();
        hasMainLoopStarted = true;

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

    function switchRoom() {
        $game.setCurrentRoom("shopRoom");
    }

    function handleGitHubLogin() {
        tsvscode.postMessage({ type: 'openOAuthURL',
              value: '${O_AUTH_URL}' });
    }

    function firebaseExample() {
        tsvscode.postMessage({ type: 'pushData' });
    }
    

</script>

<div class="grid-container" 
    on:click={e => handleClick(e, $game)} 
    on:mousemove={e => handleMouseMove(e, $game)} 
    on:keypress={null}>
    {#if hasMainLoopStarted}
    {#each screen as row}
        <div class="row">
            {#each row as cell}
                <div class="pixel" style="background-color: {cell};"></div>
            {/each}
        </div>
    {/each}
    <div class="roomButtonContainer">
    {#if currentRoom.name === 'room1'}
      <button class="navButton" on:click={() => $game.setCurrentRoom("settingsRoom")}>Settings</button>
      <button class="navButton" on:click={switchRoom}>Shop</button>
    {/if}

    {#if currentRoom.name === 'shopRoom'}
      <button class="navButton" on:click={() => $game.setCurrentRoom("room1")}>Back</button>
    {/if}

    {#if currentRoom.name === 'settingsRoom'}
      <button class="navButton" on:click={() => $game.setCurrentRoom("room1")}>Back</button>
    {/if}
      
    </div>
    {#if currentRoom.name === 'settingsRoom'}
    <div class="settingsButtonContainer">
     <button class="settingsButton" on:click = {handleGitHubLogin} id="github-login"> 
        Login with GitHub
     </button>
     <button class="settingsButton" id="changeNotifications">
        Change Notifications
     </button>
     <button class="settingsButton" id="changeDifficulty">
        Change Difficulty
     </button>
     </div>
    {/if}
    {/if}

</div>