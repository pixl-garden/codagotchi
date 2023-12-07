<script context='module'>
    import { game, Room } from './Game.svelte';
    import { Pet, Button, Background } from './Object.svelte';
    import { createTextRenderer} from './TextRenderer.svelte';
    import { generateButtonClass, generateStatusBarClass } from './ObjectGenerators.svelte';
    import { get } from 'svelte/store';

    let background;
    let petObject;
    let basic, gang, retro; //font renderers
    let hatArray = ["leaf", "marge", "partyDots", "partySpiral", "superSaiyan"]
    const standardCharMap = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`;

    function handleGitHubLogin() {
        tsvscode.postMessage({ type: 'openOAuthURL', value: '${O_AUTH_URL}' });
    };

    export function preloadObjects(){
        //createTextRenderer(image, charWidth, charHeight, color, letterSpacing, charMap)
        basic = createTextRenderer('charmap1.png', 7, 9, "#FFFFFF", -1, standardCharMap);
        gang = createTextRenderer('gangsmallFont.png', 8, 10, "#FFFFFF", -4, standardCharMap);
        retro = createTextRenderer('retrocomputer.png', 8, 10, "#FFFFFF", -2, standardCharMap);

        // main menu button (drop down)
        const mainMenuButton = new Button('mainMenuButton', 0, 0, () => {
            get(game).getCurrentRoom().removeObject(mainMenuButton);
            get(game).getCurrentRoom().addObject(dropDown_1, dropDown_2, dropDown_3, dropDown_4);
        }, 1);

        const StatusBar = generateStatusBarClass(75, 12, 'black', 'grey', '#40D61A');

        //generateButtonClass(buttonWidth, buttonHeight, fillColor, borderColor, hoverFillColor, hoverBorderColor, fontRenderer)
        const settingsTitleButton = generateButtonClass(96, 13, '#426b9e', 'black', '#426b9e', 'black', basic);
        const settingsMenuButton = generateButtonClass(96, 17, '#7997bc', 'black', '#426b9e', 'black', basic);
        const singleLetterButton = generateButtonClass(16, 16, '#7997bc', 'black', '#426b9e', 'black', basic);
        const dropDownButton = new generateButtonClass(58, 12, '#6266d1', 'black', '#888dfc', 'black', retro);

        // drop down buttons
        const dropDown_1 = new dropDownButton('Settings', 0, 0, () => {
            get(game).setCurrentRoom('settingsRoom');
        }, 20);
        const dropDown_2 = new dropDownButton('Shop', 0, 12, () => {
            get(game).setCurrentRoom('shopRoom');
        }, 20);
        const dropDown_3 = new dropDownButton('Customize', 0, 24, () => {
            get(game).setCurrentRoom('customizeRoom');
        }, 20);
        const dropDown_4 = new dropDownButton('Close', 0, 36, () => {
            get(game).getCurrentRoom().removeObject( dropDown_1, dropDown_2, 
                                                 dropDown_3, dropDown_4 );
            get(game).getCurrentRoom().addObject(mainMenuButton);
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
            get(game).setCurrentRoom('mainRoom'); 
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
            get(game).setCurrentRoom('mainRoom');
        }, 0);

        const statusBar = new StatusBar(20, 2, 0);

        let shopRoom = new Room('shopRoom'); 

        background = new Background('vanityBackground', 0, 0, -20);
        
        // add objects to rooms
        mainRoom.addObject(petObject, mainMenuButton, statusBar);
        settingsRoom.addObject(settingsTitle, gitlogin, notifications, display, about);
        customizeRoom.addObject(petObject, leftHatArrow, rightHatArrow, backToMain, background);
        shopRoom.addObject(backToMain);
    }

    export function roomMain(){
        petObject.nextFrame();
        background.nextFrame();
    }
</script>
