<script context='module'>
    import { game, Room, shouldFocus, handleGitHubLogin, handleGitHubLogout, inputValue, textInput } from './Game.svelte';
    import { Pet, Button, Background, ConfigObject, toolTip, textButtonList, activeTextRenderer, ItemSlot, ObjectGrid, Menu, ButtonList, Notification, GeneratedObject, Container } from './Object.svelte';
    import PostOffice, { postcardRenderer, ColorMenu, postcardInboxManager } from './PostOffice.svelte';
    import { Item, InventoryGrid, inventoryDisplayManager, itemScaler, itemInfoDisplay, InventoryItem, recentItemDisplay, createItemSlot, createDraggableItemSlot } from './Inventory.svelte';
    import { TextRenderer } from './TextRenderer.svelte';
    import { generateTextButtonClass, generateIconButtonClass, generateStatusBarClass, generateTextInputBar, generateInvisibleButtonClass, generateFontTextButtonClass } from './ObjectGenerators.svelte';
    import { generateColorButtonMatrix, generateEmptyMatrix } from './MatrixFunctions.svelte';
    import { get } from 'svelte/store';
    import * as Colors from './colors.js';
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import { Fishing } from "./Fishing.svelte";
    import { MiningManager } from "./Mining.svelte";
    import lootTableConfig from './lootTableConfig.json';
    import { friendListManager, friendRequestManager, friendTab, sendTab } from './Social.svelte';
    import itemConfig from './itemConfig.json'
    import { BedroomEditor, BedroomManager } from './Bedroom.svelte';
    import { getObjectsAt } from './MouseEvents.svelte';
    
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
        let electro = new TextRenderer('electroFont.png', 9, 9, Colors.black, [Colors.white, "#555555", "#ff0000"], [Colors.offBlack, Colors.white, "#a2a2a2"], -1, standardCharMap);

        
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

    // GIVE ITEMS
    get(game).addStackableItem('HTMLStamp', 10);


    //---------------GENERAL OBJECTS----------------
        //BUTTON TO RETURN TO MAIN ROOM
        const backToMain = new singleLetterButton(0, 0, 20, '<', () => {
            get(game).setCurrentRoom('mainRoom');
        });
        const backToMain2 = new singleLetterButton(0, 112, 11, '<', () => {
            get(game).setCurrentRoom('mainRoom');
        });

        //bgColor, innerBorderColor, outerBorderColor, innerRoundness, outerRoundness, innerBorderThickness = 3 , outerBorderThickness = 1
        let defaultMenuParams = ["#59585a", "#2b2a2b", Colors.black, 2, 5, 3, 1];

    //----------------MAIN ROOM----------------

        // ROOM INSTANTIATION
        const mainRoom = new Room('mainRoom', 
            false, // onEnter
            false, // onExit
            () => { // updateLogic
                bedroomEditorInstance.nextFrame();
                bedroomHotbar.nextFrame();
                petObject.nextFrame();
        });

        // OVERLAY INSTANTIATION
        const mainMenuOverlay = new Background('greyBackground', 0, 0, 30, () => {} );
        mainMenuOverlay.opacity = 0.85;

        // PET INSTANTIATION
        const petObject = new Pet('pearguin', 40, 45, 31, get(game));
        petObject.setPhysics(25.0, 0, 16.0)

        // STATUS BAR INSTANTIATIONS
        const StatusBar = generateStatusBarClass(
            50,             // width
            7,              // height
            Colors.offBlack,       // borderColor
            Colors.grey,           // bgColor
            [
                { base: Colors.red, highlight: Colors.lightRed, shadow: Colors.darkRed },
                { base: Colors.orange, highlight: Colors.lightOrange, shadow: Colors.darkOrange },
                { base: Colors.green, highlight: Colors.lightGreen, shadow: Colors.darkGreen }
            ],
            1  // roundness
        );
        const hungerIcon = new Background('hungerIcon', 0, 0, 0);
        const hungerBar = new StatusBar(12, 1, 0);
        hungerBar.setPercentage(petObject.hunger / petObject.maxHunger);
        const healthBar = new StatusBar(12, 11, 0);
        const healthIcon = new Background('heartIcon', 1, 10, 0);
        const statusBarContainer = new Container(32, 19, 9, 1, 1, Colors.transparent, Colors.transparent, Colors.transparent, 0, 0, 0, 0);
        statusBarContainer.children = [hungerBar, healthBar, hungerIcon, healthIcon];

        const statusBarBackground = new Menu(24, 30, -7, 79, 33, '#8B9BB4', '#616C7E', Colors.transparent, 2, 3, 2, 1);
        statusBarBackground.opacity = .9;


        // MAIN MENU BUTTON INSTANTIATIONS
        const settingsButton = new Button(4, 4, 1, 'settingsIcon', () => {get(game).setCurrentRoom('settingsRoom')});
        const inventoryButton = new Button(86, 108, 1, 'inventoryIcon', () => {
            mainRoom.addObject(inventoryOverlay);
            mainRoom.removeObject(mainMenuOverlay, petObject);
            inventoryDisplayManagerInstance.setTab("food");
        });
        const worldButton = new Button(106, 108, 1, 'worldIcon', () => {get(game).setCurrentRoom('mapRoom')});
        const bedroomButton = new Button(3, 108, 1, 'enterBedroom', () => {
            get(game).getCurrentRoom().removeObject( mainMenuOverlay );
            get(game).getCurrentRoom().addObject( bedroomEditorInstance, bedroomHotbar );
            bedroomHotbar.setCoordinate(-1, 105);
            bedroomHotbar.locked = false; // prevents the hotbar from jittering on enter
            petObject.setCoordinate(40, 45, 9);
            petObject.startMovingTo(40, 63); // drop pet into room
            statusBarContainer.setCoordinate(32, 37, 9);
        });

        // RECENT ITEM DISPLAY
        const createPetFeedingSlot = () => createDraggableItemSlot({
            createBaseObject: () => {
                const obj = new ConfigObject("recentItemSlot", 0, 0, 0);
                obj.opacity = .8; // TODO: replace this for a gray sprite so its consistent everywhere
                return obj;
            },
            onDragStop: (x, y, dragItem) => {
                if (getObjectsAt(x, y, get(game)).some(item => item instanceof Pet)) {
                    // Pet feeding logic (needs to be further refined)
                    petObject.hunger += dragItem.config.hunger;
                    petObject.hunger = Math.min(petObject.hunger, petObject.maxHunger);
                    hungerBar.setPercentage(petObject.hunger / petObject.maxHunger);
                    get(game).subtractStackableItem(dragItem.itemName, 1);
                    recentItemDisplayMain.refreshRecentItems();
                    mainRoom.removeObject(statusBarContainer);
                    bedroomEditorInstance.removeChild(statusBarBackground);
                }
            },
            onDrag: (x, y, dragItem) => {
                if(getObjectsAt(x, y, get(game)).some(item => item instanceof Pet)){
                    mainRoom.addObject(statusBarContainer);
                    bedroomEditorInstance.addChild(statusBarBackground);
                }
                else{
                    mainRoom.removeObject(statusBarContainer);
                    bedroomEditorInstance.removeChild(statusBarBackground);
                }
            }
        });

        const recentItemsGrid = new InventoryGrid({
            columns: 3, 
            rows: 1,
            spacing: { x: 1, y: 0 },
            position: { x: 0, y: 0, z: 1 },
            items: [],
            slotFactory: createPetFeedingSlot,
            tooltip: null,
            numberTextRenderer: electro,
            slotClickAction: () => {},
            itemOffset: { x: 0, y: 0, z: 1 },
            emptyHover: true,
            numberXOffset: 5,
            numberYOffset: 12
        });

        const recentItemDisplayMain = new recentItemDisplay(23, 108, 1, get(game), recentItemsGrid, basic); // for main room
        const recentItemDisplayHotbar = new recentItemDisplay(24, 3, 1, get(game), recentItemsGrid, basic); // for bedroom


        //----------------BEDROOM OVERLAY----------------

        // HOTBAR INSTANTIATION
        const bedroomHotbar = new Container(-1, 105, 20, 130, 30, '#8B9BB4', '#616C7E', Colors.black, 2, 3, 1, 1);
        bedroomHotbar.hoverWithChildren = true;
        bedroomHotbar.locked = false;
        bedroomHotbar.setPhysics(14.0, 0, 6.0)
        bedroomHotbar.onHover = () => {
            bedroomHotbar.startMovingTo(-1, 105); //hotbar moves up
        }
        bedroomHotbar.onStopHover = () => {
            if(!bedroomHotbar.locked){
                bedroomHotbar.startMovingTo(-1, 123); //hotbar moves down
            }
        }

        // BEDROOM EDITOR INSTANTIATION
        let bedroomManagerInstance = new BedroomManager();
        const bedroomToMainButton = new Button(4, 3, 5, 'exitBedroom', () => {
            get(game).getCurrentRoom().addObject( mainMenuOverlay );
            get(game).getCurrentRoom().removeObject( bedroomEditorInstance, bedroomHotbar);
            petObject.setCoordinate(40, 63, 31);
            petObject.startMovingTo(40, 45); // lift pet into room
            bedroomHotbar.locked = true; // lock bedroom hotbar to handle hover issues on bedroom entrance
            statusBarContainer.setCoordinate(32, 19, 5);
        });
        const bedroomEditorInstance = new BedroomEditor(get(game), bedroomManagerInstance, bedroomHotbar, (hotbarArray) => {
            // This will run whenever the hotbar array changes
            bedroomHotbar.children = [
                bedroomToMainButton, 
                recentItemDisplayHotbar, 
                ...hotbarArray
            ];
        });

        // SET BEDROOM OVERLAY CHILDREN
        bedroomHotbar.children = [bedroomToMainButton, recentItemDisplayHotbar, ...bedroomEditorInstance.hotbarExport];
            //hotbarExport is a bindable array of hotbar buttons that are managed by the bedroomEditorInstance

        //----------------INVENTORY OVERLAY----------------

        const inventoryOverlay = new Background('greyBackground', 0, 0, 30, () => {} );
        inventoryOverlay.opacity = 0.85;

        const inventoryBackButton = new Button(2, 1, 20, 'friendBackButton', () => {
            get(game).getCurrentRoom().addObject( mainMenuOverlay, petObject );
            get(game).getCurrentRoom().removeObject( inventoryOverlay );
            petObject.setCoordinate(40, 45, 31);
            bedroomHotbar.locked = true;
        });
        
        // INVENTORY GRID INSTANTIATION
        const inventoryGridInstance = new InventoryGrid({
            columns: 5, rows: 3,
            spacing: { x: 2, y: 2 },
            position: { x: 15, y: 64, z: 1 },
            items: [],
            slotFactory: () => createItemSlot(() => new ConfigObject("smallItemSlot", 0, 0, 0)),
            tooltip: null,
            numberTextRenderer: electro,
            slotClickAction: (item) => {recentItemDisplayMain.pushRecentItem(item);},
            itemOffset: { x: 0, y: 0, z: 1 }
        });
        
        // INVENTORY TABS
        const fishSprites = spriteReaderFromStore(16, 16, 'fishSheet.png');
        const sushiTab = spriteReaderFromStore(16, 16, 'sushiTab.png');
        const gearTab = spriteReaderFromStore(16, 16, 'casting_rod.png');
        const potionTab = spriteReaderFromStore(16, 16, 'potionTab.png');
        
        const inventoryTabList = new ButtonList(24, 44, 2, "horizontal", 3, inventoryTabButton, null,
            [fishSprites[12], fishSprites[12], ()=>{
                inventoryDisplayManagerInstance.setTab("food");
            }],
            [sushiTab[0], sushiTab[0], ()=>{
                inventoryDisplayManagerInstance.setTab("mining");
            }],
            [gearTab[0], gearTab[0], ()=>{
                inventoryDisplayManagerInstance.setTab("mining");
            }],
            [potionTab[0], potionTab[0], ()=>{
                inventoryDisplayManagerInstance.setTab("mining");
            }]
        );
        
        // ARROW BUTTONS FOR INVENTORY GRID
        const prevPageButton = new Button(0, 85, 5, "prevPageButton", ()=> {
            inventoryDisplayManagerInstance.inventoryGrid.setPrevPage();
        });
        const nextPageButton = new Button(120, 85, 5, "nextPageButton", ()=> {
            inventoryDisplayManagerInstance.inventoryGrid.setNextPage();
        });

        // INVENTORY BACKGROUND
        const inventoryBackground = new Background('inventoryBrownSquare', 0, 0, 1, () => {} );
        
        // CURRENT ITEM DISPLAY
        const scaledItemInstance = new itemScaler(14, 8, 32, 2);
        const itemInfoDisplayInstance = new itemInfoDisplay(53, 11, 5, electro);

        // INVENTORY DISPLAY MANAGER
        const inventoryDisplayManagerInstance = new inventoryDisplayManager(0, 0, 2, get(game), inventoryGridInstance, inventoryTabList,
             scaledItemInstance, itemInfoDisplayInstance, prevPageButton, nextPageButton);

        // SET INVENTORY OVERLAY CHILDREN
        inventoryOverlay.children = [inventoryBackground, inventoryDisplayManagerInstance, inventoryBackButton];

        // SET MAIN OVERLAY CHILDREN
        mainMenuOverlay.children = [
            recentItemDisplayMain,
            statusBarContainer,
            settingsButton, inventoryButton, worldButton, bedroomButton,
        ];

        mainRoom.addObject(mainMenuOverlay, bedroomManagerInstance, petObject);

        
    //----------------SETTINGS ROOM----------------

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
            isLoggedIn ? () => {
                handleGitHubLogout(); 
                isLoggedIn = !isLoggedIn; 
                setSettingsMenu()
            }: () => {handleGitHubLogin(); 
                isLoggedIn = !isLoggedIn; 
                setSettingsMenu();
            },
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
        blackFadeIn.blur = 3.0;


        
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
        let buttonFunctions = [
            (username) => {postcardRendering.exportPostcard(username)}
        ]
        let sendFriendListInstance = new friendListManager(11, 6, 0, get(game), sendTab, buttonFunctions, basic);
        // let sendFriendListInstance = new friendListManager(0, 16, 0, get(game), friendButton, (username) => {
        //     postcardRendering.exportPostcard(username);
        //     get(game).setCurrentRoom('paintRoom');
        // });
        let sendPostcardRoom = new Room('sendPostcardRoom', 
            () => {
                // get(game).syncLocalToGlobalState();
                sendFriendListInstance.refreshFriends();
            },
            () =>{},
            () => { sendFriendListInstance.nextFrame(); }
        );
        sendPostcardRoom.clearTextOnExit = false;
        const friendsUI = new Background('friendsGUI', 0, 0, -20, () => {});

        const backToPaintRoom = new Button(2, 1, 20, 'friendBackButton', () => {
            get(game).setCurrentRoom('paintRoom');
        });

            
        sendPostcardRoom.addObject(friendsUI, sendFriendListInstance, backToPaintRoom);
        // ...instantiateFriendRequests(friendRequestUsernames, friendRequestUids, friendButton)

    //----------------SOCIAL ROOM----------------

       
    // should have a button back and two sections (friends and requests)

        //TEXT INPUT BAR INSTANTIATION        
        const addFriendTextBar = new generateTextInputBar(textInput, 112, 16, Colors.black, '#7997bc', 4, basic, 5, 1);
        let inputBar = new addFriendTextBar(0, 16, 0);
        let sendFriendRequestButton = new brushSizeButton(118, 16, 0, '>', () => {
            let inputUsername = inputBar.getUserText();
            tsvscode.postMessage({ type: 'sendFriendRequest', val: inputUsername });
        });



        let friendListManagerInstance = new friendListManager(11, 6, 0, get(game), friendTab, ()=>{}, basic);
        let friendRequestManagerInstance = new friendRequestManager(0, 60, 0, get(game), friendButton);
        
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
                // friendRequestManagerInstance.refreshRequests();
                get(game).retrieveInbox();
            },
        );
        let requestRoom = new Room('requestRoom');
        const friendBackButton = new Button(2, 1, 20, 'friendBackButton', () => {
            get(game).setCurrentRoom('mainRoom');
        });
        const addFriendButton = new Button(116, 3, 20, 'addFriendButton', () => {
            get(game).setCurrentRoom('requestRoom');
        });
        friendRoom.addObject(friendsUI, friendListManagerInstance, friendBackButton, addFriendButton);
        // ...instantiateFriendRequests(friendRequestUsernames, friendRequestUids, friendButton)
        requestRoom.addObject(friendRequestManagerInstance, friendBackButton, socialTabList, 
                              inputBar, sendFriendRequestButton);
        

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
            fishingInstance.castLine(get(game), 150, 100).then((fishItem) => {
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

    const mapButtonTexts = ['Mining', 'Fishing', "Mail", "Friends", "Paint"];
        const mapButtonFunctions = [
        () => {get(game).setCurrentRoom('caveEntranceRoom')}, 
        () => {get(game).setCurrentRoom('fishingRoom')},
        () => {get(game).setCurrentRoom('receivedPostcardsRoom')},
        () => {get(game).setCurrentRoom('friendRoom')},
        () => {get(game).setCurrentRoom('paintRoom')}
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

    // ---------------- BEDROOM (behind MAIN) ----------------



}

export function roomMain(){
    get(game).getCurrentRoom().update();
}
</script>