<script context="module">
    import { RuntimeObject, ConfigObject, BaseObject } from "./Object.svelte";

    export class PannablePlaneController extends BaseObject {
        constructor(x, y, z, width, height, dragCallback, scrollDownCallback, scrollUpCallback) {
            super([], x, y, z, null)
            this.width = width;
            this.height = height;
            this.dragCallback = dragCallback;
            this.scrollDownCallback = scrollDownCallback;
            this.scrollUpCallback = scrollUpCallback;
            this.scrollable = true;
        }

        onDrag(x0, y0, x1, y1) {
            this.dragCallback(x0, y0, x1, y1);
        }

        onScrollDown(){
            this.scrollDownCallback(this.mouseX, this.mouseY);
        }

        onScrollUp(){
            this.scrollUpCallback(this.mouseX, this.mouseY);
        }
    }

    export class Button extends ConfigObject {
        constructor(x, y, z, objectName, actionOnClick) {
            super(objectName, x, y, z, actionOnClick);
            this.action = actionOnClick || (() => {});
            this.updateState("default");
            this.showPointer = true;
        }
        onHover() {
            this.updateState('hovered');
        }
        onStopHover() {
            this.updateState('default');
        }
    }

    export class Background extends ConfigObject {
        constructor(objectName, x, y, z, actionOnClick = () => {}) {
            super(objectName, x, y, z, () => {
                actionOnClick();
            });
            this.stateQueue = [];
            this.isStateCompleted = false;
            this.updateState("default")
        }
    }

    export class ObjectGrid extends RuntimeObject {
        constructor(columns, columnSpacing, rows, rowSpacing, x, y, z, objects, scrollable = false) {
            super(generateEmptyMatrix(1, 1), null, x, y, z);
            this.columns = columns > 0 ? columns : objects.length;
            this.columnSpacing = columnSpacing;
            this.rows = rows > 0 ? rows : Math.ceil(objects.length / this.columns);
            this.rowSpacing = rowSpacing;
            this.x = x;
            this.y = y;
            this.z = z;
            this.objects = objects;
            this.children = [];
            this.hoverWithChildren = true;
            this.mouseX = null;
            this.mouseY = null;
            this.renderChildren = true;
            this.childHeight = this.objects.length > 0 ? this.objects[0].getHeight() : 0;
            this.childWidth = this.objects.length > 0 ? this.objects[0].getWidth() : 0;
            this.spriteWidth = (this.childWidth + this.columnSpacing) * this.columns;
            this.spriteHeight = (this.childHeight + this.rowSpacing) * this.rows;
            this.currentPage = 0;
            this.pageSize = this.columns * this.rows;
            this.totalObjects = objects.length;
            this.scrollable = scrollable
            this.generateObjectGrid();
        }

        getSprite(){

        }
        
        onScrollUp() {
            if(this.scrollable){
                this.setPrevPage();
            }
        }
        onScrollDown() {
            if(this.scrollable){
                this.setNextPage();
            }
        }

        setNextPage() {
            console.log("Next Page ", this.currentPage, " ", this.pageSize, " ", this.children.length, "objects.length", this.objects.length)
            if((this.currentPage + 1) * this.pageSize < this.objects.length) {
                this.currentPage++;
                this.generateObjectGrid();
            }
        }

        setPrevPage() {
            console.log("Prev Page ", this.currentPage, " ", this.pageSize, " ", this.children.length, "objects.length", this.objects.length)
            if(this.currentPage > 0) {
                this.currentPage--;
                this.generateObjectGrid();
            }
        }

        generateObjectGrid() {
            this.children = this.objects.slice(this.currentPage * this.pageSize, (this.currentPage + 1) * this.pageSize);
            for (let row = 0; row < this.rows; row++) {
                for (let column = 0; column < this.columns; column++) {
                    let index = row * this.columns + column;
                    if (index >= this.children.length) break;
                    let objectX = (column * (this.childWidth + this.columnSpacing));
                    let objectY = (row * (this.childHeight + this.rowSpacing));
                    this.children[index].setCoordinate(objectX, objectY, this.z);
                }
            }
        }
    }

    export class ButtonList extends ObjectGrid {
        constructor(x, y, z, orientation, buttonSpacing, ButtonConstructor, pageLimit = null, ...buttonParameters) {
            let buttons = [];
            let columns;
            let scrollable = false;

            if(pageLimit != null) {
                columns = pageLimit;
                scrollable = true;
            } else {
                columns = buttons.length;
            }

            for (let i = 0; i < buttonParameters.length; i++) {
                // Ensure buttonParameters[i] is an array
                if (!Array.isArray(buttonParameters[i])) {
                    throw new TypeError(`buttonParameters[${i}] is not an array.`);
                }
                let button = new ButtonConstructor(x, y, z, ...buttonParameters[i]);
                buttons.push(button);
            }
            if (orientation === "horizontal") {
                super(columns, buttonSpacing, 1, 0, x, y, z, buttons, scrollable);
            }  else {
                super(1, 0, columns, buttonSpacing, x, y, z, buttons, scrollable);    
            }
        }
    }

    export class activeTextRenderer extends RuntimeObject {
        constructor(textRenderer, x, y, z, actionOnClick = null, { position = "left", overflowPosition = null, maxWidth = 128 } = {}) { 
            const emptyMatrix = generateEmptyMatrix(1, 1);
            super([emptyMatrix], { default: [0] }, x, y, z, actionOnClick);
            this.textRenderer = textRenderer;
            this.stateQueue = [];
            this.isStateCompleted = false;
            this.maxWidth = maxWidth;
            this.updateState("default");
            this.textWidth = 0;
            this.position = position;
            this.overflowPosition = overflowPosition;
            this.text = "";
        }
        setText(text) {
            this.text = text;
        }

        getText() {
            return this.text;
        }

        getSprite(){
            return new Sprite(this.textRenderer.renderText(this.text, {overflowPosition: this.overflowPosition, position: this.position, maxWidth: this.maxWidth}), this.x, this.y, this.z);
        }
    }
</script>