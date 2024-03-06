<script context='module'>
    import { game, Room, shouldFocus, handleGitHubLogin } from './Game.svelte';
    import { Pet, Button, Background, PixelCanvas, inventoryGrid, Object, Item, toolTip, buttonList } from './Object.svelte';
    import { createTextRenderer} from './TextRenderer.svelte';
    import { generateButtonClass, generateStatusBarClass, generateTextInputBar } from './ObjectGenerators.svelte';
    import { get } from 'svelte/store';
    import Codagotchi from './Codagotchi.svelte';

    
    export function preloadObjects(){
    //----------------FONT RENDERERS----------------
        const standardCharMap = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`;
        //createTextRenderer(image, charWidth, charHeight, color, letterSpacing, charMap)
        let basic = createTextRenderer('charmap1.png', 7, 9, "#FFFFFF", -1, standardCharMap);
        let gang = createTextRenderer('gangsmallFont.png', 8, 10, "#FFFFFF", -4, standardCharMap);
        let retro = createTextRenderer('retrocomputer.png', 8, 10, "#FFFFFF", -2, standardCharMap);
        let tiny = createTextRenderer('tinyPixls.png', 8, 8, "#FFFFFF", -4, standardCharMap);        
        
    //----------------BUTTON CLASS GENERATORS----------------
        //generateButtonClass(buttonWidth, buttonHeight, fillColor, borderColor, hoverFillColor, hoverBorderColor, fontRenderer,
        //   topShadowColor, bottomShadowColor, topHoverShadowColor, bottomHoverShadowColor,
        //   textAlign ("center" "left" or "right"), margin (only for left or right align))
        const defaultButtonParams = ['#7997bc', 'black', '#426b9e', 'black', basic, '#47596f', '#a4ccff', '#223751', "#629de9"]
        const settingsMenuButton = generateButtonClass(128, 17, ...defaultButtonParams);
        const singleLetterButton = generateButtonClass(16, 16, ...defaultButtonParams);
        const smallLetterButton = generateButtonClass(10, 10, ...defaultButtonParams);
        const settingsTitleButton = generateButtonClass(128, 13, '#426b9e', 'black', '#426b9e', 'black', basic, '#223751', "#629de9", '#223751', "#629de9");
        const friendTitle = generateButtonClass(128, 15, '#426b9e', 'black', '#426b9e', 'black', basic, '#223751', "#629de9", '#223751', "#629de9");
        const friendButton = generateButtonClass(128, 18, '#7997bc', 'black', '#223751', 'black', retro, '#47596f', '#a4ccff','#1b2e43', '#2b4669', "left", 2);
        const dropDownButton = new generateButtonClass(58, 12, '#6266d1', 'black', '#888dfc', 'black', retro, '#5356b2', '#777cff', "#5e62af", "#a389ff");
        const paintButton = generateButtonClass(25, 15, '#8B9BB4', 'black', '#616C7E', 'black', retro, '#BEC8DA', '#5B6A89','#848B97', '#424D64');
        
    //---------------GENERAL OBJECTS----------------
        //BUTTON TO RETURN TO MAIN ROOM
        const backToMain = new smallLetterButton('<', 3, 2, () => {
            get(game).setCurrentRoom('mainRoom');
            petObject.setCoordinate(36, 54, 0)
        }, 10);

    //----------------MAIN ROOM----------------
        //STATUS BAR INSTANTIATION
        const StatusBar = generateStatusBarClass(107, 12, 'black', 'grey', '#40D61A', 2);
        const statusBar = new StatusBar(20, 2, 0);
        //MAIN MENU INSTANTIATION
        const mainMenuButtonTexts = ['Settings', 'Shop', 'Customize', 'Paint', 'Social', 'Inventory', 'Close'];
        const mainMenuButtonFunctions = [() => {get(game).setCurrentRoom('settingsRoom')}, 
        () => {get(game).setCurrentRoom('shopRoom')}, 
        () => {get(game).setCurrentRoom('customizeRoom');
        petObject.setCoordinate(24, 99, 0);}, 
        () => {get(game).setCurrentRoom('paintRoom')}, 
        () => {get(game).setCurrentRoom('socialRoom')}, 
        () => {get(game).setCurrentRoom('inventoryRoom')}, 
        () => {
            get(game).getCurrentRoom().removeObject( mainMenu );
            get(game).getCurrentRoom().addObject( mainMenuButton );}
        ]
        const mainMenu = new buttonList(mainMenuButtonTexts, mainMenuButtonFunctions, dropDownButton, 58, 12, -1, 0, 0, 0);
        //BUTTON TO OPEN MAIN MENU
        const mainMenuButton = new Button('mainMenuButton', 0, 0, () => {
            get(game).getCurrentRoom().removeObject(mainMenuButton);
            get(game).getCurrentRoom().addObject(mainMenu);
        }, 1);
        //PET INSTANTIATION
        let petObject = new Pet('pearguin', 36, 54, 0, "leaf");
        //ROOM INSTANTIATION
        let mainRoom = new Room('mainRoom', false, false, () => {
            petObject.nextFrame();
        });
        mainRoom.addObject(petObject, mainMenuButton, statusBar);
        
    //----------------SETTINGS ROOM----------------
        //SETTINGS MENU INSTANTIATION
        const settingsMenuButtonTexts = ['Git Login', 'Notifs', 'Display', '<BACK'];
        const settingsMenuButtonFunctions = [() => {handleGitHubLogin()}, () => {}, () => {}, () => {get(game).setCurrentRoom('mainRoom')}]
        const settingsTitle = new settingsTitleButton('Settings', 0, 0, () => {});
        const settingsMenu = new buttonList(settingsMenuButtonTexts, settingsMenuButtonFunctions, settingsMenuButton, 58, 12, -1, 0, 12, 0);
        //ROOM INSTANTIATION
        let settingsRoom = new Room('settingsRoom');
        settingsRoom.addObject(settingsTitle, settingsMenu);
    
    //----------------CUSTOMIZE ROOM----------------
        //BACKGROUND INSTANTIATION
        let vanityBackground = new Background('vanityBackground', 0, 0, -20, () => {
            if (vanityBackground.state === 'open'){
                vanityBackground.queueState('slideBack')
                vanityBackground.queueState('default')
            }
            else{
                vanityBackground.queueState('slide')
                vanityBackground.queueState('open')
            }
        });
        //CUSTOMIZATION UI INSTANTIATION
        let hatArray = ["leaf", "marge", "partyDots", "partySpiral", "superSaiyan"]
        const leftHatArrow = new singleLetterButton('<', 20, 144, () => {
            petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) - 1 < 0 ? hatArray.length - 1 : hatArray.indexOf(petObject.hat) - 1])
        }, 0);
        const rightHatArrow = new singleLetterButton('>', 60, 144, () => {
            petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) + 1 > hatArray.length - 1 ? 0 : hatArray.indexOf(petObject.hat) + 1])
        }, 0);
        let customizeUI = new Background('customizeUI', 9, 88, -10, () => {
            if(customizeUI.y < 22){
                customizeUI.startMovingTo(9, 88);
            }
            else{
                customizeUI.startMovingTo(9, 21, sineWaveSpeed);
            }
        });
        //ROOM INSTANTIATION
        let customizeRoom = new Room('customizeRoom', false, false, () => {
            petObject.nextFrame();
            vanityBackground.nextFrame();
            customizeUI.nextFrame();
        });
        customizeRoom.addObject(petObject, leftHatArrow, rightHatArrow, backToMain, customizeUI, vanityBackground);
    
    //----------------SHOP ROOM----------------
        let shopBackground = new Background('vendingBackground', 0, 0, -20, () => {})
        let shopRoom = new Room('shopRoom'); 
        shopRoom.addObject(backToMain, shopBackground);

    //----------------PAINT ROOM----------------
        //BACKGROUND INSTANTIATION
        let postcardBackground = new Background('postcardBackground', 0, 0, -20, () => {})
        //PAINT BUTTONS INSTANTIATION
            //TODO: MAKE INTO BUTTONLIST
        let paintButton1 = new paintButton('$$$', 0, 0, ()=>{
            paintCanvas.rotateColor();
        }, 5);
        let eraserButton = new paintButton('fuk', 24, 0, ()=>{
            paintCanvas.setEraser();
        }, 5);
        let shapeButton = new paintButton('wuk', 49, 0, ()=>{
            paintCanvas.rotateBrushShape();
        }, 5);
        let sizeButton = new paintButton('suk', 74, 0, ()=>{
            paintCanvas.rotateSize();
        }, 5);
        //PAINT CANVAS INSTANTIATION
        let paintCanvas = new PixelCanvas(4, 19, 0, 120, 80);
        //ROOM INSTANTIATION
        let paintRoom = new Room('paintRoom');
        paintRoom.addObject(backToMain, paintCanvas, postcardBackground, paintButton1, eraserButton, shapeButton, sizeButton);

    //----------------SOCIAL ROOM----------------
        //TEXT INPUT BAR INSTANTIATION
        const inputTextBar = new generateTextInputBar(100, 18, 'black', '#7997bc', 4, basic, 5, 1);
        let textInputBarTest = new inputTextBar(0, 85, 0);
        //FRIENDS INSTANTIATION
            //TODO: MAKE INTO BUTTONLIST
        function instantiateFriends(friends, friendTitle, friendButton) {
            let friendArray = [];
            const titleHeight = 14;
            const buttonHeight = 17;
            const title = new friendTitle('Friend Requests', 0, 0, () => {}, 0);
            friendArray.push(title);

            for (let i = 0; i < friends.length; i++) {
                // Create the friend button
                let friend = new friendButton(friends[i], 0, titleHeight + (buttonHeight * i), () => {}, 0);
                friend.hoverWithChildren = true;
                friend.onHover = () => {
                    friend.updateState('hovered');
                    friend.initializeButtons();
                }

                friend.onStopHover = () => {
                    friend.updateState('default');
                    friend.children = [];
                }

                // Register child button parameters
                const checkButton = new Button('checkButton', 0, 30, () => {
                    console.log('Button was clicked!');
                }, 1);
                const rejectButton = new Button('rejectButton', 0, 50, () => {
                    console.log('Button was clicked!');
                }, 1);

                friend.registerButtonParams([
                    { xOffset: 40, yOffset: 3, zOffset: 10, buttonObject: checkButton, actionOnClick: () => {
                        console.log('Check Button');
                    }},
                    { xOffset: 68, yOffset: 3, zOffset: 10, buttonObject: rejectButton, actionOnClick: () => {
                        console.log('Check Button');
                    }},
                ]);

                friendArray.push(friend);
            }
            return friendArray;
        }
        //ROOM INSTANTIATION
        let socialRoom = new Room('socialRoom');
        socialRoom.addObject(...instantiateFriends(["everlastingflame", "kitgore", "chinapoet"], friendTitle, friendButton), backToMain, textInputBarTest);
        
    //----------------INVENTORY ROOM----------------
        //ITEM INSTANTIATION (PLACEHOLDER)
        let testItem1 = new Item("coffee");
        let testItem2 = new Item("tomatoSoup", 0, 0, 0)
        let testItem3 = new Item("fishingRod", 0, 0, 0)
        let testItem4 = new Item("potion", 0, 0, 0)
        let testItem5 = new Item("redHerring", 0, 0, 0)
        let testItem6 = new Item("tropicalFish", 0, 0, 0)
        let testItem7 = new Item("coffee", 0, 0, 0)
        let testItem8 = new Item("tomatoSoup", 0, 0, 0)
        let testItem9 = new Item("coffee", 0, 0, 0)
        let testItem10 = new Item("potion", 0, 0, 0)
        let testItem11 = new Item("tomatoSoup", 0, 0, 0)
        let itemArray = [testItem1, testItem2, testItem3, testItem4, testItem5, testItem6, testItem7, testItem8, testItem9, testItem10, testItem11];
        //ITEMSLOT FACTORY FUNCTION
        function createItemSlot() {
            let output = new Object("itemSlot", 0, 0, 0);
            output.hoverWithChildren = true;
            output.passMouseCoords = true;
            console.log("createItemSlot instance:", output); // Check the instance
            return output;
        }
        //TOOLTIP INSTANTIATION
        let testToolTip = new toolTip("black", "white", 3, 2, basic);
        //INVENTORY GRID INSTANTIATION
        let inventoryGridTest = new inventoryGrid(3, 3, 5, 3, 7, 0, -1, itemArray, 15, createItemSlot, testToolTip);
        //ROOM INSTANTIATION
        let inventoryRoom = new Room('inventoryRoom');
        inventoryRoom.addObject(backToMain, inventoryGridTest);

    //----------------MOVEMENT FUNCTIONS----------------
        //TODO: INCORPORATE INTO OBJECT CLASS OR CREATE SEPERATE MOVEMENT FILE
        function linearSpeed(diff) {
            const speed = 3; // Speed factor, adjust as needed
            return Math.sign(diff) * Math.min(Math.abs(diff), speed);
        }
        function sineWaveSpeed(currentDistance, totalDistance) {
            if (totalDistance === 0) return 0;

            // Normalize the progress
            let progress = currentDistance / totalDistance;

            // Adjust the progress for a wider bell curve
            // This will make the sine wave reach its peak faster
            progress = Math.pow(progress, .7); // Adjust this exponent to control the curve

            // Sine wave parameters
            let frequency = Math.PI; // One complete sine wave
            let amplitude = 15; // Adjust for maximum speed

            // Calculate speed based on sine wave
            let speed = Math.sin(progress * frequency) * amplitude;

            // Ensure a minimum speed to avoid being stuck
            return Math.max(speed, 0.6);
        }

        function linearSpeed(currentDistance, totalDistance) {
            const speed = 1; // You can adjust this value for faster or slower speed
            return speed;
        }

    }

    export function roomMain(){
        get(game).getCurrentRoom().update();
    }
</script>
