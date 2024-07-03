<script context='module'>
    import { game, Room, shouldFocus, handleGitHubLogin, inputValue, textInput } from './Game.svelte';
    import { Pet, Button, Background, PixelCanvas, ConfigObject, toolTip, textButtonList, activeTextRenderer, ColorMenu, postcardRenderer, ItemSlot, ObjectGrid, Menu, ButtonList } from './Object.svelte';
    import { Item, inventoryGrid, inventoryDisplayManager, itemScaler, itemInfoDisplay } from './Inventory.svelte';
    import { TextRenderer } from './TextRenderer.svelte';
    import { generateTextButtonClass, generateIconButtonClass, generateStatusBarClass, generateTextInputBar, generateInvisibleButtonClass, generateFontTextButtonClass } from './ObjectGenerators.svelte';
    import { generateColorButtonMatrix } from './MatrixFunctions.svelte';
    import { get } from 'svelte/store';
    import * as Colors from './colors.js';
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import { Fishing } from "./Fishing.svelte";
    import { MiningManager } from "./Mining.svelte";
    import lootTableConfig from './lootTableConfig.json';
    
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
        const miningButton = generateTextButtonClass(30, 15, basic, ...Colors.secondaryMenuColorParams);
        const invisibleMiningButton = generateInvisibleButtonClass(34, 57);
        const inventoryTabButton = generateIconButtonClass(18, 18, 'transparent', 'transparent', 'transparent', 'transparent');
        const changePageButton = generateIconButtonClass(8, 16, 'transparent', 'transparent', 'transparent', 'transparent');





    //---------------GENERAL OBJECTS----------------
        //BUTTON TO RETURN TO MAIN ROOM
        const backToMain = new singleLetterButton(0, 0, 10, '<', () => {
            get(game).setCurrentRoom('mainRoom');
        });
        const backToMain2 = new singleLetterButton(0, 112, 10, '<', () => {
            get(game).setCurrentRoom('mainRoom');
        });
        //bgColor, innerBorderColor, outerBorderColor, innerRoundness, outerRoundness, innerBorderThickness = 3 , outerBorderThickness = 1
        let defaultMenuParams = ["#59585a", "#2b2a2b", "black", 2, 5, 3, 1];

    //----------------MAIN ROOM----------------
        //STATUS BAR INSTANTIATION
        const StatusBar = generateStatusBarClass(107, 12, 'black', 'grey', '#40D61A', 2);
        const statusBar = new StatusBar(20, 2, 0);
        //MAIN MENU INSTANTIATION
        const mainMenuButtonTexts = ['Settings', 'Shop', 'Customize', 'Paint', 'Friends', 'Inventory', 'Fishing', 'Mining', 'Close'];
        const mainMenuButtonFunctions = [() => {get(game).setCurrentRoom('settingsRoom')}, 
        () => {get(game).setCurrentRoom('shopRoom')}, 
        () => {get(game).setCurrentRoom('customizeRoom')}, 
        () => {get(game).setCurrentRoom('paintRoom')}, 
        () => {get(game).setCurrentRoom('friendRoom')}, 
        () => {get(game).setCurrentRoom('inventoryRoom')}, 
        () => {get(game).setCurrentRoom('fishingRoom')},
        () => {get(game).setCurrentRoom('caveEntranceRoom')},
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
        let petObject = new Pet('pearguin', 36, 54, 0, get(game));
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
        const settingsTitle = new settingsTitleButton(0, 0, 0, 'Settings', () => {});
        const settingsMenu = new textButtonList(settingsMenuButtonTexts, settingsMenuButtonFunctions, settingsMenuButton, 58, 12, -1, 0, 12, 0);
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
        const leftHatArrow = new singleLetterButton(20, 100, 0, '<', () => {
            petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) - 1 < 0 ? hatArray.length - 1 : hatArray.indexOf(petObject.hat) - 1])
        });
        const rightHatArrow = new singleLetterButton(60, 100, 0, '>', () => {
            petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) + 1 > hatArray.length - 1 ? 0 : hatArray.indexOf(petObject.hat) + 1])
        });
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
        //BACKGROUND INSTANTIATION
        let postcardBackground = new Background('paintBackground', 0, 0, -20, () => {});

        //ROOM INSTANTIATION
        let paintRoom = new Room('paintRoom', 
            false, false, () => {
            postcardRendering.nextFrame();
            // postcardRendering.setUserText(get(inputValue));
        });

        //POSTCARD RENDERER INSTANTIATION
        let postcardRendering = new postcardRenderer(4, 24, 0, 120, 80, 120, 80, gang, textInput);

        // let postcardRendering.pixelCanvas = new PixelCanvas(4, 19, 0, 120, 80);
        //PAINT BUTTONS INSTANTIATION
            //TODO: MAKE INTO BUTTONLIST
        let paintButtonSprites = spriteReaderFromStore(15, 11, 'paintIcons_B&W.png');
        let paintBackToMain = new squarePaintTextButton(0, 0, 5, '<', () => {
            get(game).setCurrentRoom('mainRoom');
            petObject.setCoordinate(36, 54, 0);
        });

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
        let bucketButton = new paintButtonIcon2(64, 0, 5, paintButtonSprites[6], paintButtonSprites[6], ()=>{
            postcardRendering.currentCanvas.toggleFill();
        });
        let clearButton = new paintButtonIcon(110, 0, 5, paintButtonSprites[5], paintButtonSprites[1], ()=>{
            postcardRendering.currentCanvas.clearCanvas();
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
        let fontMenu = new Menu(54, 16, 12, 47, fontButtonArray.length*12+9, '#8B9BB4', '#616C7E', "black", 2, 3, 3, 1);

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
        let stampMenu = new Background('box_canvas', 9, 17, 12, () => {});
        function createStampSlot() {
            let output = new ItemSlot("stampSlot", 0, 0, 0, () => {
                if(output.slotItem){
                    output.onStopHover();
                    stampGrid.displayToolTip = false;
                    postcardRendering.setStamp(output.slotItem);
                    closeAllPaintMenus();
                }
            });
            output.hoverWithChildren = true;
            output.passMouseCoords = true;
            return output;
        }


        let testToolTip = new toolTip("black", "white", 3, 2, basic);
        let stampArray = get(game).inventory.getItemsByType('stamp');
        let stampGrid = new inventoryGrid(3, 3, 3, 3, 24, 24, 13, stampArray, createStampSlot, testToolTip, null, 0, 0, 0, 10);
        // stampMenu.addChild(stampGrid);
        let stampButton = new invisibleStampButton(95, 27, 11, () => {
            closeAllPaintMenus();
            get(game).getCurrentRoom().addObject( stampMenu );
            get(game).getCurrentRoom().addObject( stampGrid );
            stampGrid.updateItemSlots(stampArray);
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

            let friendList = new textButtonList(friends, friends.map(() => () => {}), friendButton, 128, 16, -1, 0, 15, 0, "vertical")
            return friendList;
        }

        //TEXT INPUT BAR INSTANTIATION
        const addFriendTextBar = new generateTextInputBar(textInput, 112, 16, 'black', '#7997bc', 4, basic, 5, 1);
        let inputBar = new addFriendTextBar(0, 16, 0);
        let sendFriendRequestButton = new brushSizeButton(118, 16, 0, '>', () => {
            let inputUsername = inputBar.getUserText();
            tsvscode.postMessage({ type: 'sendFriendRequest', val: inputUsername });
        });
    
        function instantiateFriendRequests(friends, friendButton) {
            let friendArray = [];
            const buttonHeight = 17;
                
            for (let i = 0; i < friends.length; i++) {
                // Create the friend button
                let friend = new friendButton(0, 15 + 16 + (buttonHeight * i), 0, friends[i],  () => {});
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
                const checkButton = new Button(0, 30, 1, 'checkButton', () => {
                    console.log('Button was clicked!');
                });
                const rejectButton = new Button(0, 50, 1, 'rejectButton', () => {
                    console.log('Button was clicked!');
                });

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

        // INSTEAD OF THIS GET FRIEND REQUESTS WITH API CALL
        let inbox = get(game).retrieveInbox()["friendRequests"]
        let requests = Object.values(inbox);

        // // Extract the 'fromUser' attribute from each object
        let friendRequestUsernames = requests.map(item => item.fromUser);


        // TABS FOR SOCIAL ROOM
        const socialTabs = ['Friends', 'Add'];
        
        // room header constructor would have tabs array passed in
        // tabs array would have tab names and functions to switch rooms

        
        const socialTabList = new textButtonList(socialTabs, [
            () => {get(game).setCurrentRoom('friendRoom')}, 
            () => {get(game).setCurrentRoom('requestRoom')}
        ], socialTabButton, 57, 15, -1, 15, 0, 5, "horizontal");
        
        //ROOM INSTANTIATION
        let friendRoom = new Room('friendRoom');
        let requestRoom = new Room('requestRoom');

        friendRoom.addObject(instantiateFriends(placeholderFriends, friendButton), backToMain, socialTabList);

        requestRoom.addObject(...instantiateFriendRequests(friendRequestUsernames, friendButton), backToMain, socialTabList, 
                              inputBar, sendFriendRequestButton);
        
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
        // get(game).subtractStackableItem("tomatoSoup", 3);
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

        function addTestableItems() {
            for(let i = 2; i <= 16; i++) {
                get(game).addStackableItem(`test${i}`, 2);
            }
        }

        addTestableItems();
        
        
        let miningItems = get(game).inventory.getItemsByType('mining');
        let itemArray = get(game).inventory.getItemsByType('food');

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
        let inventoryGridInstance = new inventoryGrid(5, 2, 3, 2, 15, 21, -1, itemArray, createItemSlot, null, electro, 0, 2, 2, 10);
        
        let fishSprites = spriteReaderFromStore(16, 16, 'fish.png');
        let testingSprites = spriteReaderFromStore(16, 16, 'testSprites.png');
        
        let inventoryTabList = new ButtonList(26, 2, 5, "horizontal", 2, inventoryTabButton, 
            [fishSprites[1], fishSprites[1], ()=>{
                inventoryDisplayManagerInstance.setTab("food");
            }],
            [testingSprites[5], testingSprites[5], ()=>{
                inventoryDisplayManagerInstance.setTab("mining");
            }]
        );
        let itemInfoDisplayInstance = new itemInfoDisplay(53, 97, 5, tiny);
        let prevPageButton = new Button(0, 42, 5, "prevPageButton", ()=>{
            inventoryDisplayManagerInstance.setPrevPage();
        });

        let nextPageButton = new Button(120, 42, 5, "nextPageButton", ()=>{
            inventoryDisplayManagerInstance.setNextPage();
        });

        
        let inventoryBackground = new Background('inventoryBrownSquare', 0, 0, -20, () => {} );
        //ROOM INSTANTIATION
        let inventoryRoom = new Room('inventoryRoom', () => {
            inventoryGridInstance.updateItemSlots(itemArray);
        });
        
        let inventoryDisplayManagerInstance = new inventoryDisplayManager(0, 0, 0, get(game), inventoryGridInstance, inventoryTabList,
             scaledItemInstance, itemInfoDisplayInstance, prevPageButton, nextPageButton);
        inventoryRoom.addObject(backToMain, inventoryBackground, inventoryDisplayManagerInstance);

        // ---------------- FISHING ROOM ----------------
    
        // TODO: room, background, navigation
        let fishingInstance = new Fishing();
        let fishingNotifItem = new Item("guppy", 7, 6, 13);
        let fishingNotifText = new activeTextRenderer(retroShadowGray, 26, 9, 13);
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
                fishingNotif.startMovingTo(6, 3);
                fishingNotifText.setText(fishItem.getName());
                fishingNotif.updateChild(fishItem, fishingNotifItem);

                fishingNotifItem = fishItem;
                setTimeout(() => {
                    fishingNotif.startMovingTo(6, -29);
                    if(get(game).isActive && !fishingInstance.cancelFlag) {
                        castLineUntil();
                    }
                    fishingInstance.cancelFlag = false;
                }, 4000);
            }).catch((error) => {
                console.log(error.message);
            });
        }

        // FISHING ROOM

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
        let boatFront = new Background('boatFront', 35, 89, 1, () => {} );

        let fishingNotif = new Menu(6, -32, 12, 116, 28, '#8B9BB4', '#616C7E', "black", 2, 3, 3, 1);
        fishingNotif.addChild(fishingNotifItem);
        fishingNotif.addChild(fishingNotifText);
        fishingNotif.setPhysics(16, .2, 3.8);
        fishingRoom.addObject(backToMain2, fishingBackground, petObject, castLineButton, fishingNotif, boatFront);

        // CAVE ENTRANCE ROOM 
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

        let blockTypes = lootTableConfig["miningTiers"];
        let miningInstance = new MiningManager(64, 64, 5, 1, 8, 10, blockTypes);
        let miningNotifItem = new Item("test2", 7, 6, 13);
        let miningNotifText = new activeTextRenderer(retroShadowGray, 26, 9, 13);
        
        let beginMiningButton = new miningButton(90, 90, 5, "MINE", ()=>{
            if(get(game).isActive){
                // miningInstance.mineBlocks();
                console.log("active");
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
                console.log("ore=" + ore);
                miningNotif.startMovingTo(6, 3);
                miningNotifText.setText(ore.getName());
                miningNotif.updateChild(ore, miningNotifItem);
                miningInstance.x = 80;
                miningInstance.generateObjectGrid()
                miningInstance.startMovingTo(64, 64);
                
                miningNotifItem = ore;
                setTimeout(() => {
                    miningNotif.startMovingTo(6, -29);
                    if(get(game).isActive && !miningInstance.cancelFlag){
                        mineUntil();
                    }
                    miningInstance.cancelFlag = false;
                }, 4000);
            }).catch((error) => {
                console.log(error.message);
            });
        }
        
        
        let miningRoom = new Room('miningRoom',  
        () => {
            petObject.setCoordinate(23, 48, 0);
        },
        false,
        () => {
            petObject.nextFrame();
            miningNotif.nextFrame();
            miningInstance.nextFrame();
        },
        ()=> {
            miningHandler();
        },
        ()=> {
            get(game).getCurrentRoom().addObject( beginMiningButton );
            get(game).getCurrentRoom().removeObject( cancelMiningButton );
        }
    );
    
    let miningBackground = new Background('miningBackground', 0, 0, -20, () => {} );

    let miningNotif = new Menu(6, -32, 12, 116, 28, '#8B9BB4', '#616C7E', "black", 2, 3, 3, 1);
    miningNotif.addChild(miningNotifItem);
    miningNotif.addChild(miningNotifText);
    miningNotif.setPhysics(16, .2, 3.8);
    miningInstance.setPhysics(8, 5, 2);
    miningRoom.addObject(backToMain2, miningBackground, miningInstance, beginMiningButton, petObject, miningNotif);
}



    export function roomMain(){
        get(game).getCurrentRoom().update();
    }
</script>
