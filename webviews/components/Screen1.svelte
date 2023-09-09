<script context="module">
    import { writable } from 'svelte/store';

    let frame = 0;

    function createCheckerboard(rows, cols, frame) {
        return Array(rows).fill().map((_, rowIndex) =>
            Array(cols).fill().map((_, colIndex) => ({
                pixel: null,
                color: (rowIndex + colIndex + frame) % 2 === 0 ? 'white' : 'clear'
            }))
        );
    }

    export function getGrid() {
        frame++;
        return createCheckerboard(26, 36, frame);
    }
</script>