
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
    let initialDistribution = generateInitialDistributionDebug();
    let numCoefficients = 100;
    let fourierSeriesCoefficients = calculateFourierSeriesCoefficients(initialDistribution, numCoefficients);
    let numDivisions = 100;
    let meshPoints = generateMesh(initialDistribution, fourierSeriesCoefficients, numDivisions);
    //let meshPoints = generatePointsDebug(initialDistribution, numDivisions);
    let meshIndices = triangulateMesh(meshPoints, numDivisions);
    let arrays = {
        position: {numComponents: 3, data: meshPoints},
        indices: {numComponents: 3, data: meshIndices},
    }
    let meshBufferInfo = webglUtils.createBufferInfoFromArrays(gl, arrays);

    let gridIndices = generateGridIndices(meshPoints, numDivisions);
    //arrays.indices = {numComponents: 3, data:gridIndices};
    arrays = {
        position: {numComponents: 3, data: meshPoints},
        indices: {numComponents: 3, data: gridIndices},
    }
    let gridBufferInfo = webglUtils.createBufferInfoFromArrays(gl, arrays);

    let shapes = [
        sphereBufferInfo,
        meshBufferInfo,
    ];

    let sphereProgramInfo = webglUtils.createProgramInfo(gl, [sphereVertexShader, sphereFragmentShader]);
    let meshProgramInfo = webglUtils.createProgramInfo(gl, [meshVertexShader, meshFragmentShader]);
    let gridProgramInfo = webglUtils.createProgramInfo(gl, [meshVertexShader, meshFragmentShader]);

    let cameraAngleRadians = 0.0;
    let fieldOfViewRadians = Math.PI / 3;
    let cameraHeight = 50;

    // Uniforms for each object
    let sphereUniforms = {
        u_colorMult: [1, 1, .5, 1],
        u_matrix: m4.identity(),
    }

    let meshUniforms = {
        u_colorMult: [1, 1, 1, 1],
        u_matrix: m4.identity(),
    }

    let gridUniforms = {
        u_colorMult: [.25, .25, .25, 1],
        u_matrix: m4.identity(),
    }
    let sphereTranslation = [0, 5, 60];

    let objectsToDraw = [
        {
            programInfo: sphereProgramInfo,
            bufferInfo: sphereBufferInfo,
            uniforms: sphereUniforms,
            primitive: gl.LINE_STRIP,
        },
        {
            programInfo: meshProgramInfo,
            bufferInfo: meshBufferInfo,
            uniforms: meshUniforms,
        },
        {
            programInfo: gridProgramInfo,
            bufferInfo: gridBufferInfo,
            uniforms: gridUniforms,
            primitive: gl.LINES,
        }
    ];

    function computeMatrix(viewProjectionMatrix, translation, xRotation, yRotation) {
        let matrix = m4.translate(viewProjectionMatrix, translation[0], translation[1], translation[2]);
        matrix = m4.xRotate(matrix, xRotation);
        return m4.yRotate(matrix, yRotation);
    }


    requestAnimationFrame(drawScene);

    let worldMatrix = m4.identity();
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

        let cameraPosition = [0, 0, 2];
        let target = [0, 0, 0];
        let up = [0, 1, 0];
        let cameraMatrix = m4.lookAt(cameraPosition, target, up);

        let viewMatrix = m4.inverse(cameraMatrix);
        //viewMatrix = m4.multiply(viewMatrix, worldMatrix);
        let viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

        let sphereXRotation = 0;
        let sphereYRotation = 0;

        let sphereMatrix = m4.multiply(viewProjectionMatrix, worldMatrix);
        //sphereMatrix = m4.scale(sphereMatrix, 1)
        //sphereMatrix = m4.multiply()
        sphereUniforms.u_matrix = sphereMatrix;
        meshUniforms.u_matrix = sphereMatrix;
        gridUniforms.u_matrix = sphereMatrix;

        objectsToDraw.forEach((object) => {
            let programInfo = object.programInfo;
            let bufferInfo = object.bufferInfo;

            gl.useProgram(programInfo.program);

            webglUtils.setBuffersAndAttributes(gl, programInfo, bufferInfo);

            webglUtils.setUniforms(programInfo, object.uniforms);


            let primitive;
            if (object.primitive) {
                primitive = object.primitive;
            } else {
                primitive = gl.TRIANGLES;
            }
            if (object.bufferInfo.indices) {
                gl.drawElements(primitive, object.bufferInfo.numElements, gl.UNSIGNED_SHORT, 0);
            } else {
                gl.drawArrays(primitive, 0, object.bufferInfo.numElements);
            }

        });

        requestAnimationFrame(drawScene);
    }

    let lastPos;
    let moving;
    function startRotateCamera(e) {
        lastPos = getRelativeMousePosition(gl.canvas, e);
        moving = true;
        console.log("Mouse Down");
    }

    function rotateCamera(e) {
        if (moving) {
            const pos = getRelativeMousePosition(gl.canvas, e);
            const size = [4 / gl.canvas.width, 4 / gl.canvas.height];
            const delta = v2.mult(v2.sub(lastPos, pos), size);

            worldMatrix = m4.multiply(m4.xRotation(delta[1] * 5), worldMatrix);
            worldMatrix = m4.multiply(m4.yRotation(delta[0] * 5), worldMatrix);

            lastPos = pos;
        }
    }

    function stopRotateCamera(e) {
        moving = false;
    }

    function getRelativeMousePosition(canvas, e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width;
        const y = (e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height;
        return [
            (x - canvas.width / 2) / window.devicePixelRatio,
            (y - canvas.height / 2) / window.devicePixelRatio,
        ];
    }

    /* eslint brace-style: 0 */
    gl.canvas.addEventListener('mousedown', (e) => { e.preventDefault(); startRotateCamera(e); });
    window.addEventListener('mouseup', stopRotateCamera);
    window.addEventListener('mousemove', rotateCamera);
    gl.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startRotateCamera(e.touches[0]); });
    window.addEventListener('touchend', (e) => { stopRotateCamera(e.touches[0]); });
    window.addEventListener('touchmove', (e) => { rotateCamera(e.touches[0]); });
}


