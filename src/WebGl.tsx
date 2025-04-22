import { useEffect, useRef } from "react";
import './App.css'

export default function WebGLCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const WIDTH = 128;
    const HEIGHT = 128;
    const pallette = [
        { name: "black", hex: "#000000" },
        { name: "dark-blue", hex: "#1D2B53" },
        { name: "dark-purple", hex: "#7E2553" },
        { name: "dark-green", hex: "#008751" },
        { name: "brown", hex: "#AB5236" },
        { name: "dark-grey", hex: "#5F574F" },
        { name: "light-grey", hex: "#C2C3C7" },
        { name: "white", hex: "#FFF1E8" },
        { name: "red", hex: "#FF004D" },
        { name: "orange", hex: "#FFA300" },
        { name: "yellow", hex: "#FFEC27" },
        { name: "green", hex: "#00E436" },
        { name: "blue", hex: "#29ADFF" },
        { name: "lavender", hex: "#83769C" },
        { name: "pink", hex: "#FF77A8" },
        { name: "peach", hex: "#FFCCAA" },
    ]

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext("webgl2");
        if (!gl) {
            console.error("WebGL not supported");
            return;
        }
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); // comme je suis en RGB, ça sera probablement
        // pas un multiple de 4 mais de 3 obligatoirement, sauf si je fait un array de 4 par 4 

        function createColorRect(width, height, r, g, b) {
            const data = new Uint8Array(width * height * 3);
        
            for (let i = 0; i < width * height; i++) {
                const offset = i * 3;
                const n = 10 * Math.floor(i/10)* 10
                data[offset] = (r + n) % 256;
                data[offset + 1] = (g + n) % 256;
                data[offset + 2] = (b + n) % 256;
            }
        
            return data;
        }
        const spriteSize = 126;

        const arrayBuffer = createColorRect(spriteSize, spriteSize, 100, 0, 100);
    
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGB,
            spriteSize,
            spriteSize,
            0,
            gl.RGB,
            gl.UNSIGNED_BYTE,
            new Uint8Array(arrayBuffer)
        );

        function rectangleToVertices(x, y, width, height) {
            return new Float32Array([
                x, y,
                x + width, y,
                x, y + height,
                x, y + height,
                x + width, y,
                x + width, y + height
            ]);
        }

        const vertices = rectangleToVertices(0,0, 8, 8);
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        const offset_x = 0; // to take a specific sprite
        const offset_y = 0; // to take a specific sprite
    
        const vertexShaderSource = `
        attribute vec2 a_position;
        varying vec2 v_uv;

        void main() {
            vec2 normalized = a_position / vec2(${WIDTH}, ${HEIGHT});
            vec2 clipSpace = normalized * 2.0 - 1.0;
            gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);
            v_uv = (a_position + vec2(${offset_x}, ${offset_y}) ) / vec2(${spriteSize}, ${spriteSize});
        }
        `;

        const fragmentShaderSource = `
        precision mediump float;
        uniform sampler2D u_texture;
        varying vec2 v_uv;
        
        void main() {
            gl_FragColor = texture2D(u_texture, v_uv);
        }`;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        if (!vertexShader) {
            console.error("Failed to create vertex shader");
            return;
        }
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (!fragmentShader) {
            console.error("Failed to create fragment shader");
            return;
        }
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);
        const program = gl.createProgram();
        if (!program) {
            console.error("Failed to create program");
            return;
        }
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error("Vertex shader compilation error:", gl.getShaderInfoLog(vertexShader));
            return;
        }

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error("Fragment shader compilation error:", gl.getShaderInfoLog(fragmentShader));
            return;
        }

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program linking error:", gl.getProgramInfoLog(program));
            return;
        }

        const posLoc = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(
            posLoc,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );

        const texLoc = gl.getUniformLocation(program, "u_texture");
        gl.uniform1i(texLoc, 0);

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }, []);

    return (
        <div>
            <canvas ref={canvasRef} width={128} height={128}/>
        </div>
    );
}
    