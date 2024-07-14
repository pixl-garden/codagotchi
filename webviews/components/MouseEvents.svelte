
<script context="module">
    import { DrawableCanvas } from './PostOffice.svelte';

    let mouseExited = false;
    let lastHoveredObject = null;
    let lastHoveredChild = null;
    let isMouseDown = false;
    let activeDragObject = null;
    let newHoveredObject = null;
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

    // Get the object with the highest z value at the given coordinates
    // If singular object is found returned as [object]
    // If object has a parent with hoverWithChildren property, returned as [object, parent]
        // This is to allow for hover effects on parent objects when their children are hovered
    // Click actions are performed on the first object of the returned array only
    function getObjectAt(x, y, gameInstance) {
        let objects = gameInstance.getObjectsOfCurrentRoom().sort((a, b) => b.getZ() - a.getZ());
        let highestFoundObject = null;
        let highestFoundObjectZ = -1000;
        let highestFoundObjectParent = null;

        const findObjectsRecursively = (obj, parent = null, parentX = 0, parentY = 0, parentZ = 0) => {
            let objX = parentX + obj.x;
            let objY = parentY + obj.y;
            let objZ = parentZ + obj.z + 1; // + 1 Could be removed but helps ensure that children are above parents
            obj.hoveredChild = null;

            // Check if the coordinates are within the object's bounds
            if (x >= objX && x <= objX + obj.spriteWidth && 
                y >= objY && y <= objY + obj.spriteHeight && obj.mouseInteractions) {
                if(objZ > highestFoundObjectZ){
                    highestFoundObject = obj;
                    highestFoundObjectZ = objZ;
                    if (parent && parent.hoverWithChildren) {
                        // If a parent has hoverWithChildren, add both the child and the parent to foundObjects
                        highestFoundObjectParent = parent;
                        parent.hoveredChild = obj;
                    }
                    else {
                        highestFoundObjectParent = null;
                    }
                }
            }
            // Recursively check children if they exist
            if (obj.getChildren().length > 0) {
                let children = obj.getChildren().sort((a, b) => b.getZ() - a.getZ());
                for (let child of children) {
                    // Recursively check each child
                    findObjectsRecursively(child, obj, objX, objY, objZ);
                }
            }
        };

        // Loop through all objects and initiate the recursive search
        for (let i = 0; i < objects.length; i++) {
            findObjectsRecursively(objects[i]);
        }
        // console.log("highestFoundObject: ", highestFoundObject);
        if (highestFoundObject?.passMouseCoords) {
            highestFoundObject.mouseX = x;
            highestFoundObject.mouseY = y;
        }
        if (highestFoundObjectParent?.passMouseCoords) {
            highestFoundObjectParent.mouseX = x;
            highestFoundObjectParent.mouseY = y;
        }
        if(highestFoundObjectParent){
            return [highestFoundObject, highestFoundObjectParent];
        }
        return [highestFoundObject];
    }

    // Simplifying hover logic
    function updateHoverState({ xPixelCoord, yPixelCoord, event, gameInstance }) {
        let foundObjects = getObjectAt(xPixelCoord, yPixelCoord, gameInstance);
        newHoveredObject = foundObjects.length > 0 ? foundObjects[0] : null;

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
                event.currentTarget.style.cursor = newHoveredObject.showPointer ? 'pointer' : 'default';
            }
            else {
                event.currentTarget.style.cursor = 'default';
            }

            // event.currentTarget.style.cursor = newHoveredObject instanceof Button ? 'pointer' : 'default';
            lastHoveredObject = newHoveredObject;
            lastHoveredChild = newHoveredChild; // Update lastHoveredChild to reflect the new state
        }
        else {
            newHoveredObject?.whileHover();
            for(let i = 0; i < childObjects.length; i++){
                childObjects[i].whileHover();
            }
        }
    }


    export function handleClick(event, gameInstance) {
        let { gridX, gridY } = getEventDetails(event, GRIDWIDTH);
        let clickedObject = getObjectAt(gridX, gridY, gameInstance)[0];
        // console.log("MOUSE CLICKED AT: ", gridX, gridY, "CLICKED OBJECT: ", clickedObject)
        
        if (clickedObject && isMouseDown && !activeDragObject) {
            activeDragObject = clickedObject;
            clickedObject.clickAction(gridX, gridY);
        }
        updateHoverState({ xPixelCoord: gridX, yPixelCoord: gridY, event, gameInstance });
    }

    export function handleMouseDown(event, gameInstance) {
        if (newHoveredObject instanceof DrawableCanvas) {
            newHoveredObject.saveCurrentCanvas();
        }
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
            if (newHoveredObject && newHoveredObject === activeDragObject) {
                // Check if hoveredObject is an instance of DrawableCanvas
                if (newHoveredObject instanceof DrawableCanvas) {
                    // For DrawableCanvas, we use drawLine to handle dragging
                    if (lastCoordinates.x !== undefined && lastCoordinates.y !== undefined) {
                        // Draw line from last coordinates to current
                        newHoveredObject.drawLine(lastCoordinates.x, lastCoordinates.y, gridX, gridY);
                    }
                } else {
                    // Handle other objects that are not DrawableCanvas, if necessary
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
            lastHoveredObject = null;
            event.currentTarget.style.cursor = 'default';
        }
        mouseExited = true;
    }

    export function focus(node, enabled) {
        if (enabled) node.focus();
        else node.blur();
        return { update(newEnabled) { if (newEnabled) node.focus(); else node.blur(); } };
    }

    function getScrollableObjectAt(x, y, gameInstance){
        let objects = gameInstance.getObjectsOfCurrentRoom().sort((a, b) => b.getZ() - a.getZ());
        let foundObjects = [];

        const findScrollableObjectsRecursively = (obj, parent = null) => {
            let objX = (parent ? parent.x : 0) + obj.x;
            let objY = (parent ? parent.y : 0) + obj.y;

            // Check if the coordinates are within the object's bounds
            if (x >= objX && x <= objX + obj.spriteWidth && 
                y >= objY && y <= objY + obj.spriteHeight) {
                // Add the object if it's directly hovered or if it's a hovered child with hoverWithChildren parent
                if (obj?.scrollable) {
                    foundObjects.push(obj);
                }
            }

            // Recursively check children if they exist
            if (obj.getChildren().length > 0) {
                obj.getChildren().forEach(child => findScrollableObjectsRecursively(child, obj));
            }
        };

        // Loop through all objects and initiate the recursive search
        objects.forEach(obj => findScrollableObjectsRecursively(obj));
        foundObjects = foundObjects.sort((a, b) => b.getZ() - a.getZ());
        return foundObjects.slice(0, 1);
    }

    export function handleScroll(event, gameInstance) {
        event.preventDefault();
        let { gridX, gridY } = getEventDetails(event, GRIDWIDTH);
        getScrollableObjectAt(gridX, gridY, gameInstance, true).forEach(obj => {
            if (event.deltaY < 0) obj.onScrollUp?.();
            else if (event.deltaY > 0) obj.onScrollDown?.();
        });
    }
</script>