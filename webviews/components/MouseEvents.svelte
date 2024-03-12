<script context="module">
    import { Object, Button, NavigationButton, PixelCanvas } from './Object.svelte';

    let mouseExited = false;
    let lastHoveredObject = null;
    let lastHoveredChild = null;
    let isMouseDown = false;
    let activeDragObject = null;
    let hoveredObject = null;
    let lastCoordinates = { x: undefined, y: undefined };
    const GRIDWIDTH = 128;

    // Utility function for repetitive calculations
    function getEventDetails(event, gridWidth) {
        const boundingBox = event.currentTarget.getBoundingClientRect();
        const pixelSize = Math.min(boundingBox.width / gridWidth, boundingBox.height / gridWidth);
        const gridX = Math.ceil(event.clientX / pixelSize);
        const gridY = Math.ceil(event.clientY / pixelSize);
        return { gridX, gridY, pixelSize };
    }

    // maybe switch to a hashmap for faster object lookup
    // Abstracting object retrieval logic
    function getObjectAt(x, y, gameInstance, returnMultiple = false) {
        let objects = gameInstance.getObjectsOfCurrentRoom().sort((a, b) => b.getZ() - a.getZ());
        let foundObjects = [];

        //loop through all objects and check if the x and y coordinates are within the object's bounds
        objects.forEach(obj => {
            if (obj.getChildren().length > 0) {
                obj.getChildren().forEach(child => {
                    let childX = obj.x + child.x
                    let childY = obj.y + child.y;
                    if (x >= childX && x <= childX + child.spriteWidth && 
                        y >= childY && y <= childY + child.spriteHeight) {
                        if(obj.passMouseCoords){
                            obj.mouseX = x;
                            obj.mouseY = y;
                        }
                        if(child.passMouseCoords){
                            child.mouseX = x;
                            child.mouseY = y;
                        }   
                        if (obj.hoverWithChildren){
                            obj.hoveredChild = child;
                            foundObjects.push(child, obj);
                        } 
                        else{
                            foundObjects.push(child);
                        }
                    }
                });
            }
            if (x >= obj.x && x <= obj.x + obj.spriteWidth && 
               y >= obj.y && y <= obj.y + obj.spriteHeight) {
                foundObjects.push(obj);
            }
        });

        return returnMultiple ? foundObjects : foundObjects.slice(0, 1);
    }

    // Simplifying hover logic
    function updateHoverState({ xPixelCoord, yPixelCoord, event, gameInstance }) {
        let foundObjects = getObjectAt(xPixelCoord, yPixelCoord, gameInstance, true);
        let newHoveredObject = foundObjects.length > 0 ? foundObjects[0] : null;

        let childObjects = foundObjects.slice(1); // Assuming child objects are returned after the parent

        // Determine if the new hovered object is different from the last hovered object or if the child object has changed
        let newHoveredChild = childObjects.length > 0 ? childObjects[0] : null; // Simplification for handling one child
        let hoveredObjectChanged = newHoveredObject !== lastHoveredObject;
        let hoveredChildChanged = newHoveredChild !== lastHoveredChild;

        //Check if hovered object 
        if (hoveredObjectChanged || hoveredChildChanged) {
            if (lastHoveredObject) {
                lastHoveredObject.onStopHover?.();
                lastHoveredChild?.onStopHover?.(); // Ensure last hovered child's onStopHover is called
                lastHoveredObject.hoveredChild = null;
            }
            if (newHoveredObject) {
                newHoveredObject.onHover?.();
                newHoveredChild?.onHover?.(); // Call onHover for the new hovered child, if any
                newHoveredObject.hoveredChild = newHoveredChild;
            }

            event.currentTarget.style.cursor = newHoveredObject instanceof Button ? 'pointer' : 'default';
            lastHoveredObject = newHoveredObject;
            lastHoveredChild = newHoveredChild; // Update lastHoveredChild to reflect the new state
        }
        else {
            console.log("Hovered Object: ", newHoveredObject, "Hovered Child: ", newHoveredChild);
            newHoveredObject.whileHover();
            for(let i = 0; i < childObjects.length; i++){
                childObjects[i].whileHover();
            }
        }

        console.log(foundObjects);
        for(let i = 0; i < foundObjects.length; i++){
            // if(foundObjects[i].passMouseCoords){
            //     foundObjects[i].mouseX = xPixelCoord;
            //     foundObjects[i].mouseY = yPixelCoord;
            // }
            console.log(foundObjects[i].mouseX, foundObjects[i].mouseY);
        }
    }


    export function handleClick(event, gameInstance) {
        let { gridX, gridY } = getEventDetails(event, GRIDWIDTH);
        let clickedObject = getObjectAt(gridX, gridY, gameInstance)[0];
        
        if (clickedObject && isMouseDown && !activeDragObject) {
            activeDragObject = clickedObject;
            clickedObject.clickAction(gridX, gridY);
        }
    }

    export function handleMouseDown(event, gameInstance) {
        event.preventDefault();
        isMouseDown = true;
        let { gridX, gridY } = getEventDetails(event, GRIDWIDTH);
        lastCoordinates = { x: gridX, y: gridY };
        handleClick(event, gameInstance); // Initial click handling
    }

    export function handleMouseUp() {
        isMouseDown = false;
        lastCoordinates = { x: undefined, y: undefined };
        activeDragObject = null; // Reset drag object
    }

    export function handleMouseMove(event, gameInstance) {
        event.preventDefault();
        let { gridX, gridY } = getEventDetails(event, GRIDWIDTH);
        updateHoverState({ xPixelCoord: gridX, yPixelCoord: gridY, event, gameInstance });

        if (isMouseDown) {
            // Ensures hoveredObject is the one being dragged
            if (hoveredObject && hoveredObject === activeDragObject) {
                // Check if hoveredObject is an instance of PixelCanvas
                if (hoveredObject instanceof PixelCanvas) {
                    // For PixelCanvas, we use drawLine to handle dragging
                    // Adjust coordinates relative to PixelCanvas's offset
                    const adjustedX = gridX - hoveredObject.offsetX;
                    const adjustedY = gridY - hoveredObject.offsetY;
                    if (lastCoordinates.x !== undefined && lastCoordinates.y !== undefined) {
                        // Draw line from last coordinates to current, adjusted for PixelCanvas offset
                        hoveredObject.drawLine(lastCoordinates.x - hoveredObject.offsetX, lastCoordinates.y - hoveredObject.offsetY, adjustedX, adjustedY);
                    }
                } else {
                    // Handle other objects that are not PixelCanvas, if necessary
                }
                // Update lastCoordinates with the current grid coordinates
                lastCoordinates = { x: gridX, y: gridY };
            }
        }
    }

    export function handleMouseOut(event) {
        if (lastHoveredObject) {
            lastHoveredObject.onStopHover?.();
            lastHoveredObject.hoveredChild = null;
            event.currentTarget.style.cursor = 'default';
        }
        mouseExited = true;
    }

    export function focus(node, enabled) {
        if (enabled) node.focus();
        else node.blur();
        return { update(newEnabled) { if (newEnabled) node.focus(); else node.blur(); } };
    }

    export function handleScroll(event, gameInstance) {
        event.preventDefault();
        let { gridX, gridY } = getEventDetails(event, GRIDWIDTH);
        getObjectAt(gridX, gridY, gameInstance, true).forEach(obj => {
            if (obj?.scrollable) {
                if (event.deltaY < 0) obj.onScrollUp?.();
                else if (event.deltaY > 0) obj.onScrollDown?.();
            }
        });
    }
</script>
