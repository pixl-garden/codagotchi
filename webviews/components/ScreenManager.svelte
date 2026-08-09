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

        // Disable mipmapping and repeat-wrapping for crisp pixel art rendering
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        return 1;
    }

    export function renderScreenWebGL(webglContext, screenWidth, sprites) {
        // Exit early if WebGL is uninitialized or the texture atlas image has not loaded
        if (!gl || !atlasLoaded) {
            return;
        }

        // Adjust canvas resolution to match display size
        resizeCanvasToDisplaySize(gl.canvas);

        // Match WebGL viewport to physical canvas dimensions
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Clear previous frame
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Activate the shader program and bind the VAO state
        gl.useProgram(program);
        gl.bindVertexArray(vao);

        // Bind texture atlas to Texture Unit 0 and tell shader to sample from Unit 0
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(imageLocation, 0);

        // Update resolution uniform so shader can convert pixels to clip-space
        gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

        // Bind position buffer and write updated rectangle vertex coordinates
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        setRectangle(gl, 0, 0, image.width, image.height);

        // Issue draw call (6 vertices forming 2 triangles)
        var primitiveType = gl.TRIANGLES;
        let offset = 0;
        var count = 6;
        gl.drawArrays(primitiveType, offset, count);

        // Clean up state
        gl.bindVertexArray(null);
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
        in vec2 v_texCoord;

        out vec4 outColor;

        void main() {
            // Sample pixel color from texture at interpolated UV coordinate
            outColor = texture(u_image, v_texCoord);
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

    function setRectangle(gl, x, y, width, height) {
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