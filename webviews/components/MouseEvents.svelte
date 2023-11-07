<script context="module">
    import { Object, Button, NavigationButton } from './Object.svelte';
    import { getPadding, getPixelSize } from "./ScreenManager.svelte";

    const GRIDWIDTH = 64;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let mouseExited = false;
    let lastHoveredObject = null;

    export function handleClick(event, gameInstance) {
        const boundingBox = event.currentTarget.getBoundingClientRect();
        const padding = getPadding();
        const pixelSize = getPixelSize();
        
        // Adjust the mouse coordinates for the current pixelSize and screen padding
        const mouseX = event.clientX - boundingBox.left;
        const mouseY = event.clientY - boundingBox.top;
        const gridX = Math.floor((mouseX - padding) / pixelSize);
        const gridY = Math.floor(mouseY / pixelSize);

        const clickedObject = getObjectAt(gridX, gridY, gameInstance);

        // Check for interactive objects
        if(clickedObject){
            clickedObject.clickAction();
        }
    }

    export function handleMouseMove(event, gameInstance) {
        const boundingBox = event.currentTarget.getBoundingClientRect();
        const padding = getPadding();
        const pixelSize = getPixelSize();
        
        // Adjust the mouse coordinates for the current pixelSize and screen padding
        const mouseX = event.clientX - boundingBox.left;
        const mouseY = event.clientY - boundingBox.top;
        const xPixelCoord = Math.floor((mouseX - padding) / pixelSize);
        const yPixelCoord = Math.floor(mouseY / pixelSize);

        const hoveredObject = getObjectAt(xPixelCoord, yPixelCoord, gameInstance);

        if (mouseExited && hoveredObject === lastHoveredObject) {
            // Handle the case when mouse re-enters over the same object
            if (hoveredObject.onHover) {
                hoveredObject.onHover();
            }
            mouseExited = false;  // Reset the flag
        }
        // Check if we've moved off an object
        else if (!hoveredObject && lastHoveredObject) {
            if (lastHoveredObject.onStopHover) {
                lastHoveredObject.onStopHover();
            }
            event.currentTarget.style.cursor = 'default'; // Reset cursor
            lastHoveredObject = null; // Reset the last hovered object
            return; // Exit early
        }
        // Only call onHover and onStopHover if the hovered object has changed
        if (hoveredObject !== lastHoveredObject) {
            // Call onStopHover on the last hovered object
            if (lastHoveredObject && lastHoveredObject.onStopHover) {
                lastHoveredObject.onStopHover();
            }

            // Update the cursor based on the new hoveredObject
            if (hoveredObject instanceof Button) {
                event.currentTarget.style.cursor = 'pointer';
            } else {
                event.currentTarget.style.cursor = 'default';
            }

            if (hoveredObject && hoveredObject.onHover) {
                hoveredObject.onHover();
            }

            lastHoveredObject = hoveredObject;
        }
    }

    export function handleMouseOut(event) {
        if (lastHoveredObject && lastHoveredObject.onStopHover) {
            lastHoveredObject.onStopHover();
            event.currentTarget.style.cursor = 'default';
        }
        mouseExited = true; // Set the flag to true
    }

    function getObjectAt(x, y, gameInstance) {
        // Iterate through objects in room
        for (let obj of gameInstance.getObjectsOfCurrentRoom()) {
            // Check if the coordinates are within an object's bounding box
            if (x >= obj.x && x <= obj.x + obj.spriteWidth && y >= obj.y && y <= obj.y + obj.spriteHeight) {
                return obj;
            }
        }
        return null; // No object found at the coordinates
    }
</script>
