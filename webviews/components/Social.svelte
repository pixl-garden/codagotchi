<script context="module">
    import { ButtonList, GeneratedObject, Button, Container, activeTextRenderer, ObjectGrid, ConfigObject } from "./Object.svelte";
    import { generateEmptyMatrix } from "./MatrixFunctions.svelte";

    export class friendRequestManager extends GeneratedObject {
        constructor(x, y, z, gameRef, buttonConstructor){
            super([generateEmptyMatrix(1, 1)], null, x, y, z)
            this.gameRef = gameRef;
            this.buttonConstructor = buttonConstructor;
            this.refreshRequests();
        }

        refreshRequests(inbox = this.gameRef.refreshInbox()["friendRequests"]) {
            console.log(inbox)
            const requests = Object.values(inbox);
            // Extract the 'fromUser' attribute from each object
            const friendRequestUsernames = requests.map(item => item.fromUser);
            // Extract the 'fromUId' attribute from each object
            const friendRequestUids = requests.map(item => item.fromUid);
            // Transform into button list parameters (arrays of [username, function])
            const requestButtonListParams = friendRequestUsernames.map(username => [username, () => {}]);
            let requestButtonList = new ButtonList(0, 0, 0, "vertical", -1, this.buttonConstructor, null, ...requestButtonListParams)
            for (let requestButton of requestButtonList.children){
                requestButton.hoverWithChildren = true;
                requestButton.text = friendRequestUsernames[requestButtonList.children.indexOf(requestButton)];
                requestButton.requestID = friendRequestUids[requestButtonList.children.indexOf(requestButton)];
                requestButton.onHover = () => {
                    requestButton.updateState('hovered');
                    // Show check and reject buttons on hover
                    requestButton.children = [checkButton, rejectButton];
                }
                requestButton.onStopHover = () => {
                    requestButton.updateState('default');
                    // Hide check and reject buttons on stop hover
                    requestButton.children = [];
                }
                const checkButton = new Button(40, 3, 1, 'checkButton', () => {
                    tsvscode.postMessage({ type: 'handleFriendRequest', requestId: requestButton.requestID, action: 'accept' });
                    this.gameRef.removeItemFromGlobalState("inbox", `friendRequests.${requestButton.requestID}`);
                    this.gameRef.updateGlobalState({inbox: {friends: {[requestButton.requestID]: {friendUsername: requestButton.text, friendUid: requestButton.requestID}}}})
                    const newFriendRequestUids = requests.filter(item => item.fromUid !== requestButton.requestID);
                    this.refreshRequests(newFriendRequestUids);
                });
                const rejectButton = new Button(68, 3, 1, 'rejectButton', () => {
                    tsvscode.postMessage({ type: 'handleFriendRequest', requestId: requestButton.requestID, action: 'reject' });
                    this.gameRef.removeItemFromGlobalState("inbox", `friendRequests.${requestButton.requestID}`);
                    const newFriendRequestUids = requests.filter(item => item.fromUid !== requestButton.requestID);
                    this.refreshRequests(newFriendRequestUids);
                });
            }
            this.children = [requestButtonList];
        }
    }

    export class friendTab extends Container {
        constructor(x, y, z, gameRef, textRenderer, friendUsername, friendUID, buttonFunctionArray, heartValue = 0) {
            super(x, y, z, 108, 21, 'transparent', 'transparent', 'transparent', 0, 0, 0, 0);
            this.gameRef = gameRef;
            this.textRenderer = textRenderer;
            this.friendUsername = friendUsername;
            this.friendUID = friendUID;
            this.activeTextRenderer = new activeTextRenderer(this.textRenderer, 2, 2, 1, () => {});
            this.activeTextRenderer.setText(this.friendUsername);
            this.heartBar = new heartBar(2, 11, 1, 8, 5);
            this.heartBar.setValue(heartValue);
            this.friendProfileBtn = new Button(80, 12, 1, "friendProfileButton", buttonFunctionArray[0] ? buttonFunctionArray[0] : () => {});
            this.friendHomeBtn = new Button(88, 12, 1, "friendHomeButton", buttonFunctionArray[1] ? buttonFunctionArray[1] : () => {});
            this.friendMailBtn = new Button(97, 12, 1, "friendMailButton", buttonFunctionArray[2] ? buttonFunctionArray[2] : () => {});

            this.children = [this.activeTextRenderer, this.heartBar, this.friendProfileBtn, this.friendHomeBtn, this.friendMailBtn];
        }
    }

    export class sendTab extends Container {
        constructor(x, y, z, gameRef, textRenderer, friendUsername, friendUID, buttonFunctionArray, heartValue = 0) {
            super(x, y, z, 108, 21, 'transparent', 'transparent', 'transparent', 0, 0, 0, 0);
            this.gameRef = gameRef;
            this.textRenderer = textRenderer;
            this.friendUsername = friendUsername;
            this.friendUID = friendUID;
            this.activeTextRenderer = new activeTextRenderer(this.textRenderer, 2, 2, 1, () => {});
            this.activeTextRenderer.setText(this.friendUsername);
            this.heartBar = new heartBar(2, 11, 1, 8, 5);
            this.heartBar.setValue(heartValue);
            this.sentPostcardBtn = new Button(87, 12, 1, "sendPostcardButton", () => buttonFunctionArray[0](this.friendUsername) ? buttonFunctionArray[0] : () => {});
            this.children = [this.activeTextRenderer, this.heartBar, this.sentPostcardBtn];
        }
        nextFrame(){
            this.sentPostcardBtn.nextFrame();
        }
    }

    class heartBar extends GeneratedObject {
        constructor(x, y, z, xSpacing, heartCount) {
            super([generateEmptyMatrix(1, 1)], null, x, y, z);
            this.heartCount = heartCount;
            this.xSpacing = xSpacing;
            this.children = [];
            this.setValue(5);
        }
        
        setValue(value){
            const valueRounded = Math.min(Math.floor(value), this.heartCount*2);
            let heartX = 0;
            for (let i = 1; i <= this.heartCount; i++) {
                const heartObj = new ConfigObject("friendHeart", heartX, 0, this.z);
                console.log("HEART STATES", heartObj.states);
                if(i * 2 <= valueRounded){
                    heartObj.updateState('full');
                } else if( i*2 - 1 == value ) {
                    heartObj.updateState('half');
                } else {
                    heartObj.updateState('default');
                }
                this.children.push(heartObj);
                heartX += this.xSpacing;
            }
        }
    }

    export class friendListManager extends GeneratedObject {
        constructor(x, y, z, gameRef, tabConstructor, buttonFunctionArray, textRenderer){
            super([generateEmptyMatrix(1, 1)], null, x, y, z)
            this.gameRef = gameRef;
            this.tabConstructor = tabConstructor;
            this.buttonFunctionArray = buttonFunctionArray;
            this.textRenderer = textRenderer;
            this.refreshFriends();
            console.log("FRIEND LIST THIS: ", this)
        }

        refreshFriends(){
            const friends = this.gameRef.refreshInbox()["friends"];
            const friendUsernames = Object.values(friends).map(item => item.friendUsername);
            const friendUids = Object.values(friends).map(item => item.friendUid);
            console.log("friendUsernames: ", friendUsernames);
            let friendTabs = [];
            for (let i = 0; i < friendUsernames.length; i++){
                friendTabs.push(new this.tabConstructor(0, 0, 0, this.gameRef, this.textRenderer, friendUsernames[i], friendUids[i], this.buttonFunctionArray, 5));
            }
            let friendTabList = new ObjectGrid(1, 0, 5, 2, 0, 0, 0, friendTabs, true);
            console.log("friendTabList: ", friendTabList)
            this.children = [friendTabList];
        }

        nextFrame(){
            let friendTabs = this.children[0].children;
            for(let child of friendTabs){
                child.nextFrame();
            }
        }
    }
</script>