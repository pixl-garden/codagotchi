<script context="module">
    export function fitMinStrategy(viewportWidth, viewportHeight, planeWidth, planeHeight, anchorX = 0.5, anchorY = 0.5) {
        const scale = Math.min(viewportWidth / planeWidth, viewportHeight / planeHeight);
        const screenWidth = planeWidth * scale;
        const screenHeight = planeHeight * scale;

        return {
            x: (viewportWidth - screenWidth) * anchorX,
            y: (viewportHeight - screenHeight) * anchorY,
            scaleX: scale,
            scaleY: scale,
            width: screenWidth,
            height: screenHeight
        };
    }

    export function pannedStrategy(viewportWidth, viewportHeight, cameraX, cameraY, zoom = 1) {
        return {
            x: (viewportWidth / 2) - (cameraX * zoom),
            y: (viewportHeight / 2) - (cameraY * zoom),
            scaleX: zoom,
            scaleY: zoom,
            width: viewportWidth,
            height: viewportHeight
        };
    }
</script>