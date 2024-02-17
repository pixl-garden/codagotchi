<script context="module">
    import { Object, Button, NavigationButton, PixelCanvas } from './Object.svelte';
    import { getPadding, getPixelSize } from "./ScreenManager.svelte";

    let mouseExited = false;
    let lastHoveredObject = null;
    let lastSecondaryHoveredObject = null;
    let isMouseDown = false;
    let activeDragObject = null;
    let hoveredObject = null;
    let lastX, lastY;
    let GRIDWIDTH = 128;

    export function handleClick(event, gameInstance) {
        const boundingBox = event.currentTarget.getBoundingClientRect();
        const width = boundingBox.width;
        const height = boundingBox.height;
        const pixelSize = Math.min(width / GRIDWIDTH, height / GRIDWIDTH);
        
        // Adjust the mouse coordinates for the current pixelSize and screen padding
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        const gridX = Math.ceil(mouseX / pixelSize);
        const gridY = Math.ceil(mouseY / pixelSize);

        const clickedObject = getObjectAt(gridX, gridY, gameInstance)[0];

        if (clickedObject && isMouseDown) {
            // Set activeDragObject only if it's a new drag action
            if (!activeDragObject) {
                activeDragObject = clickedObject;
            }
            clickedObject.clickAction(gridX, gridY);
        }
    }

    export function handleMouseDown(event, gameInstance) {
        event.preventDefault();
        isMouseDown = true;
        const boundingBox = event.currentTarget.getBoundingClientRect();
        const width = boundingBox.width;
        const height = boundingBox.height;
        const pixelSize = Math.min(width / GRIDWIDTH, height / GRIDWIDTH);
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        const xPixelCoord = Math.ceil(mouseX / pixelSize);
        const yPixelCoord = Math.ceil(mouseY / pixelSize);
        lastX = xPixelCoord;
        lastY = yPixelCoord;
        handleClick(event, gameInstance); // Handle the initial click
    }

    export function handleMouseUp(event) {
        isMouseDown = false;
        lastX = lastY = undefined;
        activeDragObject = null; // Reset the active drag object
    }

    export function handleMouseMove(event, gameInstance) {
        event.preventDefault();
        const boundingBox = event.currentTarget.getBoundingClientRect();
        const width = boundingBox.width;
        const height = boundingBox.height;
        const pixelSize = Math.min(width / GRIDWIDTH, height / GRIDWIDTH);
        
        // Adjust the mouse coordinates for the current pixelSize and screen padding
        const mouseX = event.clientX
        const mouseY = event.clientY
        const xPixelCoord = Math.ceil(mouseX / pixelSize);
        const yPixelCoord = Math.ceil(mouseY / pixelSize);

        hoveredObject = getObjectAt(xPixelCoord, yPixelCoord, gameInstance)[0];
        //TODO support multiple secondary hovers
        let secondaryObject = getObjectAt(xPixelCoord, yPixelCoord, gameInstance).length > 1 ?
            getObjectAt(xPixelCoord, yPixelCoord, gameInstance).slice(1) : null;

        if (mouseExited && hoveredObject === lastHoveredObject && hoveredObject) {
            // Handle the case when mouse re-enters over the same object
            hoveredObject.onHover();
            hoverSecondaryObject(secondaryObject);
            mouseExited = false;  // Reset the flag
        }
        // Check if we've moved off an object
        else if (!hoveredObject && lastHoveredObject) {
            lastHoveredObject.onStopHover();
            stopHoverSecondaryObject(lastSecondaryHoveredObject);
            event.currentTarget.style.cursor = 'default'; // Reset cursor
            lastHoveredObject = null; // Reset the last hovered object
            return; // Exit early
        }
        else if (hoveredObject == lastHoveredObject && hoveredObject && (lastX != xPixelCoord || lastY != yPixelCoord)) {
            hoveredObject.whileHover();
            //handle drag clicking
            if (isMouseDown && hoveredObject === activeDragObject) {
                if(typeof hoveredObject === PixelCanvas){
                    hoveredObject.clickAction(xPixelCoord, yPixelCoord);
                }
                else{
                    const currentX = xPixelCoord;
                    const currentY = yPixelCoord;

                    if (typeof lastX === 'number') {
                        hoveredObject.drawLine(lastX, lastY, currentX, currentY);
                    }

                    lastX = currentX;
                    lastY = currentY;
                }
            }
        }
        // else if (hoveredObject !== lastHoveredObject && lastHoveredObject && lastHoveredObject.onStopHover) {
        //     lastHoveredObject.onStopHover();
        //     event.currentTarget.style.cursor = 'default'; // Reset cursor
        // }
        // Only call onHover and onStopHover if the hovered object has changed
        if (hoveredObject !== lastHoveredObject) {
            // Call onStopHover on the last hovered object
            if (lastHoveredObject) {
                lastHoveredObject.onStopHover();
                stopHoverSecondaryObject(lastSecondaryHoveredObject);
            }

            // Update the cursor based on the new hoveredObject
            if (hoveredObject instanceof Button) {
                event.currentTarget.style.cursor = 'pointer';
            } else {
                event.currentTarget.style.cursor = 'default';
            }

            if (hoveredObject && hoveredObject.onHover) {
                hoveredObject.onHover();
                hoverSecondaryObject(secondaryObject);
            }

            lastHoveredObject = hoveredObject;
            lastSecondaryHoveredObject = secondaryObject;
        }
    }

    function hoverSecondaryObject(secondaryObject){
        if(secondaryObject){
            for (let obj of secondaryObject) {
                if(obj.onHover){
                    obj.onHover();
                }
            }
        }
    }
    function stopHoverSecondaryObject(secondaryObject){
        if(secondaryObject){
            for (let obj of secondaryObject) {
                if(obj.onStopHover){
                    obj.onStopHover();
                }
            }
        }
    }

    export function handleMouseOut(event) {
        if (lastHoveredObject && lastHoveredObject.onStopHover || lastSecondaryHoveredObject && lastSecondaryHoveredObject.onStopHover) {
            lastHoveredObject.onStopHover();
            stopHoverSecondaryObject(lastSecondaryHoveredObject);
            event.currentTarget.style.cursor = 'default';
        }
        mouseExited = true; // Set the flag to true
    }

    export function focus(node, enabled) {
        if (enabled) {
            node.focus();
        } else {
            node.blur();
        }
        return {
            update(newEnabled) {
                if (newEnabled) {
                    node.focus();
                } else {
                    node.blur();
                }
            }
        };
    }

    export function handleScroll(event, gameInstance){
        event.preventDefault();
        const boundingBox = event.currentTarget.getBoundingClientRect();
        const width = boundingBox.width;
        const height = boundingBox.height;
        const pixelSize = Math.min(width / GRIDWIDTH, height / GRIDWIDTH);
        const scrollAmount = event.deltaY;
        const mouseX = event.clientX
        const mouseY = event.clientY
        const xPixelCoord = Math.ceil(mouseX / pixelSize);
        const yPixelCoord = Math.ceil(mouseY / pixelSize);

        let hoveredObjects = getObjectsAt(xPixelCoord, yPixelCoord, gameInstance);
        // console.log("SCROLLING, hoveredObjects: ", hoveredObjects);
        hoveredObjects.forEach(obj => {
            if(obj != null && obj.scrollable){
                console.log("SCROLLING, obj: ", obj)
                if (scrollAmount < 0) {
                    // User scrolled up
                    obj.onScrollUp();
                } else if (scrollAmount > 0) {
                    // User scrolled down
                    obj.onScrollDown();
                }
            }
        });
        
    }

    function getObjectAt(x, y, gameInstance) {
        // Get all objects in the current room and sort them by z-axis (descending order)
        let objects = gameInstance.getObjectsOfCurrentRoom();
        objects.sort((a, b) => b.getZ() - a.getZ()); // Assuming getZ() returns the z-axis value

        // Iterate through sorted objects to find the topmost object at the coordinates
        for (let obj of objects) {
            if(obj.getChildren().length > 0){
                    for (let child of obj.getChildren()) {
                        let childX = obj.x + child.x;
                        let childY = obj.y + child.y;
                        
                        if (x >= childX && x <= childX + child.spriteWidth && y >= childY && y <= childY + child.spriteHeight) {
                            if(obj.hoverWithChildren){
                                return [child, obj];
                            }
                            else{
                                return [child];
                            }
                        }
                    }
                }
            // Check if the coordinates are within an object's bounding box
            if (x >= obj.x && x <= obj.x + obj.spriteWidth && y >= obj.y && y <= obj.y + obj.spriteHeight) {
                return [obj];
            }
        }
        return [null]; // No object found at the coordinates
    }

    function getObjectsAt(x, y, gameInstance) {
        // Get all objects in the current room and sort them by z-axis (descending order)
        let objects = gameInstance.getObjectsOfCurrentRoom();
        console.log("objects: ", objects)
        objects.sort((a, b) => b.getZ() - a.getZ()); // Assuming getZ() returns the z-axis value
        let output = [];

        // Iterate through sorted objects to find the topmost object at the coordinates
        for (let obj of objects) {
            if(obj.getChildren().length > 0){
                    for (let child of obj.getChildren()) {
                        let childX = obj.x + child.x;
                        let childY = obj.y + child.y;
                        
                        if (x >= childX && x <= childX + child.spriteWidth && y >= childY && y <= childY + child.spriteHeight) {
                            if(obj.hoverWithChildren){
                                output.push(...[child, obj]);
                            }
                            else{
                                output.push(child);
                            }
                        }
                    }
                }
            // Check if the coordinates are within an object's bounding box
            if (x >= obj.x && x <= obj.x + obj.spriteWidth && y >= obj.y && y <= obj.y + obj.spriteHeight) {
                output.push(obj);
            }
        }
        if (output.length > 0) {
            return output;
        }
        else {
            return [null]; // No object found at the coordinates
        }
    }
</script>