const v2 = (function() {
    // adds 1 or more v2s
    function add(a, ...args) {
        const n = a.slice();
        [...args].forEach(p => {
            n[0] += p[0];
            n[1] += p[1];
        });
        return n;
    }

    function sub(a, ...args) {
        const n = a.slice();
        [...args].forEach(p => {
            n[0] -= p[0];
            n[1] -= p[1];
        });
        return n;
    }

    function mult(a, s) {
        if (Array.isArray(s)) {
            let t = s;
            s = a;
            a = t;
        }
        if (Array.isArray(s)) {
            return [
                a[0] * s[0],
                a[1] * s[1],
            ];
        } else {
            return [a[0] * s, a[1] * s];
        }
    }

    function lerp(a, b, t) {
        return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
        ];
    }

    function min(a, b) {
        return [
            Math.min(a[0], b[0]),
            Math.min(a[1], b[1]),
        ];
    }

    function max(a, b) {
        return [
            Math.max(a[0], b[0]),
            Math.max(a[1], b[1]),
        ];
    }

    // compute the distance squared between a and b
    function distanceSq(a, b) {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        return dx * dx + dy * dy;
    }

    // compute the distance between a and b
    function distance(a, b) {
        return Math.sqrt(distanceSq(a, b));
    }

    // compute the distance squared from p to the line segment
    // formed by v and w
    function distanceToSegmentSq(p, v, w) {
        const l2 = distanceSq(v, w);
        if (l2 === 0) {
            return distanceSq(p, v);
        }
        let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
        t = Math.max(0, Math.min(1, t));
        return distanceSq(p, lerp(v, w, t));
    }

    // compute the distance from p to the line segment
    // formed by v and w
    function distanceToSegment(p, v, w) {
        return Math.sqrt(distanceToSegmentSq(p, v, w));
    }

    return {
        add: add,
        sub: sub,
        max: max,
        min: min,
        mult: mult,
        lerp: lerp,
        distance: distance,
        distanceSq: distanceSq,
        distanceToSegment: distanceToSegment,
        distanceToSegmentSq: distanceToSegmentSq,
    };
}());


function generatePointsDebug(initialDistribution, numDivisions) {
    let vertices = [];
    for (let x = 0; x < numDivisions; ++x) {
        let normX = x / numDivisions;
        for (let t = 0; t < numDivisions; ++t) {
            let normT = t / numDivisions;
            vertices.push(normX - .5);
            vertices.push(Math.cos(Math.PI * 4 * normX) * Math.exp(- (Math.pow(Math.PI, 2)) * normT / 1.5));
            vertices.push(normT - .5);
        }
    }
    return vertices;
}

function generateMesh(initialDistribution, fourierSeriesCoefficients, numDivisions, diffusivity = .6) {
    let vertices = [];
    for (let x = 0; x < numDivisions; ++x) {
        let normX = x / numDivisions;
        for (let t = 0; t < numDivisions; ++t) {
            let normT = t / numDivisions;
            vertices.push(normX - .5);
            let partialSum = fourierSeriesCoefficients[0];
            for (let n = 1; n < fourierSeriesCoefficients.length; ++n) {
                let lambda = (n * Math.PI);
                let a = fourierSeriesCoefficients[n];
                let k = diffusivity;
                partialSum += a * Math.cos(lambda * normX) * Math.exp(-lambda * lambda * k * normT);
            }
            vertices.push(partialSum / initialDistribution.length);
            vertices.push(normT - .5);
        }
    }
    return vertices;
}

function generateInitialDistributionDebug(numPoints = 100) {
    let initialDistribution = [];
    for (let i = 0; i < numPoints; ++i) {
        let normI = i / numPoints;
        let lessThanHalf = normI <= .5;
        initialDistribution.push(lessThanHalf);
    }
    return initialDistribution;
}

function calculateFourierSeriesCoefficients(initialDistribution, numCoefficients) {
    let coefficients = [];

    let average = 0;
    for (let i = 0; i < initialDistribution.length; ++i) {
        average += initialDistribution[i];
    }
    coefficients.push(average / initialDistribution.length);

    for (let n = 1; n < numCoefficients; ++n) {
        let sum = 0;
        for (let i = 0; i < initialDistribution.length; ++i) {
            sum += initialDistribution[i] * Math.cos(n * Math.PI * i / initialDistribution.length);
        }
        coefficients.push(2 * sum);
    }
    return coefficients;
}

function triangulateMesh(dataVertices, numDivisions) {
    if ((dataVertices.length < 6) || ((dataVertices.length % 3) !== 0)) {
        return;
    }
    let indices = [];
    for (let x = 0; x < numDivisions - 1; ++x) {
        for (let t = 0; t < numDivisions - 1; ++t) {
            // Note: for the surface to be visible on both sides, we require a triangle on each side of the surface
            // Triangle 1
            indices.push((numDivisions * x) + (t));
            indices.push((numDivisions * (x + 1)) + (t + 1));
            indices.push((numDivisions * x) + (t + 1));

            // Triangle 2
            indices.push((numDivisions * x) + (t));
            indices.push((numDivisions * (x + 1)) + t);
            indices.push((numDivisions * (x + 1)) + (t + 1));

            // Triangle 3
            indices.push((numDivisions * x) + (t));
            indices.push((numDivisions * x) + (t + 1));
            indices.push((numDivisions * (x + 1)) + (t + 1));

            // Triangle 4
            indices.push((numDivisions * x) + (t));
            indices.push((numDivisions * (x + 1)) + (t + 1));
            indices.push((numDivisions * (x + 1)) + t);

        }
    }
    return indices;
}

function generateNormals(dataVertices, numDivisions) {
    function cross(vec1, vec2) {
        return [(vec1[1] * vec2[2]) - (vec1[2] * vec1[1]),
            (vec1[2] * vec2[0]) - (vec1[0] * vec1[2]),
            (vec1[0] * vec2[1]) - (vec1[1] * vec1[0])]
    }
    let normals = [];
    for (let x = 0; x < numDivisions - 1; ++x) {
        let normX = x / numDivisions;
        for (let t = 0; t < numDivisions - 1; ++x) {
            let normT = t / numDivisions;
            // First height
            let value0 = dataVertices[(numDivisions * x) + (t)];
            // height forwards
            let value1 = dataVertices[(numDivisions * (x + 1)) + (t)];
            // height left
            let value2 = dataVertices[(numDivisions * x) + (t) + 1];

            let partialX = [1, value1 - value0, 0];
            let partialT = [0, value2 - value0, 1];
            let crossProduct = cross(partialX, partialT);
            normals.push(crossProduct[0], crossProduct[1], crossProduct[2]);
        }
    }
    return normals;
}

function generateGridIndices(dataVertices, numDivisions) {
    let indices = [];
    for (let x = 0; x < numDivisions - 1; ++x) {
        for (let t = 0; t < numDivisions - 1; ++t) {
            indices.push((numDivisions * x) + (t));
            indices.push((numDivisions * (x + 1)) + (t));

            indices.push((numDivisions * x) + (t));
            indices.push((numDivisions * x) + (t + 1));
        }
    }
    return indices;
}

const fragmentPassThrough = `
    precision mediump float;
    
    void main () {
        gl_FragColor = vec4(.5, 0, .5, 1);
    }
`;

const vertexPassThrough = `
    attribute vec4 a_position;

    void main() {
        gl_Position = a_position;
    }
`;

const meshFragmentShader = `
    precision mediump float;
    
    varying vec4 v_color;
    
    uniform vec4 u_colorMult;
    void main () {
        gl_FragColor = v_color * u_colorMult;
    }
`;

const meshVertexShader = `
    attribute vec4 a_position;

    uniform mat4 u_matrix;
    
    varying vec4 v_color;

    vec3 lerpRedToBlue(float amount) {
        vec3 red = vec3(.6, 0.0, 0.1);
        vec3 blue = vec3(0.1, 0.1, .6);
        vec3 intermediate = (amount * red) + ((1.0 - amount) * blue);
        return intermediate;
    }
    
    vec3 quadraticInterpolation(vec3 start, vec3 end, vec3 control, float amount) {
        vec3 left = mix(start, control, amount);
        vec3 right = mix(control, end, amount);
        return mix(left, right, amount);
    }
        
    void main() {
        // Multiply the position by the matrix.
        gl_Position = u_matrix * a_position;
        
        //v_color.x = .5;
        //v_color.y = 0.0;
        //v_color.z = .5;
        //v_color.w = 1.0;
        vec3 hot = vec3(0.6, 0.0, 0.1);
        vec3 cold = vec3(0.1, 0.1, 0.6);
        vec3 medium = vec3(0.4, 0.8, 0.4);

        //v_color.rgb = lerpRedToBlue((a_position.y + .5));
        //v_color.rgb = mix(hot, cold, a_position.y + .5);
        v_color.rgb = quadraticInterpolation(cold, hot, medium, a_position.y + .5); 
        v_color.a = 1.0;
    }
`;

const sphereVertexShader = `
    attribute vec4 a_position;
    attribute vec4 a_color;

    uniform mat4 u_matrix;

    varying vec4 v_color;

    void main() {
        // Multiply the position by the matrix.
        gl_Position = u_matrix * a_position;

        // Pass the color to the fragment shader.
        v_color = a_color;
    }
`;

const sphereFragmentShader = `
    precision mediump float;

    // Passed in from the vertex shader.
    varying vec4 v_color;

    uniform vec4 u_colorMult;

    void main() {
        gl_FragColor = v_color * u_colorMult;
    }
`;



// Citation
// wglb. "How to include shaders." Khronos Forums https://community.khronos.org/t/how-to-include-shaders/2591/3

initializeRenderer()
