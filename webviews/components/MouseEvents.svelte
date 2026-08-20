
<script context="module">
    import { Logger } from './Logger.svelte';

    const logger = new Logger('MouseEvents');
    let isMouseDown = false;
    let activeDragObject = null;
    let currentHoveredObject = null;
    let lastHoveredObject = null;
    let lastParentObjects = [];
    let lastCoordinates = { x: undefined, y: undefined };
    const VIRTUALHEIGHT = 10000;

    function getEventDetails(event, gridWidth) {
        const boundingBox = event.currentTarget.getBoundingClientRect();
        const pixelSize = Math.min(boundingBox.width / gridWidth, boundingBox.height / gridWidth);
        const gridX = Math.ceil(event.clientX / pixelSize);
        const gridY = Math.ceil(event.clientY / pixelSize);
        return { gridX, gridY, pixelSize };
    }

    //essentially helper function for getObjectAt and getObjectsAt, to avoid code duplication
    function handleMouseObjectIntersection(x, y, gameInstance, onIntersect) {

        const findObjectsRecursively = (obj, plane, parentChain = [], parentX = 0, parentY = 0, parentZ = 0) => {
            let objX = parentX + (obj.x * plane.scale);
            let objY = parentY + (obj.y * plane.scale);
            let objZ = parentZ + obj.z + 1; // Add 1 to ensure children are always above their parents in z-order
            
            obj.hoveredChild = null;

            // check bounds
            if (x >= objX && x <= objX + obj.spriteWidth && 
                y >= objY && y <= objY + obj.spriteHeight && obj.mouseInteractions) {
                
                // parameter function to handle the intersection
                onIntersect(obj, objZ, parentChain);
            }

            // check children
            if (obj.getChildren().length > 0) {
                let children = obj.getChildren().sort((a, b) => b.getZ() - a.getZ());
                for (let child of children) {
                    findObjectsRecursively(child, plane, [...parentChain, obj], objX, objY, objZ);
                }
            }
        };
        const planesInOrder = gameInstance.activePlanes.slice().sort((a, b) => a.z - b.z);

        // multiply by 10000 per plane to ensure objects on dif planes don't interfere
        for (let plane of planesInOrder) {
            const planeZ = plane.z * 10000;
            for (let obj of plane.getObjects()) {
                findObjectsRecursively(obj, plane, [], plane.x, plane.y, planeZ); 
            }
        }
    }

    // get object with highest z value at given coordinates
    // returns array where:
    // - first element is the directly hovered object
    // - rest are parent objects with hoverWithChildren=true
    export function getObjectAt(x, y, gameInstance) {
        let highestFoundObject = null;
        let highestFoundObjectZ = -Infinity;
        let hoveredParents = [];

        console.log("Searching for object at coordinates:", x, y);

        handleMouseObjectIntersection(x, y, gameInstance, (obj, objZ, parentChain) => {
            if (objZ > highestFoundObjectZ) {
                console.log("Found object:", obj, "at z:", objZ, "with parent chain:", parentChain);
                highestFoundObject = obj;
                highestFoundObjectZ = objZ;
                hoveredParents = [];
                
                for (let parent of parentChain) {
                    if (parent.hoverWithChildren) {
                        parent.hoveredChild = obj;
                        parent.mouseX = x;
                        parent.mouseY = y;
                        hoveredParents.push(parent);
                    }
                }
            }
        });
        
        if (highestFoundObject) {
            highestFoundObject.mouseX = x;
            highestFoundObject.mouseY = y;
        }

        return [highestFoundObject, ...hoveredParents].filter(Boolean); // Filter out any null or undefined values
    }

    export function getObjectsAt(x, y, gameInstance) {
        let foundObjects = [];

        handleMouseObjectIntersection(x, y, gameInstance, (obj, objZ, parentChain) => {
            foundObjects.push(obj);
        });

        return foundObjects;
    }

    // Handle hover state updates for objects and their parents
    function updateHoverState({ xPixelCoord, yPixelCoord, event, gameInstance }) {
        const hoveredObjects = getObjectAt(xPixelCoord, yPixelCoord, gameInstance);
        const primaryHoveredObject = hoveredObjects[0] || null;
        const parentObjects = hoveredObjects.slice(1);

        // Update global state for drag handlers
        currentHoveredObject = primaryHoveredObject;

        // Check if primary target or parent chain changed
        const primaryChanged = primaryHoveredObject !== lastHoveredObject;
        const parentsChanged = !arrayEquals(parentObjects, lastParentObjects);
        const hoverStateChanged = primaryChanged || parentsChanged;

        if (hoverStateChanged) {
            // Unhover old primary object
            if (lastHoveredObject && lastHoveredObject !== primaryHoveredObject) {
                lastHoveredObject.onStopHover?.();
            }

            // Unhover old parents no longer in the new parent chain
            lastParentObjects.forEach(oldParent => {
                if (!parentObjects.includes(oldParent)) {
                    oldParent.onStopHover?.();
                    oldParent.hoveredChild = null;
                }
            });

            // Hover new primary object
            if (primaryHoveredObject && primaryChanged) {
                primaryHoveredObject.onHover?.();
            }

            // Hover newly active parents
            parentObjects.forEach(parent => {
                if (!lastParentObjects.includes(parent)) {
                    parent.onHover?.();
                }
            });

            // Update cursor
            if (event?.currentTarget) {
                const showPointer = primaryHoveredObject?.showPointer;
                event.currentTarget.style.cursor = showPointer ? 'pointer' : 'default';
            }

            // Sync tracking state
            lastHoveredObject = primaryHoveredObject;
            lastParentObjects = parentObjects;
        } else {
            // Continuous hover tick
            primaryHoveredObject?.whileHover?.();
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
        let { gridX, gridY } = getEventDetails(event, VIRTUALHEIGHT);
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
        currentHoveredObject?.onMouseDown?.();
        
        event.preventDefault();
        isMouseDown = true;
        let { gridX, gridY } = getEventDetails(event, VIRTUALHEIGHT);
        lastCoordinates = { x: gridX, y: gridY };
        handleClick(event, gameInstance); // Initial click handling
    }

    // Handle mouse up events
    export function handleMouseUp(event, gameInstance) {
        event.preventDefault();
        let { gridX, gridY } = getEventDetails(event, VIRTUALHEIGHT);
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
        let { gridX, gridY } = getEventDetails(event, VIRTUALHEIGHT);
        updateHoverState({ xPixelCoord: gridX, yPixelCoord: gridY, event, gameInstance });

        if (isMouseDown && activeDragObject && activeDragObject.onDrag) {
            // Perform drag action if it exists
            activeDragObject.onDrag(gridX, gridY, lastCoordinates.x || null, lastCoordinates.y || null);
            // Update last coordinates
            lastCoordinates = { x: gridX, y: gridY };
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
        let { gridX, gridY } = getEventDetails(event, VIRTUALHEIGHT);
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
        const planesInOrder = gameInstance.activePlanes.slice().sort((a, b) => a.z - b.z);
        let objects = planesInOrder.flatMap(plane => plane.getObjects()).sort((a, b) => b.getZ() - a.getZ());
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