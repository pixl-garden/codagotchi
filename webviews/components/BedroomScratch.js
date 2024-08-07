class Room {
    constructor(bedroomConfig) {
        this.bedroomConfig = bedroomConfig;
    }

    checkCollision({ furnitureType, objectIndex, xCoord, yCoord, position }) {
        this.validateFurnitureType(furnitureType);
        const objectConfig = this.getObjectConfig(furnitureType, objectIndex);
        let itemArray = this.getItemsArray(furnitureType, position);

        if (this.isCollisionWithWalls(xCoord, yCoord, objectConfig, furnitureType, position)) {
            return false;
        }

        return this.isCollisionWithOtherItems(xCoord, yCoord, objectConfig, itemArray, furnitureType);
    }

    validateFurnitureType(furnitureType) {
        if (!this.isValidObjectType(furnitureType) || ['wallpaper', 'floor'].includes(furnitureType)) {
            throw new Error('checkCollision: invalid objectType');
        }
    }

    getObjectConfig(furnitureType, objectIndex) {
        const objectConfig = this.bedroomConfig[furnitureType][objectIndex];
        if (!objectConfig.xTrim) {
            throw new Error('checkCollision: object must have xTrim property');
        }
        return objectConfig;
    }

    getItemsArray(furnitureType, position) {
        if (furnitureType === "stackableItem") {
            const stackable = this.bedroomConfig["furnitureItems"]
                .filter(item => item.position === position && item.stackYCoord !== undefined);
            return stackable.length ? this.bedroomConfig["stackableItemItems"] : this.bedroomConfig["furnitureItems"];
        }
        return this.bedroomConfig[`${furnitureType}Items`].filter(item => item.position === position);
    }

    isCollisionWithWalls(xCoord, yCoord, objectConfig, furnitureType, position) {
        const bounds = this.getBounds(furnitureType, position);
        const leftWallCollision = xCoord < bounds.xLeftBound;
        const rightWallCollision = xCoord + objectConfig.xTrim > bounds.xRightBound;
        const floorCollision = furnitureType === "wallItem" && yCoord < bounds.yTopBound;
        const ceilingCollision = furnitureType === "wallItem" && yCoord + objectConfig.yTrim > bounds.yBottomBound;

        return leftWallCollision || rightWallCollision || floorCollision || ceilingCollision;
    }

    getBounds(furnitureType, position) {
        if (position === "far" || position === "near") {
            return this.bedroomConfig[position + "Furniture"];
        }
        return this.bedroomConfig[furnitureType];
    }

    isCollisionWithOtherItems(xCoord, yCoord, objectConfig, itemArray, furnitureType) {
        return !itemArray.some(item => {
            const rightBoundCollision = xCoord < item.x + item.xTrim;
            const leftBoundCollision = xCoord + objectConfig.xTrim > item.x;
            const verticalCollision = furnitureType === "wallItem" &&
                ((yCoord < item.y + item.yTrim) || (yCoord + objectConfig.yTrim > item.y));
            return rightBoundCollision && leftBoundCollision && (!furnitureType === "wallItem" || verticalCollision);
        });
    }
}
