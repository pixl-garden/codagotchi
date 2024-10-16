<script>
    import { onMount } from 'svelte';
    import { generateScreen, getPixelSize } from './ScreenManager.svelte';
    import { game, shouldFocus, inputValue, textInput } from './Game.svelte';
    import { handleMouseMove, handleClick, handleMouseOut, handleMouseDown, handleMouseUp, focus, handleScroll } from './MouseEvents.svelte';
    import { loadSpriteData } from './SpriteReader.svelte';
    import { preloadObjects, roomMain } from './Rooms.svelte';
    import { get } from 'svelte/store';

    const FPS = 16; //frames per second
    let screen = [];
    let currentRoom;
    let canvas;
    const screenWidth = 128; // Game logic resolution
    const internalResolution = 512; // Fixed high internal resolution
    let startTime, endTime;

    // WebGL variables
    let gl;
    let program;
    let positionBuffer;
    let colorBuffer;
    let resolutionUniformLocation;
    let pixelSizeUniformLocation;

    function initWebGL(canvas) {
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

        return true;
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

    function renderScreenWebGL(screen) {
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

    function pre() {
        $game.syncLocalToGlobalState({});
        $game.constructInventory();
        console.log("Constructed inventory");
        preloadObjects();
        $game.setCurrentRoom('mainRoom');
    }

    function main() {
        let sprites = []; // Clear previous sprites
        roomMain();
        
        // Get the current room from the game object
        currentRoom = $game.getCurrentRoom();
        
        // Render objects in the current room
        for (let obj of currentRoom.getObjects()) {
            const children = obj.getChildren();
            if(children.length > 0 && obj.renderChildren) {
                obj.getChildSprites().forEach((sprite) => {
                    if (Array.isArray(sprite)) {
                        sprites.push(...sprite);
                    } else {
                        sprites.push(sprite);
                    }
                });
            }
            const sprite = obj.getSprite();
            if (Array.isArray(sprite)) {
                sprites.push(...sprite);
            } else if (sprite) {
                sprites.push(sprite);
            }
        }
        
        screen = generateScreen(sprites, screenWidth, screenWidth);
        renderScreenWebGL(screen);
    }

    function handleResize() {
        const size = Math.min(window.innerWidth, window.innerHeight);
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
    }

    onMount(async () => {
        canvas = document.getElementsByClassName('pixel-grid')[0];
        
        if (!initWebGL(canvas)) {
            console.error('WebGL initialization failed');
            return;
        }
        handleResize();

        window.addEventListener('message', async (event) => {
            const message = event.data;
            switch (message.type) {
                case 'sprite-data':
                    startTime = performance.now();
                    loadSpriteData(message.data).then(() => {
                        console.log('Sprite data loaded and parsed');
                        pre();
                        endTime = performance.now();
                        console.log(`Time taken: ${endTime - startTime} milliseconds`);
                        setInterval(main, Math.floor(1000 / FPS));
                    });
                    break;

                case 'documentSaved':
                    $game.resetActivityTimeout();
                    break;

                case 'fetchedGlobalState':
                    $game.setLocalState(message.value);
                    break;

                case 'resize':
                    handleResize();
                    break;

                case 'cached-user-inbox':
                    let cachedUserInbox = message.userInbox;
                    console.log('Received cached userInbox:', cachedUserInbox);
                    await $game.initializeWithCache(cachedUserInbox);
                    break;

                case 'cached-user-inventory':
                    let cachedUserInventory = message.userInventory;
                    console.log('Received cached userInventory:', cachedUserInventory);
                    await $game.initializeWithCache({}, cachedUserInventory);
                    break;

                case 'logoutSuccess':
                    $game.updateGlobalState({isLoggedIn: false});
                    break;

                case 'loginSuccess':
                    $game.updateGlobalState({isLoggedIn: true});
                    break;

                default:
                    console.log('Unhandled message type:', message.type);
            }
        });

        tsvscode.postMessage({ type: 'webview-ready' });
        window.addEventListener('resize', handleResize);
    });

    $: if ($shouldFocus) {
        // console.log('Input is focused');
    }

    $: {
        const inputValueStore = $inputValue;
        textInput.updateAllInstances(inputValueStore);
    }
</script>

<input type="text" id="hiddenInput" bind:value={$inputValue} use:focus={$shouldFocus} />
<canvas class="pixel-grid"
     on:click={(e) => handleClick(e, get(game))}
     on:mousemove={(e) => handleMouseMove(e, get(game))}
     on:mousedown={(e) => handleMouseDown(e, get(game))}
     on:mouseup={handleMouseUp}
     on:mouseleave={(e) => handleMouseOut(e)}
     on:wheel={(e) => handleScroll(e, get(game))}>
</canvas>