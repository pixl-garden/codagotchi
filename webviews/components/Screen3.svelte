<script context="module">
    let frame = 0;
    let img = new Image();
    img.src = './pet.png';

    function createGridFromImage(img, frame) {
        return new Promise((resolve, reject) => {
            img.onload = function() {
                let canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                let ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, img.width, img.height);

                let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                let data = imageData.data;

                let grid = [];
                for (let y = 0; y < img.height; y++) {
                    let row = [];
                    for (let x = 0; x < img.width; x++) {
                        let i = (y * img.width + x) * 4;
                        let a = data[i + 3];

                        let color = a === 0 ? 'clear' : 'black';

                        row.push({ pixel: null, color: color });
                    }
                    grid.push(row);
                }

                resolve(grid);
            };

            img.onerror = function() {
                reject(new Error('Failed to load image'));
            };
        });
    }

    export async function getGrid() {
        frame++;
        return await createGridFromImage(img, frame);
    }
</script>