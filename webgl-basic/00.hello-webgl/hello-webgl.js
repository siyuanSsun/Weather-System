function main() {
    const holder = document.querySelector("#hello-webgl");
    const canvas = document.createElement('canvas');
    holder.appendChild(canvas);
    canvas.width = 720;
    canvas.height = 540;
    const gl = canvas.getContext("webgl");

    if (!gl) {
        alert("Fail to create webgl context.");
        return;
    }

    // vertex shader source
    const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec4 aVertexColor;

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;

        varying lowp vec4 vColor;

        void main() {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            vColor = aVertexColor;
        }
    `;

    // fragment shader source
    const fsSource = `
        varying lowp vec4 vColor;
        void main() {
            gl_FragColor = vColor;
        }
    `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const paraInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor')
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix')
        }
    }


    const buffers = initBuffer(gl);
    drawScene(gl, paraInfo, buffers);
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        alert("Fail to compile shader. " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null
    }

    console.log("ok");

    return shader;
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Fail to link shader program. " + gl.getProgramInfoLog(shaderProgram));
        gl.deleteProgram(shaderProgram);
        return null;
    }

    return shaderProgram;

}

function initBuffer(gl) {
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);

    const positions = [
        -1.0,  1.0,
         1.0,  1.0,
        -1.0, -1.0,
         1.0, -1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);


    const colors = [
        1.0, 1.0, 1.0, 1.0,
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0
    ];
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);



    return {
        position: posBuffer,
        color: colorBuffer
    }
    
}

function drawScene(gl, paraInfo, buffers) {

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    const fov = Math.PI / 4;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, 
                    fov,
                    aspect,
                    zNear,
                    zFar);
    const modelViewMatrix = mat4.create();

    mat4.translate(modelViewMatrix, 
                   modelViewMatrix,
                   [-0.0, 0.0, -6.0]);
    
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(paraInfo.attribLocations.vertexPosition,
                           2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(paraInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(paraInfo.attribLocations.vertexColor,
                           4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(paraInfo.attribLocations.vertexColor);

    gl.useProgram(paraInfo.program);
    
    gl.uniformMatrix4fv(paraInfo.uniformLocations.projectionMatrix,
                        false,
                        projectionMatrix);
    
    gl.uniformMatrix4fv(paraInfo.uniformLocations.modelViewMatrix, 
                        false,
                        modelViewMatrix);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
}



main();