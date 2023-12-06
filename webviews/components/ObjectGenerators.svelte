<script context='module'>
    import { generateButtonMatrix, generateStatusBarSpriteSheet } from './MatrixFunctions.svelte';
    import { GeneratedObject } from './Object.svelte';

    export function generateButtonClass(
        width,
        height,
        bgColor,
        borderColor,
        bgColorHovered,
        borderColorHovered,
        textRenderer,
    ) {
        return class Button extends GeneratedObject {
            constructor(text, x, y, actionOnClick, z) {
                const defaultSprite = generateButtonMatrix(
                    width,
                    height,
                    bgColor,
                    borderColor,
                    textRenderer(text),
                );
                const hoverSprite = generateButtonMatrix(
                    width,
                    height,
                    bgColorHovered,
                    borderColorHovered,
                    textRenderer(text),
                );

                // State management: 0 for default sprite and 1 for hover sprite
                super([defaultSprite, hoverSprite], { default: [0], hovered: [1] }, x, y, z, actionOnClick);
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

    
    export function generateStatusBarClass(
        width,
        height,
        borderColor,
        bgColor,
        statusBarColor
    ) {
        return class StatusBar extends GeneratedObject {
            constructor(x, y, z) {
                const spriteSheet = generateStatusBarSpriteSheet(width, height, borderColor, bgColor, statusBarColor);

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
                if(this.currentState < this.maxState){
                    this.increment();
                }
                else(this.currentState = 0)
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
        };
    }


</script>
