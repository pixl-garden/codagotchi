<script context='module'>
    import { game, Room, shouldFocus,  } from './Game.svelte';
    import { Pet, Button, Background, PixelCanvas } from './Object.svelte';
    import { createTextRenderer} from './TextRenderer.svelte';
    import { generateButtonClass, generateStatusBarClass, generateTextInputBar } from './ObjectGenerators.svelte';
    import { get } from 'svelte/store';

    let background;
    let petObject;
    let basic, gang, retro, tiny; //font renderers
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
        tiny = createTextRenderer('tinyPixls.png', 8, 8, "#FFFFFF", -4, standardCharMap);

        // main menu button (drop down)
        const mainMenuButton = new Button('mainMenuButton', 0, 0, () => {
            get(game).getCurrentRoom().removeObject(mainMenuButton);
            get(game).getCurrentRoom().addObject(dropDown_1, dropDown_2, dropDown_3, dropDown_4, dropDown_5, dropDown_6);
        }, 1);

        const StatusBar = generateStatusBarClass(107, 12, 'black', 'grey', '#40D61A', 2);
        const defaultButtonParams = ['#7997bc', 'black', '#426b9e', 'black', basic, '#47596f', '#a4ccff', '#223751', "#629de9"]
        //generateButtonClass(buttonWidth, buttonHeight, fillColor, borderColor, hoverFillColor, hoverBorderColor, fontRenderer)
        const settingsTitleButton = generateButtonClass(128, 13, '#426b9e', 'black', '#426b9e', 'black', basic, '#223751', "#629de9", '#223751', "#629de9");
        const settingsMenuButton = generateButtonClass(128, 17, ...defaultButtonParams);
        const singleLetterButton = generateButtonClass(16, 16, ...defaultButtonParams);
        const smallLetterButton = generateButtonClass(10, 10, ...defaultButtonParams);
        const friendTitle = generateButtonClass(128, 15, '#426b9e', 'black', '#426b9e', 'black', basic, '#223751', "#629de9", '#223751', "#629de9");
        const friendButton = generateButtonClass(128, 18, '#7997bc', 'black', '#223751', 'black', retro, '#47596f', '#a4ccff','#1b2e43', '#2b4669', "left", 2);
        const dropDownButton = new generateButtonClass(58, 12, '#6266d1', 'black', '#888dfc', 'black', retro, '#5356b2', '#777cff', "#5e62af", "#a389ff");
        const inputTextBar = new generateTextInputBar(100, 18, 'black', '#7997bc', 4, basic, 5, 1);

        const paintButton = generateButtonClass(25, 15, '#8B9BB4', 'black', '#616C7E', 'black', retro, '#BEC8DA', '#5B6A89','#848B97', '#424D64');


        // drop down buttons
        const dropDown_1 = new dropDownButton('Settings', 0, 0, () => {
            get(game).setCurrentRoom('settingsRoom');
        }, 20);
        const dropDown_2 = new dropDownButton('Shop', 0, 12, () => {
            get(game).setCurrentRoom('shopRoom');
        }, 20);
        const dropDown_3 = new dropDownButton('Customize', 0, 24, () => {
            get(game).setCurrentRoom('customizeRoom');
            petObject.setCoordinate(24, 99, 0)
        }, 20);
        const dropDown_4 = new dropDownButton('Paint', 0, 36, () => {
            get(game).setCurrentRoom('paintRoom');
        }, 20);
        const dropDown_5 = new dropDownButton('Social', 0, 48, () => {
            get(game).setCurrentRoom('socialRoom');
        }, 20);
        const dropDown_6 = new dropDownButton('Close', 0, 60, () => {
            get(game).getCurrentRoom().removeObject( dropDown_1, dropDown_2, 
                                                 dropDown_3, dropDown_4, dropDown_5, dropDown_6 );
            get(game).getCurrentRoom().addObject(mainMenuButton);
        }, 20);

        // settings menu buttons
        const settingsTitle = new settingsTitleButton('Settings', 0, 0, () => {
            console.log('Button was clicked!');
        });
        const gitlogin = new settingsMenuButton('Git Login', 0, 12, () => {
            handleGitHubLogin();
        });
        const notifications = new settingsMenuButton('Notifs', 0, 28, () => {});
        const display = new settingsMenuButton('Display', 0, 44, () => {});
        const about = new settingsMenuButton('<BACK', 0, 60, () => {
            get(game).setCurrentRoom('mainRoom'); 
        });
        
        // create rooms
        let mainRoom = new Room('mainRoom', false, false, () => {
            petObject.nextFrame();
        });
        let settingsRoom = new Room('settingsRoom');
        let customizeRoom = new Room('customizeRoom', false, false, () => {
            petObject.nextFrame();
            background.nextFrame();
            customizeUI.nextFrame();
        });
        petObject = new Pet('pearguin', 36, 54, 0, "leaf");
        
        const leftHatArrow = new singleLetterButton('<', 20, 144, () => {
            petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) - 1 < 0 ? hatArray.length - 1 : hatArray.indexOf(petObject.hat) - 1])
        }, 0);
        const rightHatArrow = new singleLetterButton('>', 60, 144, () => {
            petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) + 1 > hatArray.length - 1 ? 0 : hatArray.indexOf(petObject.hat) + 1])
        }, 0);
        const backToMain = new smallLetterButton('<', 3, 2, () => {
            get(game).setCurrentRoom('mainRoom');
            petObject.setCoordinate(36, 54, 0)
        }, 10);

        const statusBar = new StatusBar(20, 2, 0);

        let shopRoom = new Room('shopRoom'); 

        background = new Background('vanityBackground', 0, 0, -20, () => {
            if (background.state === 'open'){
                background.queueState('slideBack')
                background.queueState('default')
            }
            else{
                background.queueState('slide')
                background.queueState('open')
            }
        });

        let shopBackground = new Background('vendingBackground', 0, 0, -20, () => {})

        let paintRoom = new Room('paintRoom');
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
        let paintCanvas = new PixelCanvas(4, 19, 0, 120, 80);

        let socialRoom = new Room('socialRoom');

        let postcardBackground = new Background('postcardBackground', 0, 0, -20, () => {})

        let textInputBarTest = new inputTextBar(0, 85, 0);

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


        // Speed function example
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


        let customizeUI = new Background('customizeUI', 9, 88, -10, () => {
            if(customizeUI.y < 22){
                customizeUI.startMovingTo(9, 88, sineWaveSpeed, [leftHatArrow, rightHatArrow, petObject]);
            }
            else{
                customizeUI.startMovingTo(9, 21, sineWaveSpeed, [leftHatArrow, rightHatArrow, petObject]);
            }
        });
        
        
        // add objects to rooms
        mainRoom.addObject(petObject, mainMenuButton, statusBar);
        settingsRoom.addObject(settingsTitle, gitlogin, notifications, display, about);
        customizeRoom.addObject(petObject, leftHatArrow, rightHatArrow, backToMain, customizeUI, background);
        shopRoom.addObject(backToMain, shopBackground);
        paintRoom.addObject(backToMain, paintCanvas, postcardBackground, paintButton1, eraserButton, shapeButton, sizeButton);
        socialRoom.addObject(...instantiateFriends(["everlastingflame", "kitgore", "chinapoet"], friendTitle, friendButton), backToMain, textInputBarTest);
    }

    export function roomMain(){
        get(game).getCurrentRoom().update();
    }
</script>
