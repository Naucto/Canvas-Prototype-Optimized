import { useEffect, useRef } from "react";
import './App.css'
import { arrayTable, palette } from "./Spritesheet";
import { createGLContext, setShader, rectangleToVertices, setTexture, setProgram } from "./webGLUtils";

export default function WebGLCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const WIDTH = 320;
    const HEIGHT = 180;
    const SPRITESIZE = 8;
    const spriteSheetSize = 128;
    const spriteNumber = spriteSheetSize / SPRITESIZE;
    let gl : WebGL2RenderingContext;
    let program : WebGLProgram;
    let uvLoc : number;
    let batchedVertices : number[] = [];
    let batchedUVs : number[] = [];
    let batchedFlips : number[] = [];


    useEffect(() => {
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        gl = createGLContext(canvas);

        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

        const arrayBuffer = arrayTable
        setTexture(gl, spriteSheetSize, spriteSheetSize, new Uint8Array(arrayBuffer), gl.LUMINANCE);

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
            attribute vec2 vertex_uv;
            varying vec2 v_uv;

            void main() {
                vec2 normalized = vertex_position / vec2(${WIDTH}.0, ${HEIGHT}.0);
                vec2 clipSpace = normalized * 2.0 - 1.0;
                gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);
                v_uv = vertex_uv;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            uniform sampler2D u_paletteTex;
            uniform sampler2D u_texture;
            varying vec2 v_uv;
            
            void main() {
                int index = int(texture2D(u_texture, v_uv).r * 255.0 + 0.5);
                vec2 uv = vec2(float(index) / 16.0, 0.0); // pallete is 16 don't forget to change
                vec4 color = texture2D(u_paletteTex, uv);
                gl_FragColor = vec4(color.r, color.g, color.b, 1.0);
            }`;

        const vertexShader = setShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
        if (!vertexShader) {
            console.error("Failed to create vertex shader");
            return;
        }

        const fragmentShader = setShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

        program = setProgram(gl, vertexShader, fragmentShader);

        uvLoc = gl.getAttribLocation(program, "vertex_uv");
        gl.enableVertexAttribArray(uvLoc);
        gl.vertexAttribPointer(
            uvLoc,
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

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }, []);

    

    function spr(gl, program, n: number, x: number, y: number, width: number = 1, height: number = 1, flip_h: number = 0, flip_v: number = 0) {
        x = Math.floor(x);
        y = Math.floor(y);
        flip_h = flip_h ? 1 : 0;
        flip_v = flip_v ? 1 : 0;
        
        const x_sprite = n % (spriteNumber);
        const y_sprite = Math.floor(n / (spriteNumber));

        let u0 = x_sprite * SPRITESIZE / spriteSheetSize;
        let v0 = y_sprite * SPRITESIZE / spriteSheetSize;
        let u1 = (x_sprite + width) * SPRITESIZE / spriteSheetSize;
        let v1 = (y_sprite + height) * SPRITESIZE / spriteSheetSize;
        
        if (flip_h) [u0, u1] = [u1, u0];
        if (flip_v) [v0, v1] = [v1, v0];
        
        const uv = new Float32Array([
            u0, v0,
            u1, v0,
            u0, v1,
            u0, v1,
            u1, v0,
            u1, v1,
        ]);

        const vertices = rectangleToVertices(
            x,
            y,
            width * SPRITESIZE,
            height * SPRITESIZE
        );

        // gl.drawArrays(gl.TRIANGLES, 0, 6);
        batchedVertices.push(...vertices);
        batchedUVs.push(...uv);
        for (let i = 0; i < 6; i++) {
            batchedFlips.push(flip_h, flip_v);
        }
    }

    function draw() {
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(batchedVertices), gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(program, "vertex_position");
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);

        const uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(batchedUVs), gl.STATIC_DRAW);
        gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(uvLoc);

        const flipBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, flipBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(batchedFlips), gl.STATIC_DRAW);

        const flipLoc = gl.getAttribLocation(program, "flip");
        gl.vertexAttribPointer(flipLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(flipLoc);

        gl.drawArrays(gl.TRIANGLES, 0, batchedVertices.length / 2);
        
        batchedVertices = [];
        batchedUVs = [];
    }

    useEffect(() => {
        if (!canvasRef.current) return;
        if (!gl) return;
        if (!program) return;
        let angle = 0;
        let x_delta = 0;
        gl.clearColor(0, 0, 0, 1);
        const interval = setInterval(() => {
            gl.clear(gl.COLOR_BUFFER_BIT);



            for (let i = 0; i < 1; i++) {
                const spriteIndex = 119 + i % 8;
                const xOffset = (i % 4);
                const x = x_delta + i ;
                const y = i % 22 * SPRITESIZE;
                spr(gl, program, spriteIndex, x + xOffset, y, 1, 1, 1, 0);
            }
            
            angle += 0.05;
            x_delta += 1;
            if (x_delta > 300) {
                x_delta = -100;
            }
            draw();
        }, 1000 / 60);

        return () => clearInterval(interval);
    }, [program, gl]);


    return (
        <div>
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT}/>
        </div>
    );
}
    