<script context='module'>
    import { generateButtonMatrix, generateStatusBarSpriteSheet, generateTextInputMatrix, generateEmptyMatrix } from './MatrixFunctions.svelte';
    import { GeneratedObject, activeTextRenderer } from './Object.svelte';
    import { shouldFocus, inputValue } from './Game.svelte';
    import { get } from 'svelte/store';
    import { Sprite } from './SpriteComponent.svelte';

    export function generateInvisibleButtonClass( width, height ) {
        return class Button extends GeneratedObject {
            constructor(x, y, z, actionOnClick) {
                const defaultSprite = generateEmptyMatrix(width, height);
                super([defaultSprite], { default: [0], hovered: [0] }, x, y, z, actionOnClick);
                this.showPointer = true;
            }

            onHover() {
                    super.onHover(); // Call parent's hover function
                    this.updateState('hovered');
            }

            onStopHover() {
                super.onStopHover(); // Call parent's stop hover function
                this.updateState('default');
            }
        };
    }

    export function generateTextButtonClass( width, height, textRenderer, bgColor, borderColor, bgColorHovered, borderColorHovered,
        topShadow = null, bottomShadow = null, topShadowHover = null, bottomShadowHover = null, layout = 'center', offset = 0) {
            return class Button extends GeneratedObject {
                constructor(x, y, z, text, actionOnClick) {
                    const defaultSprite = generateButtonMatrix( width, height, bgColor, borderColor, textRenderer.renderText(text, {overflowPosition: "right", position: "left", maxWidth: width-4}), bottomShadow, topShadow, layout, offset);
                    const hoverSprite = generateButtonMatrix( width, height, bgColorHovered, borderColorHovered, textRenderer.renderText(text, {overflowPosition: "right", position: "left", maxWidth: width-4}), bottomShadowHover, topShadowHover, layout, offset );
                    // State management: 0 for default sprite and 1 for hover sprite
                    super([defaultSprite, hoverSprite], { default: [0], hovered: [1] }, x, y, z, actionOnClick);
                    this.showPointer = true;
                    this.text = text;
                }

                onHover() {
                    super.onHover(); // Call parent's hover function
                    this.updateState('hovered');
                }

                onStopHover() {
                    super.onStopHover(); // Call parent's stop hover function
                    this.updateState('default');
                }
            };
        }

    export function generateFontTextButtonClass( width, height, bgColor, borderColor, bgColorHovered, borderColorHovered,
        topShadow = null, bottomShadow = null, topShadowHover = null, bottomShadowHover = null, layout = 'center', offset = 0) {
            return class Button extends GeneratedObject {
                constructor(x, y, z, text, actionOnClick, textRenderer, textYOffset = 1) {
                    const defaultSprite = generateButtonMatrix( width, height, bgColor, borderColor, textRenderer.renderText(text,  {overflowPosition: "right", position: "left", maxWidth: width-4}), topShadow, bottomShadow, layout, offset, textYOffset);
                    const hoverSprite = generateButtonMatrix( width, height, bgColorHovered, borderColorHovered, textRenderer.renderText(text,  {overflowPosition: "right", position: "left", maxWidth: width-4}), topShadowHover, bottomShadowHover, layout, offset, textYOffset);

                    // State management: 0 for default sprite and 1 for hover sprite
                    super([defaultSprite, hoverSprite], { default: [0], hovered: [1] }, x, y, z, actionOnClick);
                    this.showPointer = true;
                }

                onHover() {
                    super.onHover(); // Call parent's hover function
                    this.updateState('hovered');
                }

                onStopHover() {
                    super.onStopHover(); // Call parent's stop hover function
                    this.updateState('default');
                }
            };
        }

    
    export function generateIconButtonClass( width, height, bgColor, borderColor, bgColorHovered, borderColorHovered,  
        topShadow = null, bottomShadow = null, topShadowHover = null, bottomShadowHover = null, layout = 'center', offset = 0) {
            return class Button extends GeneratedObject {
                constructor( x, y, z, iconSprite, hoveredIconSprite, actionOnClick ) {
                    const defaultSprite = generateButtonMatrix( width, height, bgColor, borderColor, iconSprite, bottomShadow, topShadow, layout, offset);
                    const hoverSprite = generateButtonMatrix( width, height, bgColorHovered, borderColorHovered, hoveredIconSprite, bottomShadowHover, topShadowHover, layout, offset );

                    // State management: 0 for default sprite and 1 for hover sprite
                    super([defaultSprite, hoverSprite], { default: [0], hovered: [1] }, x, y, z, actionOnClick);
                    this.showPointer = true;
                }

                onHover() {
                    super.onHover();
                    this.updateState('hovered');
                }

                onStopHover() {
                    super.onStopHover();
                    this.updateState('default');
                }

                setIcon(newIconSprite, newHoveredIconSprite) {
                    const defaultSprite = generateButtonMatrix( width, height, bgColor, borderColor, newIconSprite, bottomShadow, topShadow, layout, offset);
                    const hoverSprite = generateButtonMatrix( width, height, bgColorHovered, borderColorHovered, newHoveredIconSprite, bottomShadowHover, topShadowHover, layout, offset );
                    this.sprites = [defaultSprite, hoverSprite];
                }
            };
        }

    
    export function generateStatusBarClass( width, height, borderColor, bgColor, firstColor, secondColor, thirdColor, roundness ) {
        return class StatusBar extends GeneratedObject {
            constructor(x, y, z) {
                const spriteSheet = generateStatusBarSpriteSheet(width, height, borderColor, bgColor, firstColor, secondColor, thirdColor, roundness);

                // Initial state management
                let states = {};
                for (let i = 0; i < spriteSheet.length; i++) {
                    states[`state${i}`] = [i];
                }

                // Initialize with the empty state
                super(spriteSheet, states, x, y, z, () => {this.increment();});

                // Set initial state
                this.currentState = 0; // Starts from empty
                this.maxState = width - 1; // Total number of increments
            }

            whileHover(){
                // if(this.currentState < this.maxState){
                //     this.increment();
                // }
                // else(this.currentState = 0)
            }
            
            getSize() {
                return this.maxState;
            }

            increment() {
                if (this.currentState < this.maxState) {
                    this.currentState++;
                    this.updateState(`state${this.currentState}`);
                }
            }

            decrement() {
                if (this.currentState > 0) {
                    this.currentState--;
                    this.updateState(`state${this.currentState}`);
                }
            }

            setPercentage(percentage) {
                this.currentState = Math.ceil(percentage * this.maxState);
                this.updateState(`state${this.currentState}`);
            }
        };
    };

    export function generateTextInputBar(textInputReference, width, height, borderColor, bgColor, roundness, textRenderer, textXOffset = 3, borderThickness = 1) {
        return class TextInputBar extends GeneratedObject {
            constructor(x, y, z) {
                const emptyMatrix = generateEmptyMatrix(width, height);
                super([emptyMatrix], { default: [0] }, x, y, z, () => {
                    if(get(shouldFocus) === false){
                        shouldFocus.set(true);
                    }
                    else {
                        shouldFocus.set(false);
                    }
                });
                this.textRenderer = textRenderer
                this.showPointer = true;
                this.userText = "";
                this.textInput = new textInputReference((text) => this.setUserText(text), textRenderer.charMappingString);
            }
            
            setUserText(text){
                this.userText = text;
            }

            getUserText(){
                return this.userText;
            }

            getSprite(){
                return new Sprite(generateTextInputMatrix( width, height, bgColor, borderColor, this.textRenderer.renderText(this.userText, {position: "left", overflowPosition: "left", maxWidth: (width - (textXOffset * 2))}), roundness, textXOffset, borderThickness ), this.x, this.y, this.z);
            }
        };
    };
</script>
