<script context="module">
    import { RuntimeObject } from "./Object.svelte";
    import { generateStatusBarSpriteSheet } from "./MatrixFunctions.svelte"

    export function generateStatusBarClass(width, height, borderColor, bgColor, colorConfigs, roundness) {
        return class StatusBar extends RuntimeObject {
            constructor(x, y, z) {
                const spriteSheet = generateStatusBarSpriteSheet(
                    width, 
                    height, 
                    borderColor, 
                    bgColor, 
                    colorConfigs,
                    roundness
                );
                
                // Initial state management
                let states = {};
                for (let i = 0; i < spriteSheet.length; i++) {
                    states[`state${i}`] = [i];
                }
                // Initialize with the empty state
                super(spriteSheet, states, x, y, z, () => {this.increment();});
                // Set initial state
                console.log("SPRITE SHEET: ", spriteSheet);
                this.currentState = 0; // Starts from empty
                this.maxState = width - 2; // Total number of increments
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
                this.currentState = Math.min(Math.ceil(percentage * this.maxState), this.maxState);
                this.updateState(`state${this.currentState}`);
            }
        };
    };
</script>
