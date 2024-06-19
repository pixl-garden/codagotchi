<script context='module'>
    import { game, Room, shouldFocus, handleGitHubLogin, inputValue } from './Game.svelte';
    import { Pet, Button, Background, PixelCanvas, Object, toolTip, buttonList, activeTextRenderer, ColorMenu, postcardRenderer, ItemSlot, objectGrid, Menu } from './Object.svelte';
    import { Item, inventoryGrid } from './Inventory.svelte';
    import { TextRenderer } from './TextRenderer.svelte';
    import { generateTextButtonClass, generateIconButtonClass, generateStatusBarClass, generateTextInputBar, generateInvisibleButtonClass, generateFontTextButtonClass } from './ObjectGenerators.svelte';
    import { generateColorButtonMatrix } from './MatrixFunctions.svelte';
    import { get } from 'svelte/store';
    import Codagotchi from './Codagotchi.svelte';
    import * as Colors from './colors.js';
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import { weightedRandomSelection } from './LootGenerator.svelte';
    import lootTableConfig from './lootTableConfig.json';
    import { Fishing } from "./Fishing.svelte";
    
    export function preloadObjects() {
    //----------------FONT RENDERERS----------------
        const standardCharMap = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`;
        //createTextRenderer(image, charWidth, charHeight, backgroundColorOfSpriteSheet, 
            //textColor, letterSpacing, charMap, textShadowColor, textShadowXOffset, textShadowYOffset)
        let basic = new TextRenderer('charmap1.png', 7, 9, "#FFFFFF", "#000000", 1, standardCharMap);
        let gang = new TextRenderer('gangsmallFont.png', 8, 10, "#FFFFFF", "#000000", 1, standardCharMap);
        let retro = new TextRenderer('retrocomputer.png', 8, 10, "#FFFFFF", "#000000", 1, standardCharMap);
        let tiny = new TextRenderer('tinyPixls.png', 8, 8, "#FFFFFF", "#000000", 1, standardCharMap);
        let retroShadowBlue = new TextRenderer('retrocomputer.png', 8, 10, "#FFFFFF", "#d7d7ff", 1, standardCharMap, "#3c3f83", 1, 1);
        let retroShadowGray = new TextRenderer('retrocomputer.png', 8, 10, "#FFFFFF", "#d7d7ff", 1, standardCharMap, "#464e57", 1, 1);
        let tinyShadow = new TextRenderer('tinyPixls.png', 8, 8, "#FFFFFF", "#dc6060", 1, standardCharMap, "#3f1c1c", 1, 1);
        
    //----------------BUTTON CLASS GENERATORS----------------
        //generateButtonClass(buttonWidth, buttonHeight, fillColor, borderColor, hoverFillColor, hoverBorderColor, fontRenderer,
        //   topShadowColor, bottomShadowColor, topHoverShadowColor, bottomHoverShadowColor,
        //   textAlign ("center" "left" or "right"), margin (only for left or right align))
        const settingsMenuButton = generateTextButtonClass(128, 17, basic, ...Colors.secondaryMenuColorParams);
        const singleLetterButton = generateTextButtonClass(16, 16, basic, ...Colors.secondaryMenuColorParams);
        const smallLetterButton = generateTextButtonClass(10, 10, basic, ...Colors.secondaryMenuColorParams);
        const settingsTitleButton = generateTextButtonClass(128, 13, basic, ...Colors.secondaryMenuTitleColorParams);
        const friendTitle = generateTextButtonClass(128, 15, basic, ...Colors.secondaryMenuColorParams);
        const friendButton = generateTextButtonClass(128, 18, retroShadowBlue, ...Colors.secondaryMenuColorParams, "left", 2);
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



    //---------------GENERAL OBJECTS----------------
        //BUTTON TO RETURN TO MAIN ROOM
        const backToMain = new singleLetterButton('<', 0, 0, () => {
            get(game).setCurrentRoom('mainRoom');
        }, 10);
        const backToMain2 = new singleLetterButton('<', 0, 112, () => {
            get(game).setCurrentRoom('mainRoom');
        }, 10);
        //bgColor, innerBorderColor, outerBorderColor, innerRoundness, outerRoundness, innerBorderThickness = 3 , outerBorderThickness = 1
        let defaultMenuParams = ["#59585a", "#2b2a2b", "black", 2, 5, 3, 1];

    //----------------MAIN ROOM----------------
        //STATUS BAR INSTANTIATION
        const StatusBar = generateStatusBarClass(107, 12, 'black', 'grey', '#40D61A', 2);
        const statusBar = new StatusBar(20, 2, 0);
        //MAIN MENU INSTANTIATION
        const mainMenuButtonTexts = ['Settings', 'Shop', 'Customize', 'Paint', 'Friends', 'Inventory', 'Fishing', 'Close'];
        const mainMenuButtonFunctions = [() => {get(game).setCurrentRoom('settingsRoom')}, 
        () => {get(game).setCurrentRoom('shopRoom')}, 
        () => {get(game).setCurrentRoom('customizeRoom')}, 
        () => {get(game).setCurrentRoom('paintRoom')}, 
        () => {get(game).setCurrentRoom('friendRoom')}, 
        () => {get(game).setCurrentRoom('inventoryRoom')}, 
        () => {get(game).setCurrentRoom('fishingRoom')},
        () => {
            get(game).getCurrentRoom().removeObject( mainMenu );
            get(game).getCurrentRoom().addObject( mainMenuButton );}
        ]
        const mainMenu = new buttonList(mainMenuButtonTexts, mainMenuButtonFunctions, dropDownButton, 58, 12, -1, 0, 0, 3);
        //BUTTON TO OPEN MAIN MENU
        const mainMenuButton = new Button('mainMenuButton', 0, 0, () => {
            get(game).getCurrentRoom().removeObject(mainMenuButton);
            get(game).getCurrentRoom().addObject(mainMenu);
        }, 1);
        //PET INSTANTIATION
        let petObject = new Pet('pearguin', 36, 54, 0, "leaf");
        //ROOM INSTANTIATION
        let mainRoom = new Room('mainRoom', () => {
            petObject.setCoordinate(36, 54, 0);
        }, false, () => {
            petObject.nextFrame();
        });
        mainRoom.addObject(petObject, mainMenuButton, statusBar);
        
    //----------------SETTINGS ROOM----------------
        //SETTINGS MENU INSTANTIATION
        // TODO: const firstButtonThatChanges = [{text: "Git Login", function: () => {handleGitHubLogin()}}, {text: "Logged In!", function: () => {}}];

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
        const leftHatArrow = new singleLetterButton('<', 20, 100, () => {
            petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) - 1 < 0 ? hatArray.length - 1 : hatArray.indexOf(petObject.hat) - 1])
        }, 0);
        const rightHatArrow = new singleLetterButton('>', 60, 100, () => {
            petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) + 1 > hatArray.length - 1 ? 0 : hatArray.indexOf(petObject.hat) + 1])
        }, 0);
        let customizeUI = new Background('customizeUI', 9, 88, -10, () => {
            if(customizeUI.y < 22){
                customizeUI.startMovingTo(9, 88);
            }
            else{
                customizeUI.startMovingTo(9, 21);
            }
        });

        //ROOM INSTANTIATION
        let customizeRoom = new Room('customizeRoom', () => {
            customizeUI.addChild(leftHatArrow)
            customizeUI.addChild(rightHatArrow)
            customizeUI.addChild(petObject)

            petObject.setCoordinate(15, 11, 0);
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
        //BACKGROUND INSTANTIATION
        let postcardBackground = new Background('paintBackground', 0, 0, -20, () => {});

        //ROOM INSTANTIATION
        let paintRoom = new Room('paintRoom', 
            false, false, () => {
            postcardRendering.nextFrame();
            // postcardRendering.setUserText(get(inputValue));
        });

        //POSTCARD RENDERER INSTANTIATION
        let postcardRendering = new postcardRenderer(4, 24, 0, 120, 80, 120, 80, gang);

        // let postcardRendering.pixelCanvas = new PixelCanvas(4, 19, 0, 120, 80);
        //PAINT BUTTONS INSTANTIATION
            //TODO: MAKE INTO BUTTONLIST
        let paintButtonSprites = spriteReaderFromStore(15, 11, 'paintIcons_B&W.png');
        let paintBackToMain = new squarePaintTextButton('<', 0, 0, () => {
            get(game).setCurrentRoom('mainRoom');
            petObject.setCoordinate(36, 54, 0);
        }, 5);

        let colorMenuObj = new ColorMenu(6, 16, 12, 44, 44, 6, 2, 4, 4, 
        [
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
            Colors.black
        ],
         (color) => { 
            postcardRendering.setColor(color); 
            paintRoom.removeObject(colorMenuObj); 
            let newColorButtonIcon = generateColorButtonMatrix(9, 9, color);
            colorButton.setIcon(newColorButtonIcon, newColorButtonIcon);
        },
        '#8B9BB4', '#616C7E', "black", 2, 3, 3, 1);
        let defaultColorButtonIcon = generateColorButtonMatrix(9, 9, Colors.black)
        let colorButton = new paintButtonIcon(defaultColorButtonIcon, defaultColorButtonIcon, 10, 0, ()=>{
            if(paintRoom.objects.includes(colorMenuObj)){
                closeAllPaintMenus();
            }
            else{
                closeAllPaintMenus();
                paintRoom.addObject(colorMenuObj);
            }
        }, 5);
        let pencilButton = new paintButtonIcon(paintButtonSprites[0], paintButtonSprites[0], 28, 0, ()=>{
            postcardRendering.currentCanvas.setToPencilColor()
        }, 5);
        let eraserButton = new paintButtonIcon(paintButtonSprites[4], paintButtonSprites[4], 46, 0, ()=>{
            postcardRendering.currentCanvas.setEraser();
        }, 5);
        let bucketButton = new paintButtonIcon2(paintButtonSprites[6], paintButtonSprites[6], 64, 0, ()=>{
            postcardRendering.currentCanvas.toggleFill();
        }, 5);
        let clearButton = new paintButtonIcon(paintButtonSprites[5], paintButtonSprites[1], 110, 0, ()=>{
            postcardRendering.currentCanvas.clearCanvas();
        }, 5);

        let sizeNumber = new activeTextRenderer(retroShadowGray, 93, 2, 5);
        sizeNumber.setText((postcardRendering.currentCanvas.brushSize / 2).toString());
        let sizeBackground = new paintUnhoverableButton(' ', 88, 0, () => {}, 4);
        let brushSizeDown = new brushSizeButton('<', 81, 0, ()=>{
            postcardRendering.currentCanvas.decrementSize();
            sizeNumber.setText((postcardRendering.currentCanvas.brushSize / 2).toString());
        }, 5);
        let brushSizeUp = new brushSizeButton('>', 101, 0, ()=>{
            postcardRendering.currentCanvas.incrementSize();
            sizeNumber.setText((postcardRendering.currentCanvas.brushSize / 2).toString());
        }, 5);

        // FONT MENU INSTANTIATION
        let fontMenuButton = new paintButtonIcon2(paintButtonSprites[7], paintButtonSprites[7], 64, 0, ()=>{
            if(paintRoom.objects.includes(fontButtonList)) {
                closeAllPaintMenus();
            }
            else{
                closeAllPaintMenus();
                paintRoom.addObject(fontButtonList);
                paintRoom.addObject(fontMenu);
            }
        }, 5);
        let tinyButton = new fontButton('tiny', 60, 60, ()=>{
            postcardRendering.setTextRenderer(tiny);
            closeAllPaintMenus();
        }, 30, tiny, 2);
        let gangButton = new fontButton('gang', 75, 60, ()=>{
            postcardRendering.setTextRenderer(gang);
            closeAllPaintMenus();
        }, 30, gang, -1);
        let retroButton = new fontButton('retro', 100, 60, ()=>{
            postcardRendering.setTextRenderer(retro);
            closeAllPaintMenus();
        }, 30, retro);
        let basicButton = new fontButton('basic', 115, 60, ()=>{
            postcardRendering.setTextRenderer(basic);
            closeAllPaintMenus();
        }, 30, basic);
        let fontButtonArray = [tinyButton, gangButton, retroButton, basicButton];

        let fontButtonList = new objectGrid(1, 0, fontButtonArray.length, -1, 60, 22, 30, fontButtonArray);
        let fontMenu = new Menu(54, 16, 12, 47, fontButtonArray.length*12+9, '#8B9BB4', '#616C7E', "black", 2, 3, 3, 1);

        let undoButton = new Button('undoButton', 37, 111, () => {
            postcardRendering.currentCanvas.retrievePastCanvas();   
        }, 5);
        let redoButton = new Button('redoButton', 74, 111, () => {
            postcardRendering.currentCanvas.retrieveFutureCanvas();
        }, 5);

        let flipButton = new Button('flipButton', 55, 111, () => {
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
        }, 5);

        // STAMP MENU INSTANTIATION
        let stampMenu = new Background('box_canvas', 9, 17, 12, () => {});
        function createStampSlot() {
            let output = new ItemSlot("stampSlot", 0, 0, 0, () => {
                console.log("Item: ", output.slotItem);
                if(output.slotItem){
                    output.onStopHover();
                    stampGrid.displayToolTip = false;
                    postcardRendering.setStamp(output.slotItem);
                    closeAllPaintMenus();
                }
            });
            output.hoverWithChildren = true;
            output.passMouseCoords = true;
            // console.log("createItemSlot instance:", output); // Check the instance
            return output;
        }
        let testToolTip = new toolTip("black", "white", 3, 2, basic);
        let stampArray = get(game).inventory.getItemsByType('stamp');
        let stampGrid = new inventoryGrid(3, 3, 3, 3, 24, 24, 13, stampArray, 9, createStampSlot, testToolTip, null, 0, 20);
        // stampMenu.addChild(stampGrid);
        let stampButton = new invisibleStampButton(97, 29, 11, () => {
            closeAllPaintMenus();
            get(game).getCurrentRoom().addObject( stampMenu );
            get(game).getCurrentRoom().addObject( stampGrid );
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
               flipButton, bucketButton );

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

    //----------------SOCIAL ROOM----------------
       
    // should have a button back and two sections (friends and requests)
        
        function instantiateFriends(friends, friendButton) {

            let friendList = new buttonList(friends, friends.map(() => () => {}), friendButton, 128, 16, -1, 0, 15, 0, "vertical")
            return friendList;
        }

        //TEXT INPUT BAR INSTANTIATION
        const addFriendTextBar = new generateTextInputBar(112, 16, 'black', '#7997bc', 4, basic, 5, 1);
        let inputBar = new addFriendTextBar(0, 16, 0);
    
        function instantiateFriendRequests(friends, friendButton) {
            let friendArray = [];
            const buttonHeight = 17;
                
            for (let i = 0; i < friends.length; i++) {
                // Create the friend button
                let friend = new friendButton(friends[i], 0, 15 + 16 + (buttonHeight * i), () => {}, 0);
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

        

        // INSTEAD OF THIS GET FRIENDS WITH API CALL
        let placeholderFriends = ["everlastingflame", "kitgore", "chinapoet"];

        // let userFriends = 

        // INSTEAD OF THIS GET FRIEND REQUESTS WITH API CALL
        let placeholderFriendRequest = ["dude", "mama"];
       
        // TABS FOR SOCIAL ROOM
        const socialTabs = ['Friends', 'Add'];
        
        // room header constructor would have tabs array passed in
        // tabs array would have tab names and functions to switch rooms

        
        const socialTabList = new buttonList(socialTabs, [
            () => {get(game).setCurrentRoom('friendRoom')}, 
            () => {get(game).setCurrentRoom('requestRoom')}
        ], socialTabButton, 57, 15, -1, 15, 0, 5, "horizontal");
        
        //ROOM INSTANTIATION
        let friendRoom = new Room('friendRoom');
        let requestRoom = new Room('requestRoom');

        friendRoom.addObject(instantiateFriends(placeholderFriends, friendButton), backToMain, socialTabList);

        requestRoom.addObject(...instantiateFriendRequests(placeholderFriendRequest, friendButton), backToMain, socialTabList, inputBar);
        
    //----------------INVENTORY ROOM----------------
        //ITEM INSTANTIATION (PLACEHOLDER)
        // let testItem1 = new Item("coffee", 0, 0, 0);
        // let testItem2 = new Item("tomatoSoup", 0, 0, 0)
        // let testItem3 = new Item("fishingRod", 0, 0, 0)
        // let testItem4 = new Item("potion", 0, 0, 0)
        // let testItem5 = new Item("redHerring", 0, 0, 0)
        // let testItem6 = new Item("tropicalFish", 0, 0, 0)
        // let testItem7 = new Item("coffee", 0, 0, 0)
        // let testItem8 = new Item("tomatoSoup", 0, 0, 0)
        // let testItem9 = new Item("coffee", 0, 0, 0)
        // let testItem10 = new Item("potion", 0, 0, 0)
        // let testItem11 = new Item("tomatoSoup", 0, 0, 0)
        // let itemArray = [testItem1, testItem2, testItem3, testItem4, testItem5, testItem6, testItem7, testItem8, testItem9, testItem10, testItem11];
        // get(game).addStackableItem("tomatoSoup", 3);
        // get(game).addStackableItem("coffee", 5);
        // get(game).addStackableItem("potion", 2);

        // get(game).subtractStackableItem("freshwaterSnail", 5);
        // get(game).subtractStackableItem("starfish", 4);
        // get(game).subtractStackableItem("clownfish", 4);
        // get(game).subtractStackableItem("junonia", 2);
        // get(game).subtractStackableItem("highFinBandedShark", 3);
        // get(game).subtractStackableItem("guppy", 1);
        // get(game).subtractStackableItem("mossBall", 2);
        // get(game).subtractStackableItem("atlanticBass", 3);
        // get(game).subtractStackableItem("dab", 1);
        // get(game).subtractStackableItem("plasticBag", 2);
        // get(game).subtractStackableItem("blueGill", 1);

        // get(game).addStackableItem("javascriptStamp", 2);
        // get(game).addStackableItem("CSSStamp", 2);
        // get(game).addStackableItem("HTMLStamp", 2);
        // get(game).addStackableItem("CStamp", 2);
        // get(game).addStackableItem("C++Stamp", 2);
        // get(game).addStackableItem("C#Stamp", 2);
        // get(game).addStackableItem("pythonStamp", 2);

        let itemArray = get(game).inventory.getItemsArray();
        //ITEMSLOT FACTORY FUNCTION
        function createItemSlot() {
            let output = new Object("itemSlot", 0, 0, 0);
            output.hoverWithChildren = true;
            output.passMouseCoords = true;
            // console.log("createItemSlot instance:", output); // Check the instance
            return output;
        }
        //INVENTORY GRID INSTANTIATION
        let inventoryGridInstance = new inventoryGrid(3, 3, 5, 3, 7, 0, -1, itemArray, 15, createItemSlot, testToolTip, tinyShadow);
        //ROOM INSTANTIATION
        let inventoryRoom = new Room('inventoryRoom', () => {
            itemArray = get(game).inventory.getItemsArray();
            itemArray.forEach(item => console.log("itemArray item:", item.displayName));
            inventoryGridInstance.updateItemSlots(itemArray);
            // let newInventoryGridTest = new inventoryGrid(3, 3, 5, 3, 7, 0, -1, itemArray, 15, createItemSlot, testToolTip, tinyShadow);
            // inventoryRoom.updateObject(inventoryGridTest, newInventoryGridTest);
            // inventoryGridTest = newInventoryGridTest;
        });
        inventoryRoom.addObject(backToMain, inventoryGridInstance);

        // ---------------- FISHING ROOM ----------------
    
        // TODO: room, background, navigation
        let fishingInstance = new Fishing();
        let fishingNotifItem = new Item("guppy", 7, 6, 13);
        let fishingNotifText = new activeTextRenderer(retroShadowGray, 26, 9, 13);
        let testingButton = new fishingButton("FISH", 90, 60, castLineHandler, 5);
        
        function castLineHandler() {
            fishingInstance.castLine(get(game), 2000, 1000).then((fishItem) => {
                fishingNotif.startMovingTo(6, 3);
                fishingNotifText.setText(fishItem.getName());
                fishingNotif.updateChild(fishItem, fishingNotifItem);
                fishingNotifItem = fishItem;
                setTimeout(() => {
                    fishingNotif.startMovingTo(6, -29);
                    if(get(game).isActive){
                        castLineHandler();
                    }
                }, 4000);
            }).catch((error) => {
                console.log(error.message);
            });
        }


        let cancelButton = new fishingButton("XXX", 90, 80, () => {
            fishingInstance.cancelFishing();
        }, 5);
        let fishingRoom = new Room('fishingRoom',  
            () => {
                petObject.setCoordinate(29, 32, 0);
            },
            false,
            () => {
                petObject.nextFrame();
                fishingNotif.nextFrame();
            },
            ()=> {
                castLineHandler();
            }
        );
        let fishingBackground = new Background('fishingBackground', 0, 0, -20, () => {} );
        let fishingNotif = new Menu(6, -32, 12, 116, 28, '#8B9BB4', '#616C7E', "black", 2, 3, 3, 1);
        fishingNotif.addChild(fishingNotifItem);
        fishingNotif.addChild(fishingNotifText);
        fishingNotif.setPhysics(16, .2, 3.8);
        fishingRoom.addObject(backToMain2, fishingBackground, petObject, testingButton, fishingNotif, cancelButton);

    }

    export function roomMain(){
        get(game).getCurrentRoom().update();
    }
</script>
