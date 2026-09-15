<script context="module">

    let gl;
    let image = new Image();
    let atlasLoaded = false;

    // Shader program & location pointers
    let program;
    let positionAttributeLocation;
    let texCoordAttributeLocation;
    let resolutionLocation;
    let imageLocation;
    let colorLocation;
    let atlasSizeLocation;

    // GPU State and Buffer handles
    let vao;
    let positionBuffer;
    let texCoordBuffer;
    let texture;

    export function initWebGL(canvas, atlasUri) {
        // 1. Initialize the WebGL 2.0 context
        gl = canvas.getContext('webgl2');
        if (!gl) {
            console.error('WebGL2 not supported');
            return null;
        }

        // 2. Set up asynchronous image loading for the texture atlas
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            atlasLoaded = true;
            console.log('Atlas image loaded successfully');

            // Make Texture Unit 0 active and bind our texture handle before uploading pixels
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);

            // Upload the loaded image pixels into GPU texture memory
            let mipLevel = 0;
            let internalFormat = gl.RGBA;
            let srcFormat = gl.RGBA;
            let srcType = gl.UNSIGNED_BYTE;
            gl.texImage2D(
                gl.TEXTURE_2D,
                mipLevel,
                internalFormat,
                srcFormat,
                srcType,
                image
            );
        };
        image.src = atlasUri;

        // 3. Compile GLSL shaders and link the GPU program
        const vertShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        program = createProgram(gl, vertShader, fragShader);

        // 4. Query memory locations for attributes and uniforms from the compiled program
        positionAttributeLocation = gl.getAttribLocation(program, "a_position");
        texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");
        resolutionLocation = gl.getUniformLocation(program, "u_resolution");
        imageLocation = gl.getUniformLocation(program, "u_image");
        colorLocation = gl.getUniformLocation(program, "u_color");
        atlasSizeLocation = gl.getUniformLocation(program, "u_atlasSize");

        // 5. Create a Vertex Array Object (VAO) to store all attribute/buffer bindings
        vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        // 6. Create position buffer and register its layout inside the VAO
        positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(
            positionAttributeLocation, 
            2,          // 2 components (x, y) per vertex
            gl.FLOAT,   // Data type is 32-bit float
            false,      // Do not normalize
            0,          // Stride (0 = tightly packed)
            0           // Buffer offset
        );

        // 7. Create UV texture coordinate buffer and upload static coordinates once
        texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,
            0.0, 1.0,
            1.0, 0.0,
            1.0, 1.0,
        ]), gl.STATIC_DRAW);

        // Register the UV layout inside the VAO
        gl.enableVertexAttribArray(texCoordAttributeLocation);
        gl.vertexAttribPointer(
            texCoordAttributeLocation, 
            2,          // 2 components (u, v) per vertex
            gl.FLOAT,   // Data type is 32-bit float
            false,      // Do not normalize
            0,          // Stride
            0           // Buffer offset
        );

        // Done recording attribute setup into VAO
        gl.bindVertexArray(null);

        // 8. Create and configure GPU Texture parameters ONCE
        texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        return 1;
    }

    function flattenRenderTree(obj, parentX = 0, parentY = 0, parentZ = 0, list = []) {
        const adjustedX = parentX + obj.x;
        const adjustedY = parentY + obj.y;
        const adjustedZ = parentZ + (obj.renderZ ?? obj.z) + 1;

        list.push({ obj, adjustedX, adjustedY, adjustedZ });

        if (obj.getChildren && obj.getChildren().length > 0) {
            for (const child of obj.getChildren()) {
                flattenRenderTree(child, adjustedX, adjustedY, adjustedZ, list);
            }
        }
        return list;
    }

    export function renderScreenWebGL(planes, virtualHeight, virtualWidth) {
        if (!gl || !atlasLoaded) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (resizeCanvasToDisplaySize(gl.canvas, dpr)) {
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        }

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.useProgram(program);
        gl.bindVertexArray(vao);

        gl.uniform2f(resolutionLocation, virtualWidth, virtualHeight);
        gl.uniform2f(atlasSizeLocation, image.width, image.height);
        gl.uniform4f(colorLocation, 1.0, 1.0, 1.0, 1.0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(imageLocation, 0);

        const sortedPlanes = planes.slice().sort((a, b) => a.z - b.z);

        for (let plane of sortedPlanes) {
            plane.viewportStrategy(virtualWidth, virtualHeight);

            //flatten objects of plane
            const planeZ = plane.z * 10000;
            let adjustedObjects = [];
            for (let rootObj of plane.objects) {
                flattenRenderTree(rootObj, 0, 0, planeZ, adjustedObjects);
            }

            adjustedObjects.sort((a, b) => a.worldZ - b.worldZ);

            const scale = plane.scale;

            //render adjusted objects
            for (let { obj, adjustedX, adjustedY } of adjustedObjects) {
                if (!obj.textureSprite) continue;

                const textureSprite = obj.textureSprite;
                const atlasData = textureSprite.getAtlas();
                if (!atlasData) continue;

                const { minX, minY, maxX, maxY, atlasWidth, atlasHeight } = atlasData;
                const w = obj.width;
                const h = obj.height;

                // Apply plane offset and scale to computed world coordinates
                const canvasX = plane.x + (adjustedX * scale);
                const canvasY = plane.y + (adjustedY * scale);
                const canvasW = w * scale;
                const canvasH = h * scale;

                const currentSpriteIndex = obj.currentSpriteIndex || 0;
                const minU = (minX + (w * currentSpriteIndex)) / atlasWidth;
                const minV = minY / atlasHeight;
                const maxU = (minX + (w * (currentSpriteIndex + 1))) / atlasWidth;
                const maxV = maxY / atlasHeight;

                gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                    minU, minV,
                    maxU, minV,
                    minU, maxV,
                    minU, maxV,
                    maxU, minV,
                    maxU, maxV,
                ]), gl.DYNAMIC_DRAW);

                setRectangle(gl, positionBuffer, canvasX, canvasY, canvasW, canvasH);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
        }
    }

    var vertexShaderSource = `#version 300 es
        in vec2 a_position;
        in vec2 a_texCoord;

        uniform vec2 u_resolution;
        out vec2 v_texCoord;

        void main() {
            // Convert position from screen pixels to 0.0 -> 1.0 range
            vec2 zeroToOne = a_position / u_resolution;

            // Convert from 0.0 -> 1.0 to 0.0 -> 2.0
            vec2 zeroToTwo = zeroToOne * 2.0;

            // Convert from 0.0 -> 2.0 to -1.0 -> +1.0 (WebGL Clip Space)
            vec2 clipSpace = zeroToTwo - 1.0;

            // Invert Y axis so (0,0) sits at top-left corner
            gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

            // Pass UV coordinates to fragment shader
            v_texCoord = a_texCoord;
        }
    `;

    var fragmentShaderSource = `#version 300 es
        precision highp float;

        uniform sampler2D u_image;
        uniform vec4 u_color;
        uniform vec2 u_atlasSize;
        in vec2 v_texCoord;

        out vec4 outColor;

        vec2 getSubpixelUV(vec2 uv, vec2 textureSize) {
            // 1. Shift to texel-center space
            vec2 pixel = uv * textureSize - 0.5;
            
            // 2. Measure derivative (exactly 1 physical screen/canvas pixel wide)
            vec2 fw = fwidth(pixel);
            
            // 3. Keep interior flat and ramp only across the 1-pixel border
            vec2 subpixel = clamp((fract(pixel) - 0.5) / fw + 0.5, 0.0, 1.0);
            
            // 4. Shift back to normalized UV coordinates
            return (floor(pixel) + 0.5 + subpixel) / textureSize;
        }

        void main() {
            vec2 smoothUV = getSubpixelUV(v_texCoord, u_atlasSize);
            outColor = texture(u_image, smoothUV) * u_color;
        }
    `;

    function createShader(gl, type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (success) {
            return shader;
        }

        console.error('Shader Compile Error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return undefined;
    }

    function createProgram(gl, vertexShader, fragmentShader) {
        var program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        var success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (success) {
            return program;
        }

        console.error('Program Link Error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return undefined;
    }

    function resizeCanvasToDisplaySize(canvas, multiplier) {
        multiplier = multiplier || 1;
        const width  = canvas.clientWidth  * multiplier | 0;
        const height = canvas.clientHeight * multiplier | 0;
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width  = width;
            canvas.height = height;
            return true;
        }
        return false;
    }

    function setRectangle(gl, buffer, x, y, width, height) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        const x1 = x;
        const x2 = x + width;
        const y1 = y;
        const y2 = y + height;
        
        // Write quad vertex coordinates into the bound ARRAY_BUFFER
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
            x2, y1,
            x2, y2,
        ]), gl.DYNAMIC_DRAW);
    }

</script>