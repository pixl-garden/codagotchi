<script>
    import { onMount, afterUpdate } from 'svelte';
    import { generateScreen, handleResize, Sprite } from './Codagotchi.svelte';
    import { images } from './store.js';
    import { Object, GeneratedObject, NavigationButton } from './Object.svelte';
    import { Room, game } from './Game.svelte';
    import { handleMouseMove, handleClick } from './MouseEvents.svelte';
    import { spriteReader, preloadAllSpriteSheets} from './SpriteReader.svelte';
    import { createTextRenderer } from './TextRenderer.svelte';
    
    const FPS = 10; //second / frames per second
    let screen = [];
    let petObject;
    let hasMainLoopStarted = false;
    let currentRoom;
    let renderBasicText;


    function generateRectangleMatrix(width, height, color) {
        const sprite = [];
        for (let i = 0; i < height; i++) {
            const row = Array(width).fill(color);
            sprite.push(row);
        }
        return sprite;
    }

    function overlayMatrix(baseSprite, overlaySprite, startX, startY) {
        for (let y = 0; y < overlaySprite.length; y++) {
            for (let x = 0; x < overlaySprite[y].length; x++) {
                if (overlaySprite[y][x] !== "transparent") {
                    baseSprite[startY + y][startX + x] = overlaySprite[y][x];
                }
            }
        }
        return baseSprite;
    }

    function concatenateMatrixes(matrix1, matrix2) {
        if (matrix1.length !== matrix2.length) {
            throw new Error("Both matrices must have the same number of rows");
        }

        const concatenated = [];
        for (let i = 0; i < matrix1.length; i++) {
            concatenated.push([...matrix1[i], ...matrix2[i]]);
        }

        return concatenated;
    }

    function generateButtonMatrix(width, height, bgColor, borderColor, textSprite) {
        // Generate the outer rectangle sprite for the button border
        const outerSprite = generateRectangleMatrix(width, height, borderColor);

        // Generate the inner rectangle sprite for the button background
        const innerWidth = width - 2;
        const innerHeight = height - 2;
        const innerSprite = generateRectangleMatrix(innerWidth, innerHeight, bgColor);

        // Overlay the inner sprite onto the outer sprite to create the button
        overlayMatrix(outerSprite, innerSprite, 1, 1);

        // Overlay the text sprite in the center of the button
        const textX = Math.floor((width - textSprite[0].length) / 2);
        const textY = Math.floor((height - textSprite.length) / 2);
        overlayMatrix(outerSprite, textSprite, textX, textY);

        return outerSprite;
    }

    function generateButtonClass(width, height, bgColor, borderColor, 
        bgColorHovered, borderColorHovered, textRenderer) {

        return class Button extends GeneratedObject {
            constructor(text, x, y, actionOnClick) {
                const defaultSprite = generateButtonMatrix(width, height, bgColor, borderColor, textRenderer(text));
                const hoverSprite = generateButtonMatrix(width, height, bgColorHovered, borderColorHovered, textRenderer(text));

                // State management: 0 for default sprite and 1 for hover sprite
                super([defaultSprite, hoverSprite], { 'default': [0], 'hovered': [1] }, x, y);
                this.actionOnClick = actionOnClick;
            }

            onHover() {
                super.onHover(); // Call parent's hover function
                this.updateState('hovered');
            }

            onStopHover() {
                super.onStopHover(); // Call parent's stop hover function
                this.updateState('default');
            }

            onClick() {
                super.onClick(); // Call parent's click function
                this.actionOnClick && this.actionOnClick();
            }
        };
    }

    //run once before main loop
    function pre() {
        handleResize();
        renderBasicText = createTextRenderer('charmap1.png', 7, 9, ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`, '#FFFFFF', -1);
        const ButtonClass = generateButtonClass(40, 15, 'blue', 'black', 'lightblue', 'darkgray', renderBasicText);
        const newButton = generateButtonClass(33, 14, 'red', 'white', 'pink', 'cyan', renderBasicText);
        const myButton = new newButton('kyle', 0, 20, () => {
            console.log('Button was clicked!');
        });

        let room1 = new Room("room1");
        let room2 = new Room("room2");
        let settingsRoom = new Room("settingsRoom");
        petObject = new Object('objectType3', 14, 14)
        let toRoom1 = new NavigationButton('buttonObject', 0, 0, "room1");
        let toRoom2 = new NavigationButton('buttonObject', 18, 0, "room2");
        room2.addObject(myButton);
        room1.addObject(petObject);
        room2.addObject(toRoom1);
        room1.addObject(toRoom2);
        

        // Set the initial room in the game
        $game.setCurrentRoom("room1");
        
    }
    //main loop
    function main() {
        
        let sprites = []; // Clear previous sprites
        // let test = new Sprite(renderBasicText("./0123456789"), 1, 20, 0);
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