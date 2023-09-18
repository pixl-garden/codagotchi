<script>
    import { onMount } from 'svelte';
    export let src = '';

    let binaryArray = [];

    onMount(() => {
        if (src) {
            generateBinaryArray(src).then(result => {
                binaryArray = result;
                // You can then pass this binaryArray wherever needed or use as required.
            });
        }
    });

    async function generateBinaryArray(imageSrc) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                const rows = canvas.height;
                const cols = canvas.width;

                let result = new Array(rows).fill().map(() => new Array(cols).fill(0));

                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < cols; x++) {
                        const idx = (y * cols + x) * 4;
                        const alpha = imgData[idx + 3];

                        // Here, check for transparency. You can adjust this condition depending on your requirements.
                        if (alpha !== 0) {
                            result[y][x] = 1;
                        }
                    }
                }

                resolve(result);
            };
            img.onerror = reject;
            img.src = imageSrc;
        });
    }
</script>