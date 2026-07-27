
<script context="module">
    // Import necessary components and set up global variables
    import { DrawableCanvas } from './PostOffice.svelte';
    import { Logger } from './Logger.svelte';

    let mouseExited = false;
    let lastHoveredObject = null;
    let lastHoveredChild = null;
    let isMouseDown = false;
    let activeDragObject = null;
    let newHoveredObject = null;
    let lastCoordinates = { x: undefined, y: undefined };

    const VIRTUALHEIGHT = 128;

    const logger = new Logger('MouseEvents');

    // Utility function for repetitive calculations
    // function getEventDetails(event, gridWidth) {
    //     const boundingBox = event.currentTarget.getBoundingClientRect();
    //     const pixelSize = Math.min(boundingBox.width / gridWidth, boundingBox.height / gridWidth);
    //     const gridX = Math.ceil(event.clientX / pixelSize);
    //     const gridY = Math.ceil(event.clientY / pixelSize);
    //     return { gridX, gridY, pixelSize };
    // }

    function getVirtualCoordinates(event){
        const boundingBox = event.currentTarget.getBoundingClientRect();
        const percentX = (event.clientX - boundingBox.left) / boundingBox.width;
        const percentY = (event.clientY - boundingBox.top) / boundingBox.height;
        const virtualWidth = VIRTUALHEIGHT * (boundingBox.width / boundingBox.height);
        const virtualX = percentX * virtualWidth;
        const virtualY = percentY * VIRTUALHEIGHT;
        return { virtualX, virtualY };
    }

    function getPlaneLocalCoords(virtualX, virtualY, plane) {
        const planeXCheck = (virtualX - plane.x) / plane.scale;
        const planeYCheck = (virtualY - plane.y) / plane.scale;
        return { planeXCheck, planeYCheck };
    }

    // Get the object with the highest z value at the given coordinates
    // Returns an array where:
    // - First element is the directly hovered object
    // - Subsequent elements are parent objects with hoverWithChildren=true
    export function getObjectAt(virtualX, virtualY, gameInstance) {
        const planesInOrder = gameInstance.activePlanes.slice().sort((a, b) => b.zIndex - a.zIndex);
        
        let highestFoundObject = null;
        let highestFoundObjectZ = -10000000000;
        let hoveredParents = [];
        
        // store the local coordinates for the highest object so we can pass them later
        let bestLocalX = 0;
        let bestLocalY = 0;

        for (let plane of planesInOrder) {
            const { planeXCheck, planeYCheck } = getPlaneLocalCoords(virtualX, virtualY, plane);
            let objects = plane.getObjects().sort((a, b) => b.getZ() - a.getZ());

            const findObjectsRecursively = (obj, parentChain = [], parentX = 0, parentY = 0, parentZ = 0) => {
                let objX = parentX + obj.x;
                let objY = parentY + obj.y;
                let objZ = parentZ + obj.z + 1;
                obj.hoveredChild = null;

                let globalZ = (plane.z * 10000) + objZ;

                if (isMouseDown) {
                    logger.log(`Checking ${obj.name || 'Object'}:`, {
                        mouseLocalX: Math.round(planeXCheck),
                        mouseLocalY: Math.round(planeYCheck),
                        objX: objX,
                        objY: objY,
                        width: obj.spriteWidth,
                        height: obj.spriteHeight,
                        interactionsEnabled: obj.mouseInteractions,
                        calculatedGlobalZ: globalZ
                    });
                }

                // check bounds using the LOCAL planeXCheck and planeYCheck
                if (planeXCheck >= objX && planeXCheck <= objX + obj.spriteWidth && 
                    planeYCheck >= objY && planeYCheck <= objY + obj.spriteHeight && obj.mouseInteractions) {
                    
                    // multiply plane.zIndex to ensure planes stay layered properly
                    // let globalZ = (plane.z * 10000) + objZ; 

                    if (globalZ > highestFoundObjectZ) {
                        highestFoundObject = obj;
                        highestFoundObjectZ = globalZ;
                        bestLocalX = planeXCheck;
                        bestLocalY = planeYCheck;
                        
                        hoveredParents = [];
                        let currentZ = objZ;
                        for (let parent of parentChain) {
                            if (parent.hoverWithChildren) {
                                parent.hoveredChild = parent.hoveredChild || obj;
                                hoveredParents.push({ parent: parent, z: currentZ + parent.z });
                            }
                            currentZ += parent.z;
                        }
                    }
                }

                if (obj.getChildren().length > 0) {
                    let children = obj.getChildren().sort((a, b) => b.getZ() - a.getZ());
                    for (let child of children) {
                        findObjectsRecursively(child, [...parentChain, obj], objX, objY, objZ);
                    }
                }
            };

            for (let obj of objects) {
                findObjectsRecursively(obj);
            }
        }

        // Pass the calculated LOCAL coordinates to the object
        if (highestFoundObject) {
            highestFoundObject.mouseX = bestLocalX;
            highestFoundObject.mouseY = bestLocalY;
        }
        
        hoveredParents.forEach(({parent}) => {
            parent.mouseX = bestLocalX;
            parent.mouseY = bestLocalY;
        });

        if(isMouseDown) {
            logger.log("Hovered Object: ", highestFoundObject);
            hoveredParents.forEach(({parent}) => {
                logger.log("Hovered Parent: ", parent);
            });
        }

        return [highestFoundObject, ...hoveredParents.map(p => p.parent)].filter(Boolean);
    }

    export function getObjectsAt(virtualX, virtualY, gameInstance) {
        let foundObjects = [];
        const planesInOrder = gameInstance.activePlanes.slice().sort((a, b) => a.zIndex - b.zIndex);

        for (let plane of planesInOrder) {
            // convert virtual coords to this specific plane's local coords
            const { planeXCheck, planeYCheck } = getPlaneLocalCoords(virtualX, virtualY, plane);
            
            // sort this plane's objects top-to-bottom
            let objects = plane.getObjects().sort((a, b) => b.getZ() - a.getZ());

            const findObjectsRecursively = (obj, parentChain = [], parentX = 0, parentY = 0, parentZ = 0) => {
                let objX = parentX + obj.x;
                let objY = parentY + obj.y;
                let objZ = parentZ + obj.z + 1; // +1 ensures children are above parents
                
                // calculate a global Z so planes sort properly against each other
                let globalZ = (plane.zIndex * 10000) + objZ;

                // Check if coordinates are within object bounds
                if (planeXCheck >= objX && planeXCheck <= objX + obj.spriteWidth && 
                    planeYCheck >= objY && planeYCheck <= objY + obj.spriteHeight && obj.mouseInteractions) {

                    // Add the current object with its calculated GLOBAL Z position
                    foundObjects.push({
                        object: obj,
                        z: globalZ
                    });

                    obj.mouseX = planeXCheck;
                    obj.mouseY = planeYCheck;

                    // Add parents with hoverWithChildren
                    let currentGlobalZ = globalZ;
                    for (let parent of parentChain) {
                        if (parent.hoverWithChildren) {
                            parent.hoveredChild = parent.hoveredChild || obj;
                            parent.mouseX = planeXCheck;
                            parent.mouseY = planeYCheck;

                            foundObjects.push({
                                object: parent,
                                z: currentGlobalZ + parent.z
                            });
                        }
                        currentGlobalZ += parent.z;
                    }
                }

                // Recursively check children if they exist
                if (obj.getChildren().length > 0) {
                    let children = obj.getChildren().sort((a, b) => b.getZ() - a.getZ());
                    for (let child of children) {
                        findObjectsRecursively(
                            child,
                            [...parentChain, obj],
                            objX,
                            objY,
                            objZ
                        );
                    }
                }
            };

            // Start recursive search from top-level objects for THIS plane
            for (let obj of objects) {
                findObjectsRecursively(obj);
            }
        }

        // Sort all found objects by Z position (highest to lowest) and return just the objects
        return foundObjects
            .sort((a, b) => b.z - a.z)
            .map(item => item.object);
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


    export function handleClick(event, gameInstance) {
        let { virtualX, virtualY } = getVirtualCoordinates(event);
        let hoveredObjects = getObjectAt(virtualX, virtualY, gameInstance);
        let clickedObject = hoveredObjects[0];
        
        if (clickedObject && isMouseDown && !activeDragObject) {
            activeDragObject = clickedObject;
            clickedObject.clickAction(clickedObject.mouseX, clickedObject.mouseY);
        }
        updateHoverState({ xPixelCoord: virtualX, yPixelCoord: virtualY, event, gameInstance });
    }

    export function handleMouseDown(event, gameInstance) {
        if (newHoveredObject instanceof DrawableCanvas) {
            newHoveredObject.saveCurrentCanvas();
        }
        event.preventDefault();
        isMouseDown = true;
        
        handleClick(event, gameInstance);
    }

    // Handle mouse up events
    export function handleMouseUp(event) {
        event.preventDefault();
        isMouseDown = false;
        
        activeDragObject?.onDragStop?.(activeDragObject.mouseX, activeDragObject.mouseY);
        
        lastCoordinates = { x: undefined, y: undefined };
        activeDragObject = null;
    }

    // Handle mouse move events, including drawing functionality
    export function handleMouseMove(event, gameInstance) {
        event.preventDefault();
        let { virtualX, virtualY } = getVirtualCoordinates(event);

        if (gameInstance.activePlanes.length > 0) {
            let testPlane = gameInstance.activePlanes[0];
            let localCoords = getPlaneLocalCoords(virtualX, virtualY, testPlane);
            logger.log(`Screen: ${event.clientX}x${event.clientY} | Virtual: ${Math.round(virtualX)}x${Math.round(virtualY)} | Local: ${Math.round(localCoords.planeXCheck)}x${Math.round(localCoords.planeYCheck)}`);
        }

        updateHoverState({ xPixelCoord: virtualX, yPixelCoord: virtualY, event, gameInstance });

        if (isMouseDown && activeDragObject) {
            let localX = activeDragObject.mouseX;
            let localY = activeDragObject.mouseY;

            if (activeDragObject instanceof DrawableCanvas) {
                if (lastCoordinates.x !== undefined && lastCoordinates.y !== undefined) {
                    activeDragObject.drawLine(lastCoordinates.x, lastCoordinates.y, localX, localY);
                }
            } else if (activeDragObject.onDrag) {
                activeDragObject.onDrag(localX, localY);
            }
            
            // Save the LOCAL coordinates for the next frame's line drawing
            lastCoordinates = { x: localX, y: localY };
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
        let { virtualX, virtualY } = getVirtualCoordinates(event);
        getScrollableObjectAt(virtualX, virtualY, gameInstance, true).forEach(obj => {
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

    export function getScrollableObjectAt(virtualX, virtualY, gameInstance) {
        let foundObjects = [];
        const planesInOrder = gameInstance.activePlanes.slice();

        for (let plane of planesInOrder) {
            const { planeXCheck, planeYCheck } = getPlaneLocalCoords(virtualX, virtualY, plane);
            let objects = plane.getObjects();

            const findScrollableObjectsRecursively = (obj, parentChain = [], parentX = 0, parentY = 0, parentZ = 0) => {
                let objX = parentX + obj.x;
                let objY = parentY + obj.y;
                let objZ = parentZ + obj.z + 1;
                
                // Calculate global Z to sort objects across different planes
                let globalZ = (plane.zIndex * 10000) + objZ;

                // Check bounds using local plane coordinates
                if (planeXCheck >= objX && planeXCheck <= objX + obj.spriteWidth && 
                    planeYCheck >= objY && planeYCheck <= objY + obj.spriteHeight) {
                    
                    if (obj?.scrollable) {
                        foundObjects.push({
                            object: obj,
                            z: globalZ
                        });
                    }
                }

                // Recursively check children
                if (obj.getChildren().length > 0) {
                    let children = obj.getChildren();
                    for (let child of children) {
                        findScrollableObjectsRecursively(child, [...parentChain, obj], objX, objY, objZ);
                    }
                }
            };

            for (let obj of objects) {
                findScrollableObjectsRecursively(obj);
            }
        }

        // Sort all found scrollable objects by global Z position (highest to lowest) and return the top one
        return foundObjects
            .sort((a, b) => b.z - a.z)
            .map(item => item.object)
            .slice(0, 1);
    }
</script>