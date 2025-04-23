import { useEffect, useRef } from "react";
import './App.css'
import { arrayTable, palette } from "./Spritesheet";
import { createGLContext, setShader, rectangleToVertices, setTexture, setProgram } from "./webGLUtils";

export default function WebGLCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const WIDTH = 320;
    const HEIGHT = 180;

    useEffect(() => {
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = createGLContext(canvas);

        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        const spriteSheet = 128;

        const arrayBuffer = arrayTable
        setTexture(gl, spriteSheet, spriteSheet, new Uint8Array(arrayBuffer), gl.LUMINANCE);

        // I couldn't use an vec3 for the color in the fragment shader because it doesn't allow dynamic indexing
        // it is why I use a 1D texture
        setTexture(gl, 16, 1, new Uint8Array(palette), gl.RGB, gl.TEXTURE1);
        const vertices = rectangleToVertices(0,0, 128, 128);
        // WARNING: the vertices are in pixel coordinates, not in normalized coordinates, I prefer to use pixel coordinates

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);


        // since width and height are static in game, we can use them directly in the shader
        // since the sprite sheet is 128x128 and won't change in game
        
        const vertexShaderSource = `
        attribute vec2 vertex_position;
        varying vec2 v_uv;
        uniform int offset_x;
        uniform int offset_y;

        void main() {
            vec2 normalized = vertex_position / vec2(${WIDTH}, ${HEIGHT});
            vec2 clipSpace = normalized * 2.0 - 1.0;
            gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);
            v_uv = (vertex_position + vec2(offset_x, offset_y)) / vec2(${spriteSheet}, ${spriteSheet});
        }
        `;

        const fragmentShaderSource = `
        precision mediump float;
        uniform sampler2D u_paletteTex;
        uniform sampler2D u_texture;
        varying vec2 v_uv;
        
        void main() {
            int index = int(texture2D(u_texture, v_uv).r * 255.0 + 0.5);
            vec2 uv = vec2(float(index) / 15.0, 0.0);
            vec4 color = texture2D(u_paletteTex, uv);
            gl_FragColor = vec4(color.r, color.g, color.b, 1.0);
        }`;

        // const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        // if (!vertexShader) {
        //     console.error("Failed to create vertex shader");
        //     return;
        // }
        // gl.shaderSource(vertexShader, vertexShaderSource);
        // gl.compileShader(vertexShader);

        const vertexShader = setShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
        if (!vertexShader) {
            console.error("Failed to create vertex shader");
            return;
        }
        

        // const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        // if (!fragmentShader) {
        //     console.error("Failed to create fragment shader");
        //     return;
        // }
        // gl.shaderSource(fragmentShader, fragmentShaderSource);
        // gl.compileShader(fragmentShader);

        const fragmentShader = setShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

        // const program = gl.createProgram();
        // if (!program) {
        //     console.error("Failed to create program");
        //     return;
        // }
        // gl.attachShader(program, vertexShader);
        // gl.attachShader(program, fragmentShader);
        // gl.linkProgram(program);
        // gl.useProgram(program);
        const program = setProgram(gl, vertexShader, fragmentShader);

        const posLoc = gl.getAttribLocation(program, "vertex_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(
            posLoc,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );

        const paletteTexLoc = gl.getUniformLocation(program, "u_paletteTex");
        gl.uniform1i(paletteTexLoc, 1);

        const texLoc = gl.getUniformLocation(program, "u_texture");
        gl.uniform1i(texLoc, 0);


        const offset_x = 0; // to take a specific sprite
        const offset_y = 0; // to take a specific sprite
        const offsetXLoc = gl.getUniformLocation(program, "offset_x");
        const offsetYLoc = gl.getUniformLocation(program, "offset_y");
        gl.uniform1f(offsetXLoc, offset_x);
        gl.uniform1f(offsetYLoc, offset_y);

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }, []);

    return (
        <div>
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT}/>
        </div>
    );
}
    