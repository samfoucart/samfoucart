/* Toggle between adding and removing the "responsive" class to topnav when the user clicks on the icon */
function topNavOverflow() {
    let topNav = document.getElementById("topNav");
    if (topNav.className === "nav-items") {
      topNav.className += " responsive";
    } else {
      topNav.className = "nav-items";
    }
}


// Almost All of this code comes from Gregg Tavares
// Gregg Tavares. "WebGL - Drawing Multiple Things." WebGL Fundamentals.
// https://webglfundamentals.org/webgl/lessons/webgl-drawing-multiple-things.html Accessed November 2020
function initializeRenderer() {
    let canvas = document.querySelector("#WebGL-canvas");
    let gl = canvas.getContext("webgl");
    if (!gl) {
        let ctx = canvas.getContext("2d");
        ctx.font = "30px Times New Roman";
        ctx.fillText("Browser Does Not Support WebGL", canvas.width / 2, canvas.height / 2)
        return;
    }

    let sphereBufferInfo = primitives.createSphereWithVertexColorsBufferInfo(gl, 10, 12, 6);
    let shapes = [
        sphereBufferInfo,
    ];

    let programInfo = webglUtils.createProgramInfo(gl, ["vertex-shader-3d", "fragment-shader-3d"]);

    let cameraAngleRadians = 0.0;
    let fieldOfViewRadians = Math.PI / 3;
    let cameraHeight = 50;

    // Uniforms for each object
    let sphereUniforms = {
        u_colorMult: [1, 1, .5, 1],
        u_matrix: m4.identity(),
    }
    let sphereTranslation = [0, 5, 60];

    let objectsToDraw = [
        {
            programInfo: programInfo,
            bufferInfo: sphereBufferInfo,
            uniforms: sphereUniforms,
        }
    ];

    function computeMatrix(viewProjectionMatrix, translation, xRotation, yRotation) {
        let matrix = m4.translate(viewProjectionMatrix, translation[0], translation[1], translation[2]);
        matrix = m4.xRotate(matrix, xRotation);
        return m4.yRotate(matrix, yRotation);
    }


    requestAnimationFrame(drawScene);

    function drawScene(time) {
        time *= 0.005;

        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        gl.clearColor(0, 0, 0, 0);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        let projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, .2, 2000);

        let cameraPosition = [0, 0, 100];
        let target = [0, 0, 0];
        let up = [0, 1, 0];
        let cameraMatrix = m4.lookAt(cameraPosition, target, up);

        let viewMatrix = m4.inverse(cameraMatrix);

        let viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

        let sphereXRotation = time;
        let sphereYRotation = time;

        sphereUniforms.u_matrix = computeMatrix(viewProjectionMatrix, sphereTranslation, sphereXRotation, sphereYRotation);

        objectsToDraw.forEach((object) => {
            let programInfo = object.programInfo;
            let bufferInfo = object.bufferInfo;

            gl.useProgram(programInfo.program);

            webglUtils.setBuffersAndAttributes(gl, programInfo, bufferInfo);

            webglUtils.setUniforms(programInfo, object.uniforms);

            gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
        });

        requestAnimationFrame(drawScene);
    }
}

// Citation
// wglb. "How to include shaders." Khronos Forums https://community.khronos.org/t/how-to-include-shaders/2591/3

initializeRenderer()