export function createGLContext(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        throw new Error("WebGL not supported");
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    return gl;
}

export function setTexture(gl : WebGLRenderingContext, 
                    width : number, 
                    height : number, 
                    data : Uint8Array,
                    format : GLenum = gl.RGBA,
                    activeTexture: GLenum = gl.TEXTURE0,
                    octetPerData: number = 0
                ) {
    const texture = gl.createTexture();
    gl.activeTexture(activeTexture);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, octetPerData);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        format,
        width,
        height,
        0,
        format,
        gl.UNSIGNED_BYTE,
        data
    );
}

export function rectangleToVertices(x: number, y: number, width: number, height: number) {
    return new Float32Array([
        x, y,
        x + width, y,
        x, y + height,
        x, y + height,
        x + width, y,
        x + width, y + height
    ]);
}

export function setShader(gl: WebGLRenderingContext, source: string, type: GLenum) {
    const vertexShader = gl.createShader(type);
    if (!vertexShader) {
        throw new Error("Failed to create vertex shader");
    }
    gl.shaderSource(vertexShader, source);
    gl.compileShader(vertexShader);

    const success = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);
    if (!success) {
        const log = gl.getShaderInfoLog(vertexShader);
        gl.deleteShader(vertexShader);
        throw new Error(`Vertex shader compilation failed: ${log}`);
    }

    return vertexShader;
}

export function setProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    const program = gl.createProgram();
    if (!program) {
        throw new Error("Failed to create program");
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        const log = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`Program linking failed: ${log}`);
    }

    return program;
}