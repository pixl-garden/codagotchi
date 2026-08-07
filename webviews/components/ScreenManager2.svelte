<script context="module">
    const GRIDWIDTH = 128;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const pixelSize = Math.min(width / GRIDWIDTH, height / GRIDWIDTH);
    let screenWidth = GRIDWIDTH * pixelSize;
    let padding = 0;
    const internalResolution = 512;
    
    // WebGL variables
    let gl;
    let program;
    let positionBuffer;
    let colorBuffer;
    let blurBuffer;
    let resolutionUniformLocation;
    let pixelSizeUniformLocation;
    let frameBuffer1, frameBuffer2;
    let frameTexture1, frameTexture2;
    
    function hexToRgb(hex) {
        const bigint = parseInt(hex.slice(1), 16);
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    }
    
    function createFramebufferTexture(gl) {
        const fbo = gl.createFramebuffer();
        const texture = gl.createTexture();
    
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, internalResolution, internalResolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    
        return { fbo, texture };
    }
    
    export function initWebGL(canvas) {
        canvas.width = internalResolution;
        canvas.height = internalResolution;
    
        gl = canvas.getContext('webgl', {
            antialias: false,
            preserveDrawingBuffer: true,
            alpha: true
        });
        
        if (!gl) {
            console.error('WebGL not supported');
            return false;
        }
    
        // Create two framebuffers and textures
        const fb1 = createFramebufferTexture(gl);
        const fb2 = createFramebufferTexture(gl);
        
        frameBuffer1 = fb1.fbo;
        frameTexture1 = fb1.texture;
        frameBuffer2 = fb2.fbo;
        frameTexture2 = fb2.texture;
    
        // Vertex shader
        const vsSource = `
            precision mediump float;
        
            attribute vec2 a_position;
            attribute vec4 a_color;
            attribute float a_blur;
        
            uniform vec2 u_resolution;
            uniform float u_pixelSize;
        
            varying vec4 v_color;
            varying float v_blur;
            varying vec2 v_texCoord;
        
            void main() {
                // Scale position to clip space
                vec2 zeroToOne = a_position / u_resolution;
                vec2 zeroToTwo = zeroToOne * 2.0;
                vec2 clipSpace = zeroToTwo - 1.0;
                
                // Make points larger for debugging (optional)
                gl_PointSize = max(u_pixelSize, 4.0);
                
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                v_color = a_color;
                v_blur = a_blur;
                v_texCoord = zeroToOne;
            }
        `;
    
        // Fragment shader (with the short-circuit if-block removed)
        const fsSource = `
            precision mediump float;
        
            varying vec4 v_color;
            varying float v_blur;
            varying vec2 v_texCoord;
        
            uniform vec2 u_resolution;
            uniform float u_pixelSize;
            uniform sampler2D u_texture;
        
            float gaussian(float x, float sigma) {
                return exp(-(x * x) / (2.0 * sigma * sigma));
            }
        
            void main() {
                if (v_blur > 0.0) {
                    // Sample the current pixel from the background
                    vec4 baseColor = texture2D(u_texture, v_texCoord);

                    // ---------------------------------------------------------
                    // REMOVED the check:
                    // if (baseColor.a == 0.0) {
                    //     gl_FragColor = v_color;
                    //     return;
                    // }
                    // ---------------------------------------------------------
                    
                    vec4 blurredColor = vec4(0.0);
                    float totalWeight = 0.0;
                    
                    // Adjust blur radius based on blur value
                    float blurRadius = v_blur * 2.0;
                    
                    // Sample in a square around the current pixel
                    for (int y = -2; y <= 2; y++) {
                        for (int x = -2; x <= 2; x++) {
                            float offsetX = float(x) * u_pixelSize;
                            float offsetY = float(y) * u_pixelSize;
                            vec2 offset = vec2(offsetX, offsetY) / u_resolution;
                            vec2 sampleCoord = v_texCoord + offset;
                            
                            // Check if sample coordinate is within bounds
                            if (sampleCoord.x >= 0.0 && sampleCoord.x <= 1.0 &&
                                sampleCoord.y >= 0.0 && sampleCoord.y <= 1.0) {
                                
                                // Distance for Gaussian weight
                                float dist = sqrt(float(x * x + y * y));
                                float weight = gaussian(dist / blurRadius, 1.0);
                                
                                // Accumulate
                                vec4 sample = texture2D(u_texture, sampleCoord);
                                blurredColor += sample * weight;
                                totalWeight += weight;
                            }
                        }
                    }
                    
                    // Normalize
                    vec4 blurred = blurredColor / totalWeight;
                    
                    // Blend between blurred background and the sprite's color
                    vec3 finalColor = mix(blurred.rgb, v_color.rgb, v_color.a);
                    gl_FragColor = vec4(finalColor, max(blurred.a, v_color.a));
                } else {
                    // Non-blurred sprites render normally
                    gl_FragColor = v_color;
                }
            }
        `;
    
        // Create shaders
        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
        
        // Create program
        program = createProgram(gl, vertexShader, fragmentShader);
        if (!program) return false;
    
        // Get attribute/uniform locations
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        const colorLocation = gl.getAttribLocation(program, 'a_color');
        const blurLocation = gl.getAttribLocation(program, 'a_blur');
        const textureLocation = gl.getUniformLocation(program, 'u_texture');
        resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
        pixelSizeUniformLocation = gl.getUniformLocation(program, 'u_pixelSize');
    
        // Create buffers
        positionBuffer = gl.createBuffer();
        colorBuffer = gl.createBuffer();
        blurBuffer = gl.createBuffer();
    
        // Enable attributes
        gl.enableVertexAttribArray(positionLocation);
        gl.enableVertexAttribArray(colorLocation);
        gl.enableVertexAttribArray(blurLocation);
    
        // Set up attribute pointers
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
    
        gl.bindBuffer(gl.ARRAY_BUFFER, blurBuffer);
        gl.vertexAttribPointer(blurLocation, 1, gl.FLOAT, false, 0, 0);
    
        return {
            gl,
            program,
            positionBuffer,
            colorBuffer,
            blurBuffer,
            resolutionUniformLocation,
            pixelSizeUniformLocation,
            frameBuffer1,
            frameBuffer2,
            frameTexture1,
            frameTexture2,
            textureLocation
        };
    }
    
    export function renderScreenWebGL(webglContext, screenWidth, sprites) {
        const { 
            gl, program, positionBuffer, colorBuffer, blurBuffer, 
            resolutionUniformLocation, pixelSizeUniformLocation,
            frameBuffer1, frameBuffer2, frameTexture1, frameTexture2,
            textureLocation 
        } = webglContext;

        // console.log('Sprites by type:', {
        //     total: sprites.length,
        //     blurred: sprites.filter(s => s.blur > 0).map(s => ({
        //         blur: s.blur,
        //         opacity: s.opacity,
        //         z: s.getZ(),
        //         size: s.getMatrix()?.length
        //     })),
        //     normal: sprites.filter(s => !s.blur || s.blur <= 0).length
        // });

        // Get attribute locations once (though we did it in init, we re-get them here for safety)
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        const colorLocation = gl.getAttribLocation(program, 'a_color');
        const blurLocation = gl.getAttribLocation(program, 'a_blur');
        
        if (!gl) return;

        // Sort sprites by z-index
        sprites.sort((a, b) => a.getZ() - b.getZ());

        // Separate sprites into blurred and non-blurred
        const blurredSprites = sprites.filter(s => s.blur > 0);
        const normalSprites = sprites.filter(s => !s.blur || s.blur <= 0);

        const renderPass = (sprites, useBlur, readBuffer, writeBuffer, readTexture) => {
            // console.log('Render pass:', {
            //     spriteCount: sprites.length,
            //     useBlur,
            //     hasReadBuffer: !!readBuffer,
            //     hasWriteBuffer: !!writeBuffer,
            //     hasReadTexture: !!readTexture
            // });

            const positions = [];
            const colors = [];
            const blurValues = [];
            const scaleFactor = internalResolution / screenWidth;

            // Build buffers from the given sprites
            for (const sprite of sprites) {
                const matrix = sprite.getMatrix();
                if (!Array.isArray(matrix) || !Array.isArray(matrix[0])) continue;

                const opacity = sprite.opacity !== undefined ? sprite.opacity : 1;
                const blur = useBlur ? (sprite.blur || 0) : 0;

                for (let y = Math.max(0, sprite.y); y < Math.min(GRIDWIDTH, sprite.y + matrix.length); y++) {
                    for (let x = Math.max(0, sprite.x); x < Math.min(GRIDWIDTH, sprite.x + matrix[0].length); x++) {
                        const color = matrix[y - sprite.y][x - sprite.x];
                        if (color && color !== 'transparent') {
                            positions.push(x * scaleFactor, y * scaleFactor);
                            const [r, g, b] = hexToRgb(color);
                            colors.push(r / 255, g / 255, b / 255, opacity);
                            blurValues.push(blur);
                        }
                    }
                }
            }

            if (positions.length === 0) return;

            gl.useProgram(program);
            gl.bindFramebuffer(gl.FRAMEBUFFER, writeBuffer);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            // Only clear if rendering directly to screen
            if (!writeBuffer) {
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }

            // Enable alpha blending
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

            // If this is a blur pass, bind the texture we want to sample
            if (useBlur && readTexture) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, readTexture);
                gl.uniform1i(textureLocation, 0);
            }

            // Update buffers
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(colorLocation);
            gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, blurBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(blurValues), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(blurLocation);
            gl.vertexAttribPointer(blurLocation, 1, gl.FLOAT, false, 0, 0);

            // Set uniforms
            gl.uniform2f(resolutionUniformLocation, internalResolution, internalResolution);
            gl.uniform1f(pixelSizeUniformLocation, scaleFactor);

            // Draw
            gl.drawArrays(gl.POINTS, 0, positions.length / 2);
        };

        // If there are blurred sprites, do the two-pass approach:
        if (blurredSprites.length > 0) {
            // console.log('Rendering with blur:', {
            //     blurredCount: blurredSprites.length,
            //     normalCount: normalSprites.length
            // });

            // 1) Render normal sprites behind the first blurred sprite’s z to frameBuffer1
            gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            const firstBlurZ = blurredSprites[0].getZ();
            renderPass(
                normalSprites.filter(s => s.getZ() <= firstBlurZ),
                false,
                null,
                frameBuffer1,
                null
            );

            // 2) Render all blurred sprites to the screen (sampling from frameBuffer1’s texture)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.clear(gl.COLOR_BUFFER_BIT);
            renderPass(
                blurredSprites,
                true,
                frameBuffer1,
                null,
                frameTexture1
            );

            // 3) Render remaining normal sprites on top
            renderPass(
                normalSprites.filter(s => s.getZ() > firstBlurZ),
                false,
                null,
                null,
                null
            );
        } else {
            // If no blurred sprites, just render everything
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.clear(gl.COLOR_BUFFER_BIT);
            renderPass(sprites, false, null, null, null);
        }
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
    
    export function handleResize() {
        width = window.innerWidth;
        height = window.innerHeight;
        screenWidth = width;
        document.documentElement.style.setProperty('--pixel-size', `${pixelSize}px`);
        document.documentElement.style.setProperty('--screen-width', `${screenWidth}px`);
    }
    
    export function getPadding() {
        return padding;
    }
    
    export function getPixelSize() {
        return pixelSize;
    }
</script>
