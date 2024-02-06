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

    export function handleClick(event, gameInstance) {
        const boundingBox = event.currentTarget.getBoundingClientRect();
        const padding = getPadding();
        const pixelSize = getPixelSize();
        
        // Adjust the mouse coordinates for the current pixelSize and screen padding
        const mouseX = event.clientX - boundingBox.left;
        const mouseY = event.clientY - boundingBox.top;
        const gridX = Math.floor((mouseX - padding) / pixelSize);
        const gridY = Math.floor(mouseY / pixelSize);

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
        const padding = getPadding();
        const pixelSize = getPixelSize();
        const mouseX = event.clientX - boundingBox.left;
        const mouseY = event.clientY - boundingBox.top;
        const xPixelCoord = Math.floor((mouseX - padding) / pixelSize);
        const yPixelCoord = Math.floor(mouseY / pixelSize);
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
        const padding = getPadding();
        const pixelSize = getPixelSize();
        
        // Adjust the mouse coordinates for the current pixelSize and screen padding
        const mouseX = event.clientX - boundingBox.left;
        const mouseY = event.clientY - boundingBox.top;
        const xPixelCoord = Math.floor((mouseX - padding) / pixelSize);
        const yPixelCoord = Math.floor(mouseY / pixelSize);

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

    function getObjectAt(x, y, gameInstance) {
        // Get all objects in the current room and sort them by z-axis (descending order)
        let objects = gameInstance.getObjectsOfCurrentRoom();
        objects.sort((a, b) => b.getZ() - a.getZ()); // Assuming getZ() returns the z-axis value

        // Iterate through sorted objects to find the topmost object at the coordinates
        for (let obj of objects) {
            if(obj.getChildren().length > 0){
                    for (let child of obj.getChildren()) {
                        if (x >= child.x && x <= child.x + child.spriteWidth && y >= child.y && y <= child.y + child.spriteHeight) {
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
</script>
