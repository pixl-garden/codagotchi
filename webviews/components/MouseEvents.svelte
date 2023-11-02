<script context="module">
    import { game, Room } from './Game.svelte';
    import { Object, Button, NavigationButton } from './Object.svelte';
    
    let lastHoveredObject = null;

    export function handleClick(event) {
        const boundingBox = event.currentTarget.getBoundingClientRect();

        const mouseX = event.clientX - boundingBox.left;
        const mouseY = event.clientY - boundingBox.top;

        const gridX = Math.floor(mouseX / pixelSize);
        const gridY = Math.floor(mouseY / pixelSize);

        const clickedObject = getObjectAt(gridX, gridY);

        // TODO - add a general check system for interactive objects
        if (clickedObject instanceof Button) {
            clickedObject.clickAction();
        }
    }

    //handles mouse movement on screen (hovering)
    export function handleMouseMove(event) {
        const boundingBox = event.currentTarget.getBoundingClientRect();
        const mouseX = event.clientX - boundingBox.left;
        const mouseY = event.clientY - boundingBox.top;

        const xPixelCoord = Math.floor(mouseX / pixelSize);
        const yPixelCoord = Math.floor(mouseY / pixelSize);

        const hoveredObject = getObjectAt(xPixelCoord, yPixelCoord);

        // Only call onHover and onStopHover if the hovered object has changed
        if (hoveredObject !== lastHoveredObject) {
            // Call onStopHover on the last hovered object
            if (lastHoveredObject && lastHoveredObject.onStopHover) {
                lastHoveredObject.onStopHover();
            }

            if (hoveredObject) {
                // Change cursor to pointer if the hovered object is a button
                // TODO - add a general check system for interactive objects
                if (hoveredObject instanceof Button) {
                    event.currentTarget.style.cursor = 'pointer'; // Change cursor to pointer
                } else {
                    event.currentTarget.style.cursor = 'default'; // Reset cursor
                }

                // Call onHover on the hovered object
                if (hoveredObject.onHover) {
                    hoveredObject.onHover();
                }
            } else {
                event.currentTarget.style.cursor = 'default'; // Reset cursor if no object is hovered
            }

            lastHoveredObject = hoveredObject;
        }
    }

    function getObjectAt(x, y) {
        for (let obj of game.getObjectsOfCurrentRoom() ) {
            // Check if the coordinates are within an object's bounding box
            if (x >= obj.x && x <= obj.x + obj.config.spriteWidth &&
                y >= obj.y && y <= obj.y + obj.config.spriteHeight) {
                return obj;
            }
        }
        return null; // No object found at the coordinates
    }
</script>