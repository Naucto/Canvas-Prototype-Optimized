import { useEffect, useRef } from "react";


export default function WebGLCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
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

        const pixelData = new Uint8Array([
            255, 0,   0,  
            0,   255, 0, 
            0,   0,   255,  
          
            255, 255, 0,
            255, 0,   255,
            0,   255, 255,
          
            255, 255, 255,
            128, 128, 128,
            0,   0,   0,
        ])
    

        const triangleVertices = new Float32Array([
            -0.5, -0.5,
             0.5, -0.5,
             0.0,  0.5,
        ]);

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);

        const vertexShaderSource = `#version 300 es
        precision mediump float;

        in vec2 vertexPosition;

        void main() {
            gl_Position = vec4(vertexPosition, 0.0, 1.0);
        }`;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        if (!vertexShader) {
            console.error("Failed to create vertex shader");
            return;
        }
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        const fragmentShaderSource = `#version 300 es
        precision mediump float;

        out vec4 outputCol;

        void main() {
            outputCol = vec4(1.0, 0.0, 0.0, 1.0);
        }`;

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (!fragmentShader) {
            console.error("Failed to create fragment shader");
            return;
        }
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error("Fragment shader compilation error:", gl.getShaderInfoLog(fragmentShader));
            return;
        }

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error("Failed to link program:", gl.getProgramInfoLog(shaderProgram));
            return;
        }
        

        // permet d'avoir l'endroit où se trouve vertexPosition (index 0)
        const positionAttributeLocation = gl.getAttribLocation(shaderProgram, "vertexPosition");

        //output merger this is used to have the same size as client
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        gl.clearColor(0.65, 0.0, 0.25, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        //pour savoir ou rasteriser
        gl.viewport(0, 0, canvas.width, canvas.height); // focus seulement sur la zone de dessin

        //program permet de dire quel programme utiliser et quel attribut utiliser
        gl.useProgram(shaderProgram);
        gl.enableVertexAttribArray(positionAttributeLocation);

        //input assembler
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); // call qu'on compte utiliser ça
        gl.vertexAttribPointer(
            positionAttributeLocation, // index
            2, // size
            gl.FLOAT, // type dans le buffer
            false, // pas normalisé -> 127 deviendra pas 1
            0, // stride dit l'espace entre chaque position (0, devine le en faisant size * typeof(type))
            // sinon on écrit 2 * Float32Array.BYTES_PER_ELEMENT

            0, // offset dis combien de byte on skip
        ); 

        gl.drawArrays(gl.TRIANGLES, 0, 3); // draw call

    }, []);

    return (
        <div>
            <canvas ref={canvasRef} width={320} height={180}/>
        </div>
    );
}
    