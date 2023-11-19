<script>
    import { onMount, afterUpdate } from 'svelte';
    import { generateScreen, handleResize, Sprite } from './Codagotchi.svelte';
    import { images } from './store.js';
    import { Object, Pet, Button, GeneratedObject, NavigationButton } from './Object.svelte';
    import { Room, game } from './Game.svelte';
    import { handleMouseMove, handleClick, handleMouseOut } from './MouseEvents.svelte';
    import { spriteReader, preloadAllSpriteSheets } from './SpriteReader.svelte';
    import { createTextRenderer} from './TextRenderer.svelte';
    import { generateButtonClass } from './ObjectGenerators.svelte';

    const FPS = 16; //frames per second
    const standardCharMap = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`;
    let screen = [];
    let petObject;
    let hasMainLoopStarted = false;
    let currentRoom;
    let basic, gang, retro; //font renderers
    let hatArray = ["leaf", "marge", "partyDots", "partySpiral", "superSaiyan"]

    //run once before main loop
    function pre() {
        handleResize();
        //prettier-ignore
        //createTextRenderer(image, charWidth, charHeight, color, letterSpacing, charMap)
        basic = createTextRenderer('charmap1.png', 7, 9, "#FFFFFF", -1, standardCharMap);
        gang = createTextRenderer('gangsmallFont.png', 8, 10, "#FFFFFF", -4, standardCharMap);
        retro = createTextRenderer('retrocomputer.png', 8, 10, "#FFFFFF", -2, standardCharMap);
        //generateButtonClass(buttonWidth, buttonHeight, fillColor, borderColor, hoverFillColor, hoverBorderColor, fontRenderer)
        const mainMenuButton = new NavigationButton('mainMenuButton', 0, 0, 'room2');
        const settingsTitleButton = generateButtonClass(96, 13, '#426b9e', 'black', '#426b9e', 'black', basic);
        const settingsMenuButton = generateButtonClass(96, 17, '#7997bc', 'black', '#426b9e', 'black', basic);
        const singleLetterButton = generateButtonClass(16, 16, '#7997bc', 'black', '#426b9e', 'black', basic);
        const newButton = generateButtonClass(33, 14, 'red', 'white', 'pink', 'cyan', retro);

        let room1 = new Room('room1');
        let room2 = new Room('room2');

        const settingsTitle = new settingsTitleButton('Settings', 0, 0, () => {
            console.log('Button was clicked!');
        });
        const gitlogin = new settingsMenuButton('Git Login', 0, 12, () => {
            handleGitHubLogin();
        });
        const notifications = new settingsMenuButton('Notifs', 0, 28, () => {
            console.log('Button was clicked!');
        });
        const display = new settingsMenuButton('Display', 0, 44, () => {
            console.log('Button was clicked!');
        });
        const about = new settingsMenuButton('<BACK', 0, 60, () => {
                    $game.setCurrentRoom('room1'); 
                    console.log("BRUHHH")
        });
        room2.addObject(settingsTitle, gitlogin, notifications, display, about);


        let shopRoom = new Room('shopRoom');
        let settingsRoom = new Room('settingsRoom');
        petObject = new Pet('pearguin', 24, 25, 0, "superSaiyan");
        
        const leftHatArrow = new singleLetterButton('<', 20, 72, () => {
            petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) - 1 < 0 ? hatArray.length - 1 : hatArray.indexOf(petObject.hat) - 1])
        });
        const rightHatArrow = new singleLetterButton('>', 60, 72, () => {
            petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) + 1 > hatArray.length - 1 ? 0 : hatArray.indexOf(petObject.hat) + 1])
        });
        room1.addObject(petObject, mainMenuButton, leftHatArrow, rightHatArrow);


        // Set the initial room in the game
        $game.setCurrentRoom('room1');
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
            const sprite = obj.getSprite();
            //if an array, unpack array and push each sprite individually
            if (Array.isArray(sprite)) {
                sprites.push(...sprite);
            //if not an array, push sprite
            } else {
                sprites.push(sprite);
            }
        }
        
        screen = generateScreen(sprites, 96, 96);
    }

    onMount(async () => {
        window.addEventListener('message', async (event) => {
            const message = event.data;
            if (message.type === 'image-uris') {
                images.set(message.uris);
                //wait until all sprites are loaded
                await preloadAllSpriteSheets().then(() => {
                    //call pre() once and start main loop
                    pre();
                    setInterval(main, Math.floor(1000 / FPS));
                });
            }
        });
        tsvscode.postMessage({ type: 'webview-ready' });
        window.addEventListener('resize', handleResize);
    });

    function handleGitHubLogin() {
        tsvscode.postMessage({ type: 'openOAuthURL', value: '${O_AUTH_URL}' });
    }
</script>

<div
    class="grid-container"
    on:click={(e) => handleClick(e, $game)}
    on:mousemove={(e) => handleMouseMove(e, $game)}
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
        <div class="roomButtonContainer">
            {#if currentRoom.name === 'room1'}
                <button class="navButton" on:click={() => $game.setCurrentRoom('settingsRoom')}>Settings</button>
                <button class="navButton" on:click={() => $game.setCurrentRoom('shopRoom')}>Shop</button>
            {/if}

            {#if currentRoom.name === 'shopRoom'}
                <button class="navButton" on:click={() => $game.setCurrentRoom('room1')}>Back</button>
            {/if}

            {#if currentRoom.name === 'settingsRoom'}
                <button class="navButton" on:click={() => $game.setCurrentRoom('room1')}>Back</button>
            {/if}
        </div>
        {#if currentRoom.name === 'settingsRoom'}
            <div class="settingsButtonContainer">
                <button class="settingsButton" on:click={handleGitHubLogin} id="github-login">
                    Login with GitHub
                </button>
                <button class="settingsButton" id="changeNotifications"> Change Notifications </button>
                <button class="settingsButton" id="changeDifficulty"> Change Difficulty </button>
            </div>
        {/if}
    {/if}
</div>