<script context="module">
    import { ButtonList, GeneratedObject, Button } from "./Object.svelte";
    import { generateEmptyMatrix } from "./MatrixFunctions.svelte";

    export class friendRequestManager extends GeneratedObject {
        constructor(x, y, z, gameRef, buttonConstructor){
            super([generateEmptyMatrix(1, 1)], null, x, y, z)
            this.gameRef = gameRef;
            this.buttonConstructor = buttonConstructor;
            this.refreshRequests();
        }

        refreshRequests(inbox = this.gameRef.refreshInbox()["friendRequests"]){
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

    export class friendListManager extends GeneratedObject {
        constructor(x, y, z, gameRef, buttonConstructor, buttonFunction = () => {}){
            super([generateEmptyMatrix(1, 1)], null, x, y, z)
            this.gameRef = gameRef;
            this.buttonConstructor = buttonConstructor;
            this.buttonFunction = buttonFunction;
            this.refreshFriends();
        }

        refreshFriends(){
            const friends = this.gameRef.refreshInbox()["friends"];
            const friendUsernames = Object.values(friends).map(item => item.friendUsername);
            const friendUids = Object.values(friends).map(item => item.friendUid);
            // const friendButtonListParams = friendUsernames.map(username => [username, this.buttonFunction(username)]);
            const friendButtonListParams = friendUsernames.map(username => [username, () => this.buttonFunction(username)]);

            console.log(friendButtonListParams)
            let friendButtonList = new ButtonList(0, 0, 0, "vertical", -1, this.buttonConstructor, null, ...friendButtonListParams)
            
            // This loop can be removed I think????
            for (let friendButton of friendButtonList.children){
                friendButton.friendID = friendUids[friendButtonList.children.indexOf(friendButton)];
            }
            this.children = [friendButtonList];
        }
    }
</script>