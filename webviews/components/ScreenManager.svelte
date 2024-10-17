<script context="module">
    const GRIDWIDTH = 128;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const pixelSize = Math.min(width / GRIDWIDTH, height / GRIDWIDTH);
    let screenWidth = GRIDWIDTH * pixelSize;
    let padding = 0;


    function hexToRGB(hex) {
        // Remove the '#' if it is present
        hex = hex.replace(/^#/, '');

        // Parse RGB values
        let r = parseInt(hex.slice(0, 2), 16);
        let g = parseInt(hex.slice(2, 4), 16);
        let b = parseInt(hex.slice(4, 6), 16);

        return { r, g, b };
    }

    function blendPixels(pixel1, pixel2, opacity) {
        let r = Math.round((1 - opacity) * pixel1.r + opacity * pixel2.r);
        let g = Math.round((1 - opacity) * pixel1.g + opacity * pixel2.g);
        let b = Math.round((1 - opacity) * pixel1.b + opacity * pixel2.b);
        return { r, g, b };
    }

    export function generateScreen(sprites, xSize, ySize) {
        // Initialize an empty screen with the given size
        let screen = Array(ySize)
            .fill()
            .map(() => Array(xSize).fill('transparent'));

        // Sort sprites by z-index (smallest to largest)
        sprites.sort((a, b) => a.getZ() - b.getZ());

        // Iterate over each sprite and draw it on the screen
        sprites.forEach((sprite) => {
            let spriteMatrix = sprite.getMatrix();
            
            // Validate if spriteMatrix is a 2D array
            if (!Array.isArray(spriteMatrix) || !Array.isArray(spriteMatrix[0])) {
                console.log("sprite=", sprite);
                throw new Error('spriteMatrix is not a 2D array, sprite^');
            }

            // Calculate the bounds for y and x within the screen and sprite matrix
            let spriteMatrixYLen = spriteMatrix.length;
            let spriteMatrixXLen = spriteMatrix[0].length;
            let startY = Math.max(0, sprite.y);
            let endY = Math.min(ySize, sprite.y + spriteMatrixYLen);
            let startX = Math.max(0, sprite.x);
            let endX = Math.min(xSize, sprite.x + spriteMatrixXLen);

            // Iterate over the sprite matrix and draw it on the screen
            for (let y = startY; y < endY; y++) {
                let matrixY = y - sprite.y;
                for (let x = startX; x < endX; x++) {
                    let matrixX = x - sprite.x;
                    let pixelHex = spriteMatrix[matrixY][matrixX];
                    // If sprite pixel is transparent skip it
                    if (pixelHex !== 'transparent') {
                        // If sprite pixel is not fully opaque blend it with the screen pixel (if it exists)
                        if (sprite.opacity < 1 && screen[y][x] !== 'transparent') {
                            let spritePixel = hexToRGB(pixelHex);
                            let screenPixel = hexToRGB(screen[y][x]);
                            // Blend the pixel with the background screen pixel
                            let blendedPixel = blendPixels(screenPixel, spritePixel, sprite.opacity);
                            // Convert the blended pixel back to hex
                            let hexValue = `#${((1 << 24) + (blendedPixel.r << 16) + (blendedPixel.g << 8) + blendedPixel.b).toString(16).slice(1)}`;
                            screen[y][x] = `#${hexValue.slice(1)}`;
                        } else {
                            // Fully opaque pixel, just copy it
                            screen[y][x] = pixelHex;
                        }
                    }
                }
            }
        });

        return screen;
    }

        // WebGL variables
        let gl;
    let program;
    let positionBuffer;
    let colorBuffer;
    let resolutionUniformLocation;
    let pixelSizeUniformLocation;
    const internalResolution = 512; // Fixed high internal resolution

    export function initWebGL(canvas) {
        // Set the canvas to our high internal resolution
        canvas.width = internalResolution;
        canvas.height = internalResolution;

        gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
        if (!gl) {
            console.error('WebGL not supported');
            return false;
        }

        // Vertex shader
        const vsSource = `
            attribute vec2 a_position;
            attribute vec4 a_color;
            uniform vec2 u_resolution;
            uniform float u_pixelSize;
            varying vec4 v_color;
            void main() {
                vec2 zeroToOne = a_position / u_resolution;
                vec2 zeroToTwo = zeroToOne * 2.0;
                vec2 clipSpace = zeroToTwo - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                gl_PointSize = u_pixelSize;
                v_color = a_color;
            }
        `;

        // Fragment shader
        const fsSource = `
            precision mediump float;
            varying vec4 v_color;
            void main() {
                gl_FragColor = v_color;
            }
        `;

        // Create shader program
        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
        program = createProgram(gl, vertexShader, fragmentShader);

        // Look up attribute and uniform locations
        const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
        const colorAttributeLocation = gl.getAttribLocation(program, 'a_color');
        resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
        pixelSizeUniformLocation = gl.getUniformLocation(program, 'u_pixelSize');

        // Create buffers
        positionBuffer = gl.createBuffer();
        colorBuffer = gl.createBuffer();

        // Enable attributes
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.enableVertexAttribArray(colorAttributeLocation);

        // Tell attributes how to get data out of positionBuffer and colorBuffer
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.vertexAttribPointer(colorAttributeLocation, 4, gl.FLOAT, false, 0, 0);

        return {
            gl,
            program,
            positionBuffer,
            colorBuffer,
            resolutionUniformLocation,
            pixelSizeUniformLocation
        };
    }

    function compileShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    function createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    }

    export function renderScreenWebGL(screen, webglContext, screenWidth) {
        const { gl, program, positionBuffer, colorBuffer, resolutionUniformLocation, pixelSizeUniformLocation } = webglContext;
        
        if (!gl) return;

        const positions = [];
        const colors = [];
        const scaleFactor = internalResolution / screenWidth;

        screen.forEach((row, y) => {
            row.forEach((color, x) => {
                positions.push(x * scaleFactor, y * scaleFactor);
                if (color === 'transparent') {
                    colors.push(0, 0, 0, 0);
                } else {
                    const [r, g, b] = hexToRgb(color);
                    colors.push(r / 255, g / 255, b / 255, 1);
                }
            });
        });

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        gl.useProgram(program);
        gl.uniform2f(resolutionUniformLocation, internalResolution, internalResolution);
        gl.uniform1f(pixelSizeUniformLocation, scaleFactor);

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, positions.length / 2);
    }

    function hexToRgb(hex) {
        const bigint = parseInt(hex.slice(1), 16);
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    }


    export function handleResize() {
        updateDimensions();
        updateStyles();
    }

    export function getPadding() {
        return padding;
    }

    export function getPixelSize() {
        return pixelSize;
    }

    function updateDimensions() {
        width = window.innerWidth;
        height = window.innerHeight;
        screenWidth = width;
    }

    function updateStyles() {
        // document.documentElement.style.setProperty('--container-padding', `${padding}px`);
        document.documentElement.style.setProperty('--pixel-size', `${pixelSize}px`);
        document.documentElement.style.setProperty('--screen-width', `${screenWidth}px`);
    }
</script>
