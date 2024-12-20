
<script context="module">
    // Import necessary components and set up global variables
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
    // Returns an array where:
    // - First element is the directly hovered object
    // - Subsequent elements are parent objects with hoverWithChildren=true
    // Parents are included in the chain if they have hoverWithChildren=true
    export function getObjectAt(x, y, gameInstance) {
        let objects = gameInstance.getObjectsOfCurrentRoom().sort((a, b) => b.getZ() - a.getZ());
        let highestFoundObject = null;
        let highestFoundObjectZ = -1000;
        let hoveredParents = [];

        const findObjectsRecursively = (obj, parentChain = [], parentX = 0, parentY = 0, parentZ = 0) => {
            let objX = parentX + obj.x;
            let objY = parentY + obj.y;
            let objZ = parentZ + obj.z + 1; // +1 ensures children are above parents
            obj.hoveredChild = null;

            // Check if coordinates are within object bounds
            if (x >= objX && x <= objX + obj.spriteWidth && 
                y >= objY && y <= objY + obj.spriteHeight && obj.mouseInteractions) {
                
                if (objZ > highestFoundObjectZ) {
                    highestFoundObject = obj;
                    highestFoundObjectZ = objZ;
                    
                    // Reset and recalculate hoveredParents for the new highest object
                    hoveredParents = [];
                    let currentZ = objZ;
                    // Check each parent in the chain for hoverWithChildren
                    for (let parent of parentChain) {
                        if (parent.hoverWithChildren) {
                            parent.hoveredChild = parent.hoveredChild || obj;
                            hoveredParents.push({
                                parent: parent,
                                z: currentZ + parent.z
                            });
                        }
                        currentZ += parent.z;
                    }
                }
            }

            // Recursively check children if they exist
            if (obj.getChildren().length > 0) {
                let children = obj.getChildren().sort((a, b) => b.getZ() - a.getZ());
                for (let child of children) {
                    findObjectsRecursively(
                        child, 
                        [...parentChain, obj], // Pass current object chain to children
                        objX, 
                        objY, 
                        objZ
                    );
                }
            }
        };

        // Start recursive search from top-level objects
        for (let obj of objects) {
            findObjectsRecursively(obj);
        }

        // Update mouse coordinates for objects that need them
        if (highestFoundObject?.passMouseCoords) {
            highestFoundObject.mouseX = x;
            highestFoundObject.mouseY = y;
        }
        
        hoveredParents.forEach(({parent}) => {
            if (parent.passMouseCoords) {
                parent.mouseX = x;
                parent.mouseY = y;
            }
        });

        return [highestFoundObject, ...hoveredParents.map(p => p.parent)].filter(Boolean);
    }

    // Handle hover state updates for objects and their parents
    function updateHoverState({ xPixelCoord, yPixelCoord, event, gameInstance }) {
        let hoveredObjects = getObjectAt(xPixelCoord, yPixelCoord, gameInstance);
        let primaryHoveredObject = hoveredObjects[0];  // Direct hovered object
        let parentObjects = hoveredObjects.slice(1);   // Parent objects with hoverWithChildren

        // Update global newHoveredObject for drag functionality
        newHoveredObject = primaryHoveredObject;

        // Check if hover state has changed from last update
        let hoveredStateChanged = 
            primaryHoveredObject !== lastHoveredObject || 
            !arrayEquals(parentObjects, lastHoveredChild ? [lastHoveredChild] : []);

        if (hoveredStateChanged) {
            // Clear previous hover states
            if (lastHoveredObject) {
                lastHoveredObject.onStopHover?.();
                if (lastHoveredChild) {
                    lastHoveredChild.onStopHover?.();
                    lastHoveredChild.hoveredChild = null;
                }
            }

            // Set new hover states
            if (primaryHoveredObject) {
                primaryHoveredObject.onHover?.();
                parentObjects.forEach(parent => {
                    parent.onHover?.();
                });
                event.currentTarget.style.cursor = primaryHoveredObject.showPointer ? 'pointer' : 'default';
            } else {
                event.currentTarget.style.cursor = 'default';
            }

            // Update last hovered states
            lastHoveredObject = primaryHoveredObject;
            lastHoveredChild = parentObjects[0] || null;
        } else {
            // Handle continuous hover
            primaryHoveredObject?.whileHover();
            parentObjects.forEach(parent => parent.whileHover?.());
        }
    }

    // Utility function to compare arrays for equality
    function arrayEquals(a, b) {
        return Array.isArray(a) &&
            Array.isArray(b) &&
            a.length === b.length &&
            a.every((val, index) => val === b[index]);
    }

    // Handle mouse click events
    export function handleClick(event, gameInstance) {
        let { gridX, gridY } = getEventDetails(event, GRIDWIDTH);
        let hoveredObjects = getObjectAt(gridX, gridY, gameInstance);
        let clickedObject = hoveredObjects[0];  // Only primary object can be clicked
        
        if (clickedObject && isMouseDown && !activeDragObject) {
            activeDragObject = clickedObject;
            clickedObject.clickAction(gridX, gridY);
        }
        updateHoverState({ xPixelCoord: gridX, yPixelCoord: gridY, event, gameInstance });
    }

    // Handle mouse down events
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

    // Handle mouse up events
    export function handleMouseUp(event, gameInstance) {
        event.preventDefault();
        let { gridX, gridY } = getEventDetails(event, GRIDWIDTH);
        isMouseDown = false;
        lastCoordinates = { x: undefined, y: undefined };
        if(activeDragObject.onDragStop){
            activeDragObject.onDragStop(gridX, gridY);
        }
        activeDragObject = null; // Reset drag object
    }

    // Handle mouse move events, including drawing functionality
    export function handleMouseMove(event, gameInstance) {
        event.preventDefault();
        let { gridX, gridY } = getEventDetails(event, GRIDWIDTH);
        updateHoverState({ xPixelCoord: gridX, yPixelCoord: gridY, event, gameInstance });

        if (isMouseDown) {
            // Check if the hovered object is the one being dragged
            if (activeDragObject) {
                // Special handling for DrawableCanvas
                if (activeDragObject instanceof DrawableCanvas) {
                    if (lastCoordinates.x !== undefined && lastCoordinates.y !== undefined) {
                        // Draw line from last coordinates to current
                        activeDragObject.drawLine(lastCoordinates.x, lastCoordinates.y, gridX, gridY);
                    }
                }
                else if(activeDragObject.onDrag) {
                    // Perform drag action if it exists
                    activeDragObject.onDrag(gridX, gridY);
                }
                // Update last coordinates
                lastCoordinates = { x: gridX, y: gridY };
        }
    }
}

    // Handle mouse out events
    export function handleMouseOut(event) {
        if (lastHoveredObject) {
            lastHoveredObject.onStopHover?.();
            lastHoveredObject.hoveredChild = null;
            lastHoveredObject = null;
            event.currentTarget.style.cursor = 'default';
        }
        mouseExited = true;
    }

    // Handle scroll events for scrollable objects
    export function handleScroll(event, gameInstance) {
        event.preventDefault();
        let { gridX, gridY } = getEventDetails(event, GRIDWIDTH);
        getScrollableObjectAt(gridX, gridY, gameInstance, true).forEach(obj => {
            if (event.deltaY < 0) obj.onScrollUp?.();
            else if (event.deltaY > 0) obj.onScrollDown?.();
        });
    }

    // Handle focus events
    export function focus(node, enabled) {
        if (enabled) node.focus();
        else node.blur();
        return { 
            update(newEnabled) { 
                if (newEnabled) node.focus(); 
                else node.blur(); 
            } 
        };
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
</script>