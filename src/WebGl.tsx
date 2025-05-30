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
    const current_palette: Uint8Array = new Uint8Array(palette);
    let paletteTexture: WebGLTexture;

    useEffect(() => {
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        gl = createGLContext(canvas);

        //avoid that transparent pixels override the previous pixels
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // make the reading 1 byte to avoid skipping bytes
        // since the spritesheeet is a 128x128 and 128 is a multiple of 4
        // it won't skip any bytes
        // but if it's like 7x7
        // it'll read 4bytes then read 4 bytes again
        // but the last read byte won't be used
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);

        const arrayBuffer = arrayTable
        setTexture(gl, spriteSheetSize, spriteSheetSize, new Uint8Array(arrayBuffer), gl.LUMINANCE);

        // I couldn't use an vec3 for the color in the fragment shader because it doesn't allow dynamic indexing
        // it is why I use a 1D texture
        paletteTexture = setTexture(gl, 16, 1, new Uint8Array(palette), gl.RGBA, gl.TEXTURE1);
        const vertices = rectangleToVertices(0,0, 128, 128);
        // WARNING: the vertices are in pixel coordinates, not in normalized coordinates, I prefer to use pixel coordinates

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // since width and height are static in game, we can use them directly in the shader
        // since the sprite sheet is 128x128 and won't change in game
        
        const vertexShaderSource = `
            uniform vec2 screen_resolution;
            attribute vec2 vertex_position;
            attribute vec2 vertex_uv;
            varying vec2 v_uv;

            void main() {
                vec2 normalized = vertex_position / vec2(screen_resolution.x, screen_resolution.y);
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
                gl_FragColor = vec4(color.r, color.g, color.b, color.a);
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

        const screenResolutionLoc = gl.getUniformLocation(program, "screen_resolution");
        gl.uniform2f(screenResolutionLoc, WIDTH, HEIGHT);

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }, []);

    function setColor(palette: Uint8Array, index: number, index2: number) {
        current_palette[index * 4 ] = palette[index2 * 4];
        current_palette[index * 4 + 1] = palette[index2 * 4 + 1];
        current_palette[index * 4 + 2] = palette[index2 * 4 + 2];

        applyPalette(current_palette);
    }

    function applyPalette(palette : Uint8Array) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,0,
            palette.length / 4, 1,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            palette
        );
        draw();
    }


    function resetColor() {
        applyPalette(palette);
    }

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
    }

    function draw() {
        if (batchedVertices.length === 0) return;
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
        let flip = 0;
        gl.clearColor(0.2, 0.2, 0.2, 1);
        const interval = setInterval(() => {
            // setColor(palette, (0+x_delta)%16, (1+x_delta)%16);
            gl.clear(gl.COLOR_BUFFER_BIT);
            


            for (let i = 0; i < 50000; i++) {
                const spriteIndex = 112 + i % 13;
                const xOffset = (i % 4);
                const x = -20 + (i/7) + Math.sin(angle) * 10;
                const y = i % 22 * SPRITESIZE + Math.cos(angle + 0.02 + i) * 10;
                // if (i % 32 == x_delta % 32) {
                //     setColor(palette, 7, 1);
                // }
                // if (i % 32 == (x_delta + 16) % 32) {
                //     resetColor();
                // }
                spr(gl, program, spriteIndex, x + xOffset, y, 1, 1, flip, flip);
            }
            
            angle += 0.15;
            if (angle > 2 * Math.PI) {
                angle = 0;
                flip = flip ? 0 : 1;
            }
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
    