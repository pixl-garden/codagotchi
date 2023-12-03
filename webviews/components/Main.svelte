<script>
    import { onMount, afterUpdate } from 'svelte';
    import { generateScreen, handleResize, Sprite } from './Codagotchi.svelte';
    import { images } from './store.js';
    import { Object, Pet, Button, GeneratedObject, NavigationButton, Background } from './Object.svelte';
    import { Room, game } from './Game.svelte';
    import { handleMouseMove, handleClick, handleMouseOut } from './MouseEvents.svelte';
    import { spriteReader, preloadAllSpriteSheets } from './SpriteReader.svelte';
    import { createTextRenderer} from './TextRenderer.svelte';
    import { generateButtonClass } from './ObjectGenerators.svelte';
    import { getGlobalState, getLocalState, setGlobalState, setLocalState } from './localSave.svelte';

    const FPS = 16; //frames per second
    const standardCharMap = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`;
    let screen = [];
    let petObject;
    let hasMainLoopStarted = false;
    let currentRoom;
    let basic, gang, retro; //font renderers
    let hatArray = ["leaf", "marge", "partyDots", "partySpiral", "superSaiyan"]
    let githubUsername;
    let test;
    // let background;
    let background;

    //run once before main loop
    function pre() {

        setGlobalState( {"test": "hey", "test2": "hello noah", "test3": "whats up"} );
        getGlobalState( {} );

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
        const singleLetterButton = generateButtonClass(16, 16, '#7997bc', 'black', '#426b9e', 'black', basic);
        const dropDownButton = new generateButtonClass(58, 12, '#6266d1', 'black', '#888dfc', 'black', retro);

        // drop down buttons
        const dropDown_1 = new dropDownButton('Settings', 0, 0, () => {
            $game.setCurrentRoom('settingsRoom');
        }, 20);
        const dropDown_2 = new dropDownButton('Shop', 0, 12, () => {
            $game.setCurrentRoom('shopRoom');
        }, 20);
        const dropDown_3 = new dropDownButton('Customize', 0, 24, () => {
            $game.setCurrentRoom('customizeRoom');
        }, 20);
        const dropDown_4 = new dropDownButton('Close', 0, 36, () => {
            $game.getCurrentRoom().removeObject( dropDown_1, dropDown_2, 
                                                 dropDown_3, dropDown_4 );
            $game.getCurrentRoom().addObject(mainMenuButton);
        }, 20);

        // settings menu buttons
        const settingsTitle = new settingsTitleButton('Settings', 0, 0, () => {
            console.log('Button was clicked!');
        });
        const gitlogin = new settingsMenuButton('Git Login', 0, 12, () => {
            handleGitHubLogin();
        });
        const notifications = new settingsMenuButton('Notifs', 0, 28, () => {
            console.log('Button was clicked!')
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
        let customizeRoom = new Room('customizeRoom');
        petObject = new Pet('pearguin', 24, 25, 0, "leaf");
        
        const leftHatArrow = new singleLetterButton('<', 20, 72, () => {
            petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) - 1 < 0 ? hatArray.length - 1 : hatArray.indexOf(petObject.hat) - 1])
        }, 0);
        const rightHatArrow = new singleLetterButton('>', 60, 72, () => {
            petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) + 1 > hatArray.length - 1 ? 0 : hatArray.indexOf(petObject.hat) + 1])
        }, 0);
        const backToMain = new singleLetterButton('<', 0, 0, () => {
            $game.setCurrentRoom('mainRoom');
        }, 0);

        let shopRoom = new Room('shopRoom'); 

        background = new Background('vanityBackground', 0, 0, -20);
        
        // add objects to rooms
        mainRoom.addObject(petObject, mainMenuButton);
        settingsRoom.addObject(settingsTitle, gitlogin, notifications, display, about);
        customizeRoom.addObject(petObject, leftHatArrow, rightHatArrow, backToMain, background);
        shopRoom.addObject(backToMain);

        // Set the initial room in the game
        $game.setCurrentRoom('mainRoom');
    }
    //main loop
    function main() {
        let sprites = []; // Clear previous sprites
        petObject.nextFrame();
        background.nextFrame();
        
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
                setLocalState(message.value);
                console.log("yoyoyoyoyoyoyo")
                printJsonObject(getLocalState());
            }
        });

        tsvscode.postMessage({ type: 'webview-ready' });
        window.addEventListener('resize', handleResize);
    });

    function handleGitHubLogin() {
        tsvscode.postMessage({ type: 'openOAuthURL', value: '${O_AUTH_URL}' });
    };

    function printJsonObject(jsonObject) {
        for (const key in jsonObject) {
            if (jsonObject.hasOwnProperty(key)) {
                console.log(`Key: ${key}, Value: ${jsonObject[key]}`);
                }
            }
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