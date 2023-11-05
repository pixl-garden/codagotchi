<script context = 'module'>
    import { generateButtonMatrix } from './MatrixFunctions.svelte';
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
            constructor(text, x, y, actionOnClick) {
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
                super([defaultSprite, hoverSprite], { default: [0], hovered: [1] }, x, y);
                this.actionOnClick = actionOnClick;
            }

            onHover() {
                super.onHover(); // Call parent's hover function
                this.updateState('hovered');
            }

            onStopHover() {
                super.onStopHover(); // Call parent's stop hover function
                this.updateState('default');
            }

            onClick() {
                super.onClick(); // Call parent's click function
                this.actionOnClick && this.actionOnClick();
            }
        };
    }
</script>
