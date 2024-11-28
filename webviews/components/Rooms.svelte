<script context='module'>
    import { game, Room, shouldFocus, handleGitHubLogin, handleGitHubLogout, inputValue, textInput } from './Game.svelte';
    import { Pet, Button, Background, ConfigObject, toolTip, textButtonList, activeTextRenderer, ItemSlot, ObjectGrid, Menu, ButtonList, Notification, GeneratedObject } from './Object.svelte';
    import { postcardRenderer, ColorMenu, postcardInboxManager } from './PostOffice.svelte';
    import { Item, InventoryGrid, inventoryDisplayManager, itemScaler, itemInfoDisplay, InventoryItem } from './Inventory.svelte';
    import { TextRenderer } from './TextRenderer.svelte';
    import { generateTextButtonClass, generateIconButtonClass, generateStatusBarClass, generateTextInputBar, generateInvisibleButtonClass, generateFontTextButtonClass } from './ObjectGenerators.svelte';
    import { generateColorButtonMatrix, generateEmptyMatrix } from './MatrixFunctions.svelte';
    import { get } from 'svelte/store';
    import * as Colors from './colors.js';
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import { Fishing } from "./Fishing.svelte";
    import { MiningManager } from "./Mining.svelte";
    import lootTableConfig from './lootTableConfig.json';
    import { friendListManager, friendRequestManager } from './Social.svelte';
    import itemConfig from './itemConfig.json'
    import { BedroomEditor, BedroomManager } from './Bedroom.svelte';
    
    export function preloadObjects() {
    //----------------FONT RENDERERS----------------
        const standardCharMap = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`;
        //createTextRenderer(image, charWidth, charHeight, backgroundColorOfSpriteSheet, 
            //textColor, letterSpacing, charMap, textShadowColor, textShadowXOffset, textShadowYOffset)
        let basic = new TextRenderer('charmap1.png', 7, 9, Colors.white, Colors.black, Colors.black, 1, standardCharMap);
        let gang = new TextRenderer('gangsmallFont.png', 8, 10, Colors.white, Colors.black, Colors.black, 1, standardCharMap);
        let retro = new TextRenderer('retrocomputer.png', 8, 10, Colors.white, Colors.black, Colors.black, 1, standardCharMap);
        let tiny = new TextRenderer('tinyPixls.png', 8, 8, Colors.white, Colors.black, Colors.black, 1, standardCharMap);
        let retroShadowBlue = new TextRenderer('retrocomputer.png', 8, 10, Colors.white, Colors.black, "#d7d7ff", 1, standardCharMap, "#3c3f83", 1, 1);
        let retroShadowGray = new TextRenderer('retrocomputer.png', 8, 10, Colors.white, Colors.black, "#d7d7ff", 1, standardCharMap, "#464e57", 1, 1);
        let tinyShadow = new TextRenderer('tinyPixls.png', 8, 8, Colors.white, Colors.black, "#dc6060", 1, standardCharMap, "#3f1c1c", 1, 1);
        let electro = new TextRenderer('electroFont.png', 9, 9, Colors.black, [Colors.white, "#555555"], [Colors.black, Colors.white], -1, standardCharMap);

        
    //----------------BUTTON CLASS GENERATORS----------------
        //generateButtonClass(buttonWidth, buttonHeight, fillColor, borderColor, hoverFillColor, hoverBorderColor, fontRenderer,
        //   topShadowColor, bottomShadowColor, topHoverShadowColor, bottomHoverShadowColor,
        //   textAlign ("center" "left" or "right"), margin (only for left or right align))
        const settingsMenuButton = generateTextButtonClass(128, 17, electro, ...Colors.secondaryMenuColorParams);
        const singleLetterButton = generateTextButtonClass(16, 16, basic, ...Colors.secondaryMenuColorParams);
        const smallLetterButton = generateTextButtonClass(10, 10, basic, ...Colors.secondaryMenuColorParams);
        const settingsTitleButton = generateTextButtonClass(128, 13, basic, ...Colors.secondaryMenuTitleColorParams);
        const friendTitle = generateTextButtonClass(128, 15, basic, ...Colors.secondaryMenuColorParams);
        const friendButton = generateTextButtonClass(128, 18, basic, ...Colors.transparentMenuColorParams, "left", 2);
        const dropDownButton = new generateTextButtonClass(58, 13, retroShadowBlue, ...Colors.mainMenuColorParams);
        const paintButtonText = generateTextButtonClass(19, 15, retroShadowBlue, ...Colors.secondaryMenuColorParams);
        const squarePaintTextButton = generateTextButtonClass(11, 15, retroShadowGray, ...Colors.secondaryMenuColorParams);
        const paintButtonIcon = generateIconButtonClass(19, 15, ...Colors.secondaryMenuColorParams);
        const paintButtonIcon2 = generateIconButtonClass(18, 15, ...Colors.secondaryMenuColorParams);
        const brushSizeButton = generateTextButtonClass(10, 15, retroShadowGray, ...Colors.secondaryMenuColorParams);
        const invisibleStampButton = generateInvisibleButtonClass(21, 21);
        const invisiblePostcardTextInputButton = generateInvisibleButtonClass(80, 80);
        const socialTabButton = generateTextButtonClass(57, 16, basic, ...Colors.secondaryMenuColorParams);
        const fontButton = generateFontTextButtonClass(35, 12, '#c6d6ff', 'transparent', '#616C7E', 'transparent');
        const paintUnhoverableButton = generateTextButtonClass(18, 15, retroShadowBlue, ...Colors.secondaryMenuUnhoverableColorParams);
        const fishingButton = generateTextButtonClass(30, 15, basic, ...Colors.secondaryMenuColorParams);
        const miningButton = generateTextButtonClass(30, 15, basic, ...Colors.secondaryMenuColorParams);
        const invisibleMiningButton = generateInvisibleButtonClass(34, 57);
        const inventoryTabButton = generateIconButtonClass(18, 18, 'transparent', 'transparent', 'transparent', 'transparent');
        const changePageButton = generateIconButtonClass(8, 16, 'transparent', 'transparent', 'transparent', 'transparent');
        // const mainMenuIconLarge = generateInvisibleButtonClass(25, 25);
        // const mainMenuIconMeduim = generateInvisibleButtonClass(18, 18);
        // const mainMenuIconSmall = generateInvisibleButtonClass(10, 10);




    //---------------GENERAL OBJECTS----------------
        //BUTTON TO RETURN TO MAIN ROOM
        const backToMain = new singleLetterButton(0, 0, 10, '<', () => {
            get(game).setCurrentRoom('mainRoom');
        });
        const backToMain2 = new singleLetterButton(0, 112, 11, '<', () => {
            get(game).setCurrentRoom('mainRoom');
        });
        // button to return to paint room
        const backToPaintRoom = new singleLetterButton(0, 112, 10, '<', () => {
            get(game).setCurrentRoom('paintRoom');
        });

        // TODO: add button to friends and postcard rooms
        // const backToPostOffice = new singleLetterButton(0, 112, 10, '<', () => {
        //     get(game).setCurrentRoom('postOfficeRoom');
        // });

        // TODO: add button to mining and fishing rooms
        // const backToMapRoom = new singleLetterButton(0, 112, 10, '<', () => {
        //     get(game).setCurrentRoom('mapRoom');
        // });
        //bgColor, innerBorderColor, outerBorderColor, innerRoundness, outerRoundness, innerBorderThickness = 3 , outerBorderThickness = 1
        let defaultMenuParams = ["#59585a", "#2b2a2b", Colors.black, 2, 5, 3, 1];

    //----------------MAIN ROOM----------------
        //STATUS BAR INSTANTIATIONS
        const StatusBar = generateStatusBarClass(50, 7,  Colors.black, Colors.grey, Colors.red, Colors.orange, Colors.green, 1);
        const manaBar = new StatusBar(77, 53, 0);
        const hungerBar = new StatusBar(77, 62, 0);
        const healthBar = new StatusBar(77, 71, 0);

        // // MAIN MENU ICONS
        const manaIcon = new Background('manaIcon', 67, 50, 0);
        const hungerIcon = new Background('hungerIcon', 65, 61, 0);
        const healthIcon = new Background('heartIcon', 67, 71, 0);

        const levelBar = new Background('levelBar', 96, 4, 0);
        const numTest = new Background('numTest', 106, 12, 1);

        const greyBackground = new Background('greyBackground', 0, 0, -20, () => {} );
        // greyBackground.opacity = 0.7;


        // // MAIN MENU BUTTON INSTANTIATIONS
        const settingsButton = new Button(2, 4, 0, 'settingsIcon', () => {get(game).setCurrentRoom('settingsRoom')});
        const inventoryButton = new Button(5, 90, 0, 'inventoryIcon', () => {get(game).setCurrentRoom('inventoryRoom')});
        const worldButton = new Button(30, 100, 0, 'worldIcon', () => {get(game).setCurrentRoom('mapRoom')});
        const bedroomButton = new Button(53, 101, 0, 'bedroomIcon2', () => {get(game).setCurrentRoom('bedroomRoom')});
        const paintRoomButton = new Button(80, 103, 0, 'paintRoomIcon', () => {get(game).setCurrentRoom('paintRoom')});
        const postOfficeButton = new Button(102, 94, 0, 'postOfficeIcon', () => {get(game).setCurrentRoom('postOfficeRoom'); });

        const leftPetButton = new Button(2, 66, 0, 'leftPetArrow', () => {

        });
        const rightPetButton = new Button(54, 66, 0, 'rightPetArrow', () => {

        });

        //MAIN MENU INSTANTIATION
        const mainMenuButtonTexts = ['Settings', 'Shop', 'Customize', 'Paint', 'Friends', 'Inventory', 'Fishing', 'Mining', 'PostOffice', 'Close'];
        const mainMenuButtonFunctions = [() => {get(game).setCurrentRoom('settingsRoom')}, 
        () => {get(game).setCurrentRoom('shopRoom')}, 
        () => {get(game).setCurrentRoom('customizeRoom')}, 
        () => {get(game).setCurrentRoom('paintRoom')}, 
        () => {get(game).setCurrentRoom('friendRoom')}, 
        () => {get(game).setCurrentRoom('inventoryRoom')}, 
        () => {get(game).setCurrentRoom('fishingRoom')},
        () => {get(game).setCurrentRoom('caveEntranceRoom')},
        () => {get(game).setCurrentRoom('postOfficeRoom')},
        () => {
            get(game).getCurrentRoom().removeObject( mainMenu ); 
            get(game).getCurrentRoom().addObject( mainMenuButton );}
        ]
        const mainMenu = new textButtonList(mainMenuButtonTexts, mainMenuButtonFunctions, dropDownButton, 58, 12, -1, 0, 0, 3);
        //BUTTON TO OPEN MAIN MENU
        const mainMenuButton = new Button(0, 0, 1, 'mainMenuButton', () => {
            get(game).getCurrentRoom().removeObject(mainMenuButton);
            get(game).getCurrentRoom().addObject(mainMenu);
        });
        //PET INSTANTIATION
        let petObject = new Pet('pearguin', 8, 40, 0, get(game));
        //ROOM INSTANTIATION
        let mainRoom = new Room('mainRoom', () => {
            petObject.setCoordinate(8, 40, 0);
        }, false, () => {
            petObject.nextFrame();
        });
        mainRoom.addObject(greyBackground, manaBar, healthBar, hungerBar, petObject, manaIcon, healthIcon, hungerIcon, levelBar, numTest, settingsButton,
            inventoryButton, worldButton, bedroomButton, paintRoomButton, postOfficeButton, leftPetButton, rightPetButton
        );
        // mainRoom.addObject(petObject, mainMenuButton);
        
    //----------------SETTINGS ROOM----------------
        //SETTINGS MENU INSTANTIATION

        // check the bedroom data to see if the user is logged in
        let isLoggedIn = get(game).getLocalState().isLoggedIn;
        // console.log('isLoggedIn:', isLoggedIn);

        let settingsMenuButtonTexts 
        function setSettingsMenu(){
            settingsMenuButtonTexts= [
                isLoggedIn ? 'GitHub Log out' : 'GitHub Log in',
                'Notifs',
                'Display',
                '\<BACK'
            ];
        }
        setSettingsMenu();
        

        const settingsMenuButtonFunctions = [
            isLoggedIn ? () => {handleGitHubLogout(); isLoggedIn = !isLoggedIn; setSettingsMenu()}: () => {handleGitHubLogin(); isLoggedIn = !isLoggedIn; setSettingsMenu()} ,
            () => {},
            () => {},
            () => {get(game).setCurrentRoom('mainRoom')}
        ];

        const settingsTitle = new settingsTitleButton(0, 0, 0, 'Settings', () => {});
        const settingsMenu = new textButtonList(
            settingsMenuButtonTexts,
            settingsMenuButtonFunctions,
            settingsMenuButton,
            58,
            12,
            -1,
            0,
            12,
            0
        );
        //ROOM INSTANTIATION
        let settingsRoom = new Room('settingsRoom');
         settingsRoom.addObject(settingsTitle, settingsMenu);
    
    //----------------CUSTOMIZE ROOM----------------
        //BACKGROUND INSTANTIATION
        let vanityBackground = new Background('vanityBackground', 0, 0, -20, () => {
            // if (vanityBackground.state === 'open'){
            //     vanityBackground.queueState('slideBack')
            //     vanityBackground.queueState('default')
            // }
            // else{
            //     vanityBackground.queueState('slide')
            //     vanityBackground.queueState('open')
            // }
        });
        //CUSTOMIZATION UI INSTANTIATION
        let hatArray = ["leaf", "marge", "partyDots", "partySpiral", "superSaiyan"]
        const leftHatArrow = new singleLetterButton(20, 100, 0, '<', () => {
            petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) - 1 < 0 ? hatArray.length - 1 : hatArray.indexOf(petObject.hat) - 1])
        });
        const rightHatArrow = new singleLetterButton(60, 100, 0, '>', () => {
            petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) + 1 > hatArray.length - 1 ? 0 : hatArray.indexOf(petObject.hat) + 1])
        });
        let customizeUI = new Background('customizeUI', 9, 88, -10, () => {
            if(customizeUI.y < 22){
                customizeUI.startMovingTo(9, 88);
                customizeUI.startOpacityTransition(0, .07);
            }
            else{
                customizeUI.startMovingTo(9, 21);
                customizeUI.startOpacityTransition(.9, .07);
            }
        });

        //ROOM INSTANTIATION
        let customizeRoom = new Room('customizeRoom', () => {
            customizeUI.addChild(leftHatArrow)
            customizeUI.addChild(rightHatArrow)
            customizeUI.addChild(petObject)

            petObject.setCoordinate(15, 11, 10);
        }, false, () => {
            petObject.nextFrame();
            vanityBackground.nextFrame();
            customizeUI.nextFrame();
        });
        customizeRoom.addObject(backToMain, customizeUI, vanityBackground);
    
    //----------------SHOP ROOM----------------
        let shopBackground = new Background('vendingBackground', 0, 0, -20, () => {})
        let shopRoom = new Room('shopRoom'); 
        shopRoom.addObject(backToMain, shopBackground);

    //----------------PAINT ROOM----------------

        let colorPallete = [
            Colors.red,  
            Colors.orange,  
            Colors.green,  
            Colors.blue,  
            Colors.darkslateblue,  
            Colors.purple,  
            Colors.magenta,  
            Colors.lime,  
            Colors.pink,  
            Colors.azure,  
            Colors.beige,  
            Colors.greenyellow,  
            Colors.indianred,  
            Colors.lightcoral,  
            Colors.white,  
            Colors.black,
            Colors.transparent
        ];

        //TODO: change this to either save item names or predefine ids
        // create stamp and text renderer arrays
        function getStampStringsFromConfig() {
            let stampArray = [];
            for (let key in itemConfig) {
                if (itemConfig[key].type === 'stamp') {
                    stampArray.push(`${key}`);
                }
            }
            return stampArray;
        }
        const stampArray = getStampStringsFromConfig();

        const textRendererArray = [tiny, gang, retro, basic];
            
        // POSTCARD RENDERER INSTANTIATION
        let postcardRendering = new postcardRenderer(4, 24, 0, 120, 80, 120, 80, gang, textInput, colorPallete, stampArray, textRendererArray);
    
        //BACKGROUND INSTANTIATION
        let postcardBackground = new Background('paintBackground', 0, 0, -20, () => {});
        let postcardTextSave = "";

        //ROOM INSTANTIATION
        let paintRoom = new Room('paintRoom', 
            () => {
                // load saved input value from previous session with postcard
                document.getElementById('hiddenInput').value = postcardTextSave;
                inputValue.set(postcardTextSave);
            }, 
            () => {
                // save input value for current postcard on exit
                postcardTextSave = document.getElementById('hiddenInput').value;
            }, 
            () => {
            postcardRendering.nextFrame();
            blackFadeIn.nextFrame();
            // postcardRendering.setUserText(get(inputValue));
        });
        paintRoom.clearTextOnExit = false; // Prevent text clearing so text can be exported in send postcard room

        // PAINT BUTTON INSTANTIATION
        let paintButtonSprites = spriteReaderFromStore(15, 11, 'paintIcons_B&W.png');
        let paintBackToMain = new squarePaintTextButton(0, 0, 5, '<', () => {
            get(game).setCurrentRoom('mainRoom');
        });
        let colorMenuObj = new ColorMenu(6, 16, 12, 44, 44, 6, 2, 4, 4, colorPallete,
         (color) => { 
            postcardRendering.setColor(color); 
            paintRoom.removeObject(colorMenuObj); 
            let newColorButtonIcon = generateColorButtonMatrix(9, 9, color);
            colorButton.setIcon(newColorButtonIcon, newColorButtonIcon);
        },
        '#8B9BB4', '#616C7E', Colors.black, 2, 3, 3, 1);
        let defaultColorButtonIcon = generateColorButtonMatrix(9, 9, Colors.black)
        let colorButton = new paintButtonIcon(10, 0, 5, defaultColorButtonIcon, defaultColorButtonIcon, ()=>{
            if(paintRoom.objects.includes(colorMenuObj)){
                closeAllPaintMenus();
            }
            else{
                closeAllPaintMenus();
                paintRoom.addObject(colorMenuObj);
            }
        });
        let pencilButton = new paintButtonIcon(28, 0, 5, paintButtonSprites[0], paintButtonSprites[0], ()=>{
            postcardRendering.currentCanvas.setToPencilColor()
        });
        let eraserButton = new paintButtonIcon(46, 0, 5, paintButtonSprites[4], paintButtonSprites[4], ()=>{
            postcardRendering.currentCanvas.setEraser();
        });
        let clearButton = new paintButtonIcon(110, 0, 5, paintButtonSprites[5], paintButtonSprites[5], ()=>{
            postcardRendering.currentCanvas.clearCanvas();
        });
        let bucketButton = new paintButtonIcon2(64, 0, 5, paintButtonSprites[6], paintButtonSprites[6], ()=>{
            postcardRendering.currentCanvas.toggleFill();
        });
        let sizeNumber = new activeTextRenderer(retroShadowGray, 93, 2, 5);
        sizeNumber.setText((postcardRendering.currentCanvas.brushSize / 2).toString());
        let sizeBackground = new paintUnhoverableButton(88, 0, 4, ' ', () => {});
        let brushSizeDown = new brushSizeButton(81, 0, 5, '<', ()=>{
            postcardRendering.currentCanvas.decrementSize();
            sizeNumber.setText((postcardRendering.currentCanvas.brushSize / 2).toString());
        });
        let brushSizeUp = new brushSizeButton(101, 0, 5, '>', ()=>{
            postcardRendering.currentCanvas.incrementSize();
            sizeNumber.setText((postcardRendering.currentCanvas.brushSize / 2).toString());
        });

        // FONT MENU INSTANTIATION
        let fontMenuButton = new paintButtonIcon2(64, 0, 5, paintButtonSprites[7], paintButtonSprites[7], ()=>{
            if(paintRoom.objects.includes(fontButtonList)) {
                closeAllPaintMenus();
            }
            else{
                closeAllPaintMenus();
                paintRoom.addObject(fontButtonList);
                paintRoom.addObject(fontMenu);
            }
        });
        let sendPostcardButton = new paintButtonIcon(109, 113, 5, paintButtonSprites[8], paintButtonSprites[8], ()=>{
            get(game).setCurrentRoom('sendPostcardRoom');
        });

        let tinyButton = new fontButton(60, 60, 30, 'tiny', ()=>{
            postcardRendering.setTextRenderer(tiny);
            closeAllPaintMenus();
        }, tiny, 2);
        let gangButton = new fontButton(75, 60, 30, 'gang', ()=>{
            postcardRendering.setTextRenderer(gang);
            closeAllPaintMenus();
        }, gang, -1);
        let retroButton = new fontButton(100, 60, 30, 'retro', ()=>{
            postcardRendering.setTextRenderer(retro);
            closeAllPaintMenus();
        }, retro);
        let basicButton = new fontButton(115, 60, 30, 'basic', ()=>{
            postcardRendering.setTextRenderer(basic);
            closeAllPaintMenus();
        }, basic);
        let fontButtonArray = [tinyButton, gangButton, retroButton, basicButton];

        let fontButtonList = new ObjectGrid(1, 0, fontButtonArray.length, -1, 60, 22, 30, fontButtonArray);
        let fontMenu = new Menu(54, 16, 12, 47, fontButtonArray.length*12+9, '#8B9BB4', '#616C7E', Colors.black, 2, 3, 3, 1);

        let undoButton = new Button(37, 111, 5, 'undoButton', () => {
            postcardRendering.currentCanvas.retrievePastCanvas();   
        });
        let redoButton = new Button(74, 111, 5, 'redoButton',  () => {
            postcardRendering.currentCanvas.retrieveFutureCanvas();
        });

        let flipButton = new Button(55, 111, 5, 'flipButton', () => {
            if(postcardRendering.state === 'front'){
                get(game).getCurrentRoom().addObject( postcardTextInputButton );
                get(game).getCurrentRoom().addObject( stampButton );
                get(game).getCurrentRoom().removeObject( bucketButton );
                get(game).getCurrentRoom().addObject( fontMenuButton );
            } else if (postcardRendering.state === 'back'){
                get(game).getCurrentRoom().removeObject( postcardTextInputButton );
                get(game).getCurrentRoom().removeObject( stampButton );
                get(game).getCurrentRoom().addObject( bucketButton );
                get(game).getCurrentRoom().removeObject( fontMenuButton );
            }
            closeAllPaintMenus();
            postcardRendering.flipPostcard();
        });

        // STAMP MENU INSTANTIATION
        let stampMenu = new Background('box_canvas', 9, 17, 13, () => {});
        function createStampSlot() {
            let output = new ItemSlot("stampSlot", 0, 0, 0);
            output.hoverWithChildren = true;
            output.passMouseCoords = true;
            return output;
        }

        const stampSlotClickAction = (item) => {
            if(item !== null){
                stampGrid.displayToolTip = false;
                postcardRendering.setStamp(item);
                closeAllPaintMenus();
                stampGrid.onStopHover();
                blackFadeIn.opacity = 0; 
                get(game).getCurrentRoom().removeObject( blackFadeIn );
            }
        }

        let testToolTip = new toolTip(Colors.black, Colors.white, 3, 2, basic);
        let stampInvArray = get(game).inventory.getItemsByType('stamp');
        console.log("inventory", get(game).inventory, get(game).inventory.items);
        console.log("stampInvArray", stampInvArray);
        // let stampGrid = new inventoryGrid(3, 3, 3, 3, 24, 24, 15, stampInvArray, createStampSlot, testToolTip, null, 4, 4, 10, stampSlotClickAction);

        const stampGrid = new InventoryGrid({
            columns: 3, rows: 3,
            spacing: { x: 3, y: 3 },
            position: { x: 24, y: 24, z: 15 },
            items: stampInvArray,
            slotFactory: createStampSlot,
            toolTip: testToolTip,
            numberTextRenderer: null,
            slotClickAction: stampSlotClickAction,
            itemOffset: { x: 4, y: 4, z: 10 }
        });
        
        const blackFadeIn = new Background('blackground', 0, 0, 12, () => {
            stampGrid.displayToolTip = false;
            closeAllPaintMenus();
            stampGrid.onStopHover();
            blackFadeIn.opacity = 0; 
            get(game).getCurrentRoom().removeObject( blackFadeIn );
        } );
        blackFadeIn.opacity = 0; 


        
        let stampButton = new invisibleStampButton(95, 27, 11, () => {
            closeAllPaintMenus();
            blackFadeIn.startOpacityTransition(0.75, 0.08, 1);
            get(game).getCurrentRoom().addObject( blackFadeIn );
            get(game).getCurrentRoom().addObject( stampMenu );
            get(game).getCurrentRoom().addObject( stampGrid );
            console.log("room: ", get(game).getCurrentRoom(), get(game).getCurrentRoom().objects);
            stampGrid.updateItemSlots(stampInvArray);
        })
        let postcardTextInputButton = new invisiblePostcardTextInputButton(4, 19, 11, () => {
            if(get(shouldFocus) === false){
                shouldFocus.set(true);
                postcardRendering.setTextActive(true);
            }
            else{
                shouldFocus.set(false);
                postcardRendering.setTextActive(false);
            }
        })
        paintRoom.addObject(paintBackToMain, postcardRendering, postcardBackground, colorButton, eraserButton, 
               clearButton, brushSizeDown, brushSizeUp, sizeNumber, sizeBackground, undoButton, redoButton, pencilButton, 
               flipButton, bucketButton, sendPostcardButton);

        function closeAllPaintMenus(){
            if(paintRoom.objects.includes(colorMenuObj)){
                paintRoom.removeObject(colorMenuObj);
            }
            if(paintRoom.objects.includes(fontButtonList)){
                paintRoom.removeObject(fontButtonList);
                paintRoom.removeObject(fontMenu);
            }
            if(paintRoom.objects.includes(stampMenu)){
                paintRoom.removeObject(stampMenu);
                paintRoom.removeObject(stampGrid);
            }
        }

    //----------------SEND POSTCARD ROOM----------------
        let sendFriendListInstance = new friendListManager(0, 16, 0, get(game), friendButton, (username) => {
            postcardRendering.exportPostcard(username);
            get(game).setCurrentRoom('paintRoom');
        });
        let sendPostcardRoom = new Room('sendPostcardRoom', 
            () => {
                // get(game).syncLocalToGlobalState();
                sendFriendListInstance.refreshFriends();
            },
        );
        sendPostcardRoom.clearTextOnExit = false;

        sendPostcardRoom.addObject(sendFriendListInstance, backToPaintRoom);
        // ...instantiateFriendRequests(friendRequestUsernames, friendRequestUids, friendButton)

    //----------------SOCIAL ROOM----------------

        const friendsUI = new Background('friendsGUI', 0, 0, -20, () => {});
       
    // should have a button back and two sections (friends and requests)

        //TEXT INPUT BAR INSTANTIATION        
        const addFriendTextBar = new generateTextInputBar(textInput, 112, 16, Colors.black, '#7997bc', 4, basic, 5, 1);
        let inputBar = new addFriendTextBar(0, 16, 0);
        let sendFriendRequestButton = new brushSizeButton(118, 16, 0, '>', () => {
            let inputUsername = inputBar.getUserText();
            tsvscode.postMessage({ type: 'sendFriendRequest', val: inputUsername });
        });



        let friendListManagerInstance = new friendListManager(11, 6, 0, get(game), friendButton, ()=>{}, basic);
        let friendRequestManagerInstance = new friendRequestManager(0, 30, 0, get(game), friendButton);
        
        const socialTabs = ['Friends', 'Add'];

        const socialTabList = new textButtonList(socialTabs, [
            () => {get(game).setCurrentRoom('friendRoom')}, 
            () => {get(game).setCurrentRoom('requestRoom')}
        ], socialTabButton, 57, 15, -1, 15, 0, 5, "horizontal");
        
        //ROOM INSTANTIATION
        let friendRoom = new Room('friendRoom', 
            () => {
                // get(game).syncLocalToGlobalState();
                friendListManagerInstance.refreshFriends();
                friendRequestManagerInstance.refreshRequests();
            },
        );
        let requestRoom = new Room('requestRoom');

        friendRoom.addObject(friendsUI, friendListManagerInstance, backToMain);
        // ...instantiateFriendRequests(friendRequestUsernames, friendRequestUids, friendButton)
        requestRoom.addObject(friendRequestManagerInstance, backToMain, socialTabList, 
                              inputBar, sendFriendRequestButton);
        
    //----------------INVENTORY ROOM----------------
        function addTestableItems() {
            for(let i = 2; i <= 16; i++) {
                get(game).addStackableItem(`test${i}`, 2);

            }
            get(game).addStackableItem(`ore1`, 2);
            get(game).addStackableItem(`ingot1`, 2);
        }
        // get(game).addStackableItem('HTMLStamp', 2);
        // get(game).addStackableItem('CStamp', 2);
        // get(game).addStackableItem('CSSStamp', 2);

        // addTestableItems();
        
        //ITEMSLOT FACTORY FUNCTION
        function createItemSlot() {
            let output = new ConfigObject("smallItemSlot", 0, 0, 0);
            output.hoverWithChildren = true;
            output.passMouseCoords = true;
            // console.log("createItemSlot instance:", output); // Check the instance
            return output;
        }
        
        //INVENTORY GRID INSTANTIATION
        let scaledItemInstance = new itemScaler(12, 90, 2, 2);
        const inventoryGridInstance = new InventoryGrid({
            columns: 5, rows: 3,
            spacing: { x: 2, y: 2 },
            position: { x: 15, y: 21, z: 1 },
            items: [],
            slotFactory: createItemSlot,
            tooltip: null,
            numberTextRenderer: electro,
            slotClickAction: () => {},
            itemOffset: { x: 0, y: 0, z: 1 }
        });
        
        let fishSprites = spriteReaderFromStore(16, 16, 'fish.png');
        let testingSprites = spriteReaderFromStore(16, 16, 'testSprites.png');
        
        let inventoryTabList = new ButtonList(26, 2, 5, "horizontal", 2, inventoryTabButton, null,
            [fishSprites[1], fishSprites[1], ()=>{
                inventoryDisplayManagerInstance.setTab("food");
            }],
            [testingSprites[5], testingSprites[5], ()=>{
                inventoryDisplayManagerInstance.setTab("mining");
            }]
        );
        let itemInfoDisplayInstance = new itemInfoDisplay(53, 97, 5, tiny);
        let prevPageButton = new Button(0, 42, 5, "prevPageButton", ()=> {
            inventoryDisplayManagerInstance.inventoryGrid.setPrevPage();
        });

        let nextPageButton = new Button(120, 42, 5, "nextPageButton", ()=> {
            inventoryDisplayManagerInstance.inventoryGrid.setNextPage();
        });
        
        let inventoryBackground = new Background('inventoryBrownSquare', 0, 0, -20, () => {} );
        //ROOM INSTANTIATION
        let inventoryRoom = new Room('inventoryRoom', () => {
            get(game).retrieveInventory();
            inventoryDisplayManagerInstance.setTab("food");
        });
        
        let inventoryDisplayManagerInstance = new inventoryDisplayManager(0, 0, 0, get(game), inventoryGridInstance, inventoryTabList,
             scaledItemInstance, itemInfoDisplayInstance, prevPageButton, nextPageButton);
        inventoryRoom.addObject(backToMain, inventoryBackground, inventoryDisplayManagerInstance);

        // ---------------- FISHING ROOM ----------------
        let fishingInstance = new Fishing();

        let fishingNotif = new Notification(6, -29, 12, 116, 28, retroShadowGray, '#8B9BB4', '#616C7E', Colors.black, 2, 3, 3, 1)
        let castLineButton = new fishingButton(90, 60, 5, "FISH", ()=>{
            if(get(game).isActive){
            castLineHandler();
        }});
        let cancelButton = new fishingButton(90, 60, 5, "STOP", () => {
            fishingInstance.cancelFishing();
            get(game).getCurrentRoom().addObject( castLineButton );
            get(game).getCurrentRoom().removeObject( cancelButton );
        });
        
        function castLineHandler() {
            get(game).getCurrentRoom().addObject( cancelButton );
            get(game).getCurrentRoom().removeObject( castLineButton );
            castLineUntil();
        }

        function castLineUntil() {
            fishingInstance.castLine(get(game), 2000, 1000).then((fishItem) => {
                fishingNotif.callNotificationItem(fishItem, () => {
                    if(get(game).isActive && !fishingInstance.cancelFlag) {
                        castLineUntil();
                    }
                    fishingInstance.cancelFlag = false;
                })
            }).catch((error) => {
                console.log(error.message);
            });
        }        

        let fishingRoom = new Room('fishingRoom',  
            () => {
                petObject.setCoordinate(36, 57, 0);
            },
            false,
            () => {
                petObject.nextFrame();
                fishingNotif.nextFrame();
            },
            ()=> {
                castLineHandler();
            },
            ()=> {
                get(game).getCurrentRoom().addObject( castLineButton );
                get(game).getCurrentRoom().removeObject( cancelButton );
            }
        );
        let fishingBackground = new Background('fishingBackground', 0, 0, -20, () => {} );
        let emptySpriteMatrix = generateEmptyMatrix(128, 128);
        let placementMouseDetector = new GeneratedObject([emptySpriteMatrix], {default: [0]}, 0, 0, 15);
        fishingBackground.addChild(placementMouseDetector);
        let boatFront = new Background('boatFront', 35, 89, 1, () => {} );

        fishingNotif.setPhysics(16, .2, 3.8);
        fishingRoom.addObject(backToMain2, fishingBackground, petObject, castLineButton, fishingNotif, boatFront);

        // ---------------- CAVE ENTRANCE ROOM ----------------
        let caveEntranceRoom = new Room('caveEntranceRoom',  
            () => {
                petObject.setCoordinate(23, 71, 0);
            },
            false,
            () => {
                petObject.nextFrame();
            },
            () => {},
            () => {

            }
        );
        let caveEntrance = new Background('caveEntrance', 0, 0, -20, () => {} );
        let doorButton = new invisibleMiningButton(46, 45, 5, () => {
            get(game).setCurrentRoom('miningRoom');
        })

        caveEntranceRoom.addObject(backToMain2, caveEntrance, petObject, doorButton);

        // ---------------- MINING ROOM ----------------

        let miningNotif = new Notification(6, -29, 12, 116, 28, retroShadowGray, '#8B9BB4', '#616C7E', Colors.black, 2, 3, 3, 1)
        let miningEnterActive = false;
        let blockTypes = lootTableConfig["miningTiers"];
        let miningInstance = new MiningManager(64, 64, 5, 1, 8, 10, blockTypes);
        
        let beginMiningButton = new miningButton(90, 90, 5, "MINE", ()=>{
            if(miningEnterActive) {
                miningHandler();
            }
        });
        let cancelMiningButton = new miningButton(90, 90, 5, "STOP", () => {
            miningInstance.cancelMining();
            get(game).getCurrentRoom().addObject( beginMiningButton );
            get(game).getCurrentRoom().removeObject( cancelMiningButton );
        });
        
        function miningHandler() {
            get(game).getCurrentRoom().addObject( cancelMiningButton );
            get(game).getCurrentRoom().removeObject( beginMiningButton );
            mineUntil();
        }

        function mineUntil() {
            miningInstance.mineBlocks(get(game)).then((ore) => {
                miningNotif.callNotificationItem(ore, () => {
                    if(get(game).isActive && !miningInstance.cancelFlag){
                        mineUntil();
                    }
                    miningInstance.cancelFlag = false;
                })
                miningInstance.x = 80;
                miningInstance.generateObjectGrid()
                miningInstance.startMovingTo(64, 64);
            }).catch((error) => {
                console.log(error.message);
            });
        }
        
        let miningRoom = new Room('miningRoom',  
        // Enter logic
        () => {
            petObject.setCoordinate(23, 48, 0);
            if(get(game).isActive) {
                miningEnterActive = true;
            }
        },
        // Exit logic
        () => {
            miningInstance.cancelMining();
            get(game).getCurrentRoom().addObject( beginMiningButton );
            get(game).getCurrentRoom().removeObject( cancelMiningButton );
            miningNotif.reset();
        },
        // Update logic
        () => {
            petObject.nextFrame();
            miningNotif.nextFrame();
            miningInstance.nextFrame();
        },
        // On Activity Logic
        ()=> {
            miningHandler();
        },
        // On Inactivity Logic
        ()=> {
            miningEnterActive = false;
            get(game).getCurrentRoom().addObject( beginMiningButton );
            get(game).getCurrentRoom().removeObject( cancelMiningButton );
        }
    );
    
    let miningBackground = new Background('miningBackground', 0, 0, -20, () => {} );

    miningInstance.setPhysics(8, 5, 2);
    miningRoom.addObject(backToMain2, miningBackground, miningInstance, beginMiningButton, petObject, miningNotif);

    // ---------------- POST OFFICE ROOM ----------------
    let postOfficeRoom = new Room('postOfficeRoom', () => {get(game).retrieveInbox()}, false, () => {});


    const postOfficeButtonTexts = ['Friends', 'Postcards'];
        const postOfficeButtonFunctions = [
        () => {get(game).setCurrentRoom('friendRoom')}, 
        () => {get(game).setCurrentRoom('recievedPostcardsRoom')}
    ]
    const postOfficeButtonList = new textButtonList(postOfficeButtonTexts, postOfficeButtonFunctions, dropDownButton, 58, 12, -1, 0, 0, 3);
    

    postOfficeRoom.addObject(postOfficeButtonList, backToMain2);


    // // MAP ROOM INSTANTIATION
    let mapRoom = new Room('mapRoom', () => {}, false, () => {});

    const mapButtonTexts = ['Mining', 'Fishing'];
        const mapButtonFunctions = [
        () => {get(game).setCurrentRoom('caveEntranceRoom')}, 
        () => {get(game).setCurrentRoom('fishingRoom')}
    ]
    const mapButtonList = new textButtonList(mapButtonTexts, mapButtonFunctions, dropDownButton, 58, 12, -1, 0, 0, 3);
    

    mapRoom.addObject(mapButtonList, backToMain2);

    // RECIEVED POSTCARDS ROOM INSTANTIATION
    // create postcardManagerInstance for to handle recieved postcards
    let receivedPostcardManagerInstance = new postcardInboxManager(0, 0, 0, get(game), friendButton, colorPallete, textRendererArray, stampArray);   
    let nextPageButtonPostcard = new Button(100, 110, 5, "nextPageButton", ()=>{
        receivedPostcardManagerInstance.postcardButtonList.setNextPage();
        });
    let prevPageButtonPostcard = new Button(20, 110, 5, "prevPageButton", ()=>{
        receivedPostcardManagerInstance.postcardButtonList.setPrevPage();
        // blackFadeIn.startOpacityTransition(0.5, 0.05);

    });
    let recievedPostcardsRoom = new Room('recievedPostcardsRoom', () => {
        receivedPostcardManagerInstance.refreshPostcards();
    }, false, () => {
        receivedPostcardManagerInstance.nextFrame();
        // blackFadeIn.nextFrame();
    });

    recievedPostcardsRoom.addObject(receivedPostcardManagerInstance, backToMain2, nextPageButtonPostcard, prevPageButtonPostcard)

    // ---------------- BEDROOM ----------------
    let bedroomRoom = new Room('bedroomRoom', () => {console.log(bedroomRoom.objects)}, false, () => {
        bedroomEditorInstance.nextFrame();
    });

    let bedroomManagerInstance = new BedroomManager();
    let bedroomEditorInstance = new BedroomEditor(get(game), bedroomManagerInstance);

    bedroomRoom.addObject(bedroomManagerInstance, bedroomEditorInstance, backToMain2);
}

    export function roomMain(){
        get(game).getCurrentRoom().update();
    }
</script>
