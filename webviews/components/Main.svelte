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

    //run once before main loop
    function pre() {

        handleResize();
        //prettier-ignore
        //createTextRenderer(image, charWidth, charHeight, color, letterSpacing, charMap)
        basic = createTextRenderer('charmap1.png', 7, 9, "#FFFFFF", -1, standardCharMap);
        gang = createTextRenderer('gangsmallFont.png', 8, 10, "#FFFFFF", -4, standardCharMap);
        retro = createTextRenderer('retrocomputer.png', 8, 10, "#FFFFFF", -2, standardCharMap);

        // main menu button (drop down)
        const mainMenuButton = new Button('mainMenuButton', 0, 0, () => {
            $game.getCurrentRoom().removeObject(mainMenuButton);
            $game.getCurrentRoom().addObject(dropDown_1, dropDown_2, dropDown_3, dropDown_4);
        }, 1);

        //generateButtonClass(buttonWidth, buttonHeight, fillColor, borderColor, hoverFillColor, hoverBorderColor, fontRenderer)
        const settingsTitleButton = generateButtonClass(96, 13, '#426b9e', 'black', '#426b9e', 'black', basic);
        const settingsMenuButton = generateButtonClass(96, 17, '#7997bc', 'black', '#426b9e', 'black', basic);
        const dropDownButton = new generateButtonClass(58, 12, '#6266d1', 'black', '#888dfc', 'black', retro);

        // drop down buttons
        const dropDown_1 = new dropDownButton('Settings', 0, 0, () => {
            $game.setCurrentRoom('settingsRoom');
        });
        const dropDown_2 = new dropDownButton('Shop', 0, 12, () => {
            $game.setCurrentRoom('shopRoom');
        });
        const dropDown_3 = new dropDownButton('Customize', 0, 24, () => {
            console.log('Button was clicked!');
        });
        const dropDown_4 = new dropDownButton('Close', 0, 36, () => {
            $game.getCurrentRoom().removeObject( dropDown_1, dropDown_2, 
                                                 dropDown_3, dropDown_4 );
            $game.getCurrentRoom().addObject(mainMenuButton);
        });

        // settings menu buttons
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
            $game.setCurrentRoom('mainRoom'); 
            console.log("BRUHHH")
        });
        
        // create rooms
        let mainRoom = new Room('mainRoom');
        let settingsRoom = new Room('settingsRoom');
        let shopRoom = new Room('shopRoom'); 
      
        // petObject = new Object('objectType3', 14, 14);
        petObject = new Pet('pearguin', 20, 25);
        
        // add objects to rooms
        mainRoom.addObject(petObject, mainMenuButton);
        settingsRoom.addObject(settingsTitle, gitlogin, notifications, display, about);

        // Set the initial room in the game
        $game.setCurrentRoom('mainRoom');
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
    {/if}
</div>