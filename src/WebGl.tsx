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
    let posLoc : number;

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
        varying vec2 v_uv;
        uniform float offset_x;
        uniform float offset_y;

        void main() {
            vec2 normalized = vertex_position / vec2(${WIDTH}, ${HEIGHT});
            vec2 clipSpace = normalized * 2.0 - 1.0;
            gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);
            v_uv = (vertex_position + vec2(offset_x, offset_y)) / vec2(${spriteSheetSize}, ${spriteSheetSize});
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

        posLoc = gl.getAttribLocation(program, "vertex_position");
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

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }, []);

    

    function spr(gl, program, n: number, x: number, y: number, width: number = 1, height: number = 1) {
        x = Math.floor(x);
        y = Math.floor(y);
        const x_sprite = n % (spriteNumber);
        const y_sprite = Math.floor(n / (spriteNumber));

        const vertices = rectangleToVertices(x,
                                             y,
                                             width * SPRITESIZE,
                                             height * SPRITESIZE);
                                            
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.vertexAttribPointer(
            posLoc,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(posLoc);
        const offsetXLoc = gl.getUniformLocation(program, "offset_x");
        const offsetYLoc = gl.getUniformLocation(program, "offset_y");
        console.log(x_sprite * SPRITESIZE - x)
        gl.uniform1f(offsetXLoc, x_sprite * SPRITESIZE - x);
        gl.uniform1f(offsetYLoc, y_sprite * SPRITESIZE - y);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function draw() {

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

            const radius = 50;
            const centerX = WIDTH / 2;
            const centerY = HEIGHT / 2;


            for (let i = 0; i < 320*180/8; i++) {
                const spriteIndex = 112 + i % 8;
                const xOffset = (i % 4) * SPRITESIZE;
                const yOffset = i / 4 * SPRITESIZE;
                const x = x_delta + i ;
                const y = i % 16 * SPRITESIZE;
                spr(gl, program, spriteIndex, x + xOffset, y);
            }
            draw();
            
            angle += 0.05;
            x_delta += 4;
            if (x_delta > 100) {
                x_delta = -100;
            }
        }, 1000 / 60);

        return () => clearInterval(interval);
    }, [program, gl]);


    return (
        <div>
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT}/>
        </div>
    );
}
    