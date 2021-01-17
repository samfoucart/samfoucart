
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
    let numDivisions = 75;
    let meshPoints = generateMesh(initialDistribution, fourierSeriesCoefficients, numDivisions);
    //let meshPoints = generatePointsDebug(initialDistribution, numDivisions);
    let meshIndices = triangulateMesh(meshPoints, numDivisions);
    let normals = generateNormals(meshPoints, numDivisions);
    let arrays = {
        position: {numComponents: 3, data: meshPoints},
        indices: {numComponents: 3, data: meshIndices},
        normal: {numComponents: 3, data: normals},
    }
    let meshBufferInfo = webglUtils.createBufferInfoFromArrays(gl, arrays);

    let gridIndices = generateGridIndices(meshPoints, numDivisions);
    //arrays.indices = {numComponents: 3, data:gridIndices};
    arrays = {
        position: {numComponents: 3, data: meshPoints},
        indices: {numComponents: 3, data: gridIndices},
    }
    let gridBufferInfo = webglUtils.createBufferInfoFromArrays(gl, arrays);

    let cylinderArrays = createRodArrays(initialDistribution, 15, 10);
    let cylinderBufferInfo = webglUtils.createBufferInfoFromArrays(gl, cylinderArrays);

    let sphereProgramInfo = webglUtils.createProgramInfo(gl, [sphereVertexShader, sphereFragmentShader]);
    let meshProgramInfo = webglUtils.createProgramInfo(gl, [meshVertexShaderLighting, meshFragmentShaderLighting]);
    let gridProgramInfo = webglUtils.createProgramInfo(gl, [gridVertexShader, gridFragmentShader]);
    let cylinderProgramInfo = webglUtils.createProgramInfo(gl, [rodVertexShader, rodFragmentShader]);

    let cameraAngleRadians = 0.0;
    let fieldOfViewRadians = Math.PI / 3;
    let cameraHeight = 50;

    // Uniforms for each object
    let sphereUniforms = {
        u_colorMult: [1, 1, .5, 1],
        u_matrix: m4.identity(),
    }

    let meshUniforms = {
        u_lightWorldPos: [0, .5, 0],
        u_viewInverse: m4.identity(),
        u_lightColor: [1, 1, 1, 1],
        u_worldViewProjection: m4.identity(),
        u_world: m4.identity(),
        u_worldInverseTranspose: m4.identity(),
        u_specular: [1, 1, 1, 1],
        u_shininess: 1000,
        u_specularFactor: .9,
    }

    let gridUniforms = {
        u_colorMult: [.25, .25, .25, 1],
        u_matrix: m4.identity(),
    }

    let rodUniforms = {
        u_matrix: m4.identity(),
    }
    let sphereTranslation = [0, 5, 60];

    let objectsToDraw = [
        {
            programInfo: sphereProgramInfo,
            bufferInfo: sphereBufferInfo,
            uniforms: sphereUniforms,
            primitive: gl.LINES,
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
        },
        /*
        {
            programInfo: cylinderProgramInfo,
            bufferInfo: cylinderBufferInfo,
            uniforms: rodUniforms,
            //primitive: gl.LINES,
        }
         */
    ];

    function computeMatrix(viewProjectionMatrix, translation, xRotation, yRotation) {
        let matrix = m4.translate(viewProjectionMatrix, translation[0], translation[1], translation[2]);
        matrix = m4.xRotate(matrix, xRotation);
        return m4.yRotate(matrix, yRotation);
    }


    requestAnimationFrame(drawScene);

    let worldMatrix = m4.identity();
    let timeAdvancing = false;
    let simulatorTime = 0;
    let lastTime = 0;
    function drawScene(time) {
        if (timeAdvancing) {
            simulatorTime += ((time - lastTime) * .0000005);
            updateMesh(simulatorTime);
        } else {
            lastTime = time;
        }
        let timeText = document.getElementById("current-time");
        timeText.innerText = simulatorTime.toFixed(5);


        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        gl.clearColor(0, 0, 0, 0);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        let projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, .2, 2000);

        let cameraPosition = [0, 0, -2];
        let target = [0, 0, 0];
        let up = [0, 1, 0];
        let cameraMatrix = m4.lookAt(cameraPosition, target, up, meshUniforms.u_viewInverse);

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
        meshUniforms.u_world = worldMatrix;
        meshUniforms.u_worldViewProjection = sphereMatrix;
        m4.transpose(m4.inverse(worldMatrix), meshUniforms.u_worldInverseTranspose);
        gridUniforms.u_matrix = sphereMatrix;
        rodUniforms.u_matrix = sphereMatrix;

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

    function decreaseCoefficients() {
        let coefficientsText = document.getElementById("num-coefficients-text");
        --numCoefficients;
        if (numCoefficients < 0) {
            numCoefficients = 0;
        }
        updateMesh(simulatorTime);
        coefficientsText.innerText = numCoefficients.toString();
    }

    function increaseCoefficients() {
        let coefficientsText = document.getElementById("num-coefficients-text");
        ++numCoefficients;
        updateMesh(simulatorTime);
        coefficientsText.innerText = numCoefficients.toString();
    }

    function updateMesh(initialTime) {
        fourierSeriesCoefficients = calculateFourierSeriesCoefficients(initialDistribution, numCoefficients);
        meshPoints = generateMesh(initialDistribution, fourierSeriesCoefficients, numDivisions, initialTime);
        meshIndices = triangulateMesh(meshPoints, numDivisions);
        normals = generateNormals(meshPoints, numDivisions);
        arrays = {
            position: {numComponents: 3, data: meshPoints},
            indices: {numComponents: 3, data: meshIndices},
            normal: {numComponents: 3, data: normals},
        }
        meshBufferInfo = webglUtils.createBufferInfoFromArrays(gl, arrays);
        gridIndices = generateGridIndices(meshPoints, numDivisions);
        //arrays.indices = {numComponents: 3, data:gridIndices};
        arrays = {
            position: {numComponents: 3, data: meshPoints},
            indices: {numComponents: 3, data: gridIndices},
        }
        gridBufferInfo = webglUtils.createBufferInfoFromArrays(gl, arrays);
        objectsToDraw[1].bufferInfo = meshBufferInfo;
        objectsToDraw[2].bufferInfo = gridBufferInfo;
    }

    function refreshSimulation() {
        timeAdvancing = !timeAdvancing;
        if (timeAdvancing) {
            simulatorButton.innerText = "Pause Simulation";
        } else {
            simulatorButton.innerText = "Start Simulation";
        }
    }

    function decreaseTime() {
        simulatorTime -= .25;
        if (simulatorTime < 0) {
            simulatorTime = 0;
        }
        updateMesh(simulatorTime);
    }

    function increaseTime() {
        simulatorTime += .25;
        updateMesh(simulatorTime);
    }

    let coefficientSubtractor = document.getElementById("coefficient-subtract");
    coefficientSubtractor.addEventListener("click", decreaseCoefficients);

    let coefficientAdder = document.getElementById("coefficient-add");
    coefficientAdder.addEventListener("click", increaseCoefficients);

    let simulatorButton = document.getElementById("simulate-button");
    simulatorButton.addEventListener("click", refreshSimulation);

    let timeSubtractor = document.getElementById("time-subtract");
    timeSubtractor.addEventListener("click", decreaseTime);

    let timeAdder = document.getElementById("time-add");
    timeAdder.addEventListener("click", increaseTime);

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

function createRodArrays(displayDistribution, degreeIncrements, heightIncrements) {
    let vertices = [];
    let indices = [];
    for (let h = 0; h < heightIncrements; ++h) {
        let normH = h / heightIncrements;
        for (let theta = 0; theta < degreeIncrements; ++theta) {
            let normTheta = theta * 360 / degreeIncrements;
            let xPosition = Math.cos(normTheta * Math.PI / 180.0);
            let zPosition = Math.sin(normTheta * Math.PI / 180.0);
            vertices.push(xPosition);
            vertices.push(normH);
            vertices.push(zPosition);
        }
    }

    for (let h = 0; h < heightIncrements - 1; ++h) {
        let normH = h / heightIncrements;
        for (let theta = 0; theta < degreeIncrements - 1; ++theta) {
            // Note: for the surface to be visible on both sides, we require a triangle on each side of the surface
            // Triangle 1
            indices.push((degreeIncrements * h) + theta);
            indices.push((degreeIncrements * (h + 1)) + (theta + 1));
            indices.push((degreeIncrements * h) + (theta + 1));
            // Triangle 2
            indices.push((degreeIncrements * h) + theta);
            indices.push((degreeIncrements * (h + 1)) + (theta));
            indices.push((degreeIncrements * (h + 1)) + (theta + 1));
        }
        // Triangle 1
        indices.push((degreeIncrements * h) + degreeIncrements - 1);
        indices.push((degreeIncrements * (h + 1)));
        indices.push((degreeIncrements * h));
        // Triangle 2
        indices.push((degreeIncrements * h) + degreeIncrements - 1);
        indices.push((degreeIncrements * (h + 1)) + degreeIncrements - 1);
        indices.push((degreeIncrements * (h + 1)));
    }

    return {
        position: {numComponents: 3, data: vertices},
        distribution: {numComponents: 1, data: displayDistribution},
        indices: {numComponents: 3, data: indices},
    }
}

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

function generateMesh(initialDistribution, fourierSeriesCoefficients, numDivisions, initialTime = 0, diffusivity = .15) {
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
                partialSum += a * Math.cos(lambda * normX) * Math.exp(-lambda * lambda * k * (normT + initialTime));
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
    function calculateNormal(dataVertices, x, nextX, t, nextT) {
        let value0 = dataVertices[(3 * (x + t)) + 1];
        // height forwards
        let value1 = dataVertices[(3 * (nextX + t)) + 1];
        // height left
        let value2 = dataVertices[(3 * (x + nextT)) + 1];

        let partialX = [nextX - x, (value1 - value0) / (nextX - x), 0];
        let partialT = [0, (value2 - value0) / (nextX - x), nextT - t];
        let crossProduct = cross(partialX, partialT);
        let normCross = Math.sqrt((crossProduct[0] * crossProduct[0])
            + (crossProduct[1] * crossProduct[1])
            + (crossProduct[2] * crossProduct[2]));
        normals.push(crossProduct[0] / normCross, crossProduct[1] / normCross, crossProduct[2] / normCross);
    }
    let normals = [];
    for (let x = 0; x < numDivisions - 1; ++x) {
        for (let t = 0; t < numDivisions - 1; ++t) {
            calculateNormal(dataVertices, numDivisions * x, (numDivisions * (x + 1)), t, t+1);
        }
        calculateNormal(dataVertices, numDivisions * x, (numDivisions * (x + 1)), numDivisions - 1, numDivisions - 2);
    }
    for (let t = 0; t < numDivisions - 1; ++t) {
        calculateNormal(dataVertices, numDivisions * (numDivisions - 1), (numDivisions * (numDivisions - 2)), t, t+1);
    }
    calculateNormal(dataVertices, numDivisions * (numDivisions - 1), (numDivisions * (numDivisions - 2)), numDivisions - 1, numDivisions - 2);
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
    
    void main () {
        gl_FragColor = v_color;
    }
`;

const gridFragmentShader = `
    precision mediump float;
    
    varying vec4 v_color;
    
    void main () {
        gl_FragColor = vec4(0, 0, 0, 1);
    }
`;

const gridVertexShader = `
    attribute vec4 a_position;

    uniform mat4 u_matrix;
     
    void main() {
        // Multiply the position by the matrix.
        gl_Position = u_matrix * a_position;

    }
`;

const rodFragmentShader = `
    precision mediump float;
    
    varying vec4 v_color;
    
    void main () {
        gl_FragColor = v_color;
    }
`;

const rodVertexShader = `
    attribute vec4 a_position;
    attribute float a_distribution;

    uniform mat4 u_matrix;
    
    varying vec4 v_color;
    
    vec3 quadraticInterpolation(vec3 start, vec3 end, vec3 control, float amount) {
        vec3 left = mix(start, control, amount);
        vec3 right = mix(control, end, amount);
        return mix(left, right, amount);
    }
     
    void main() {
        // Multiply the position by the matrix.
        gl_Position = u_matrix * a_position;
        
        vec3 hot = vec3(0.6, 0.0, 0.1);
        vec3 cold = vec3(0.1, 0.1, 0.6);
        vec3 medium = vec3(0.4, 0.8, 0.4);

        v_color.rgb = quadraticInterpolation(cold, hot, medium, a_position.y + .5); 
        v_color.a = 1.0;
    }
`;

const meshFragmentShaderLighting = `
    precision mediump float;
 
    varying vec4 v_position;
    varying vec3 v_normal;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;
    varying vec4 v_ambient;
     
    uniform vec4 u_lightColor;
    uniform vec4 u_specular;
    uniform float u_shininess;
    uniform float u_specularFactor;
     
    vec4 lit(float l ,float h, float m) {
      return vec4(1.0,
                  max(l, 0.0),
                  (l > 0.0) ? pow(max(0.0, h), m) : 0.0,
                  1.0);
    }
     
    void main() {
      vec3 a_normal = normalize(v_normal);
      vec3 surfaceToLight = normalize(v_surfaceToLight);
      vec3 surfaceToView = normalize(v_surfaceToView);
      vec3 halfVector = normalize(surfaceToLight + surfaceToView);
      vec4 litR = lit(dot(a_normal, surfaceToLight),
                        dot(a_normal, halfVector), u_shininess);
      vec4 outColor = vec4((
      u_lightColor * (litR.y * v_ambient +
                    u_specular * litR.z * u_specularFactor)).rgb,
          1);
      gl_FragColor = outColor;
    }
`;

const meshVertexShader = `
    attribute vec4 a_position;

    uniform mat4 u_matrix;
    
    varying vec4 v_color;
    
    vec3 quadraticInterpolation(vec3 start, vec3 end, vec3 control, float amount) {
        vec3 left = mix(start, control, amount);
        vec3 right = mix(control, end, amount);
        return mix(left, right, amount);
    }
        
    void main() {
        // Multiply the position by the matrix.
        gl_Position = u_matrix * a_position;
        
        vec3 hot = vec3(0.6, 0.0, 0.1);
        vec3 cold = vec3(0.1, 0.1, 0.6);
        vec3 medium = vec3(0.4, 0.8, 0.4);

        v_color.rgb = quadraticInterpolation(cold, hot, medium, a_position.y + .5); 
        v_color.a = 1.0;
    }
`;

const meshVertexShaderLighting = `
    uniform mat4 u_worldViewProjection;
    uniform vec3 u_lightWorldPos;
    uniform mat4 u_world;
    uniform mat4 u_viewInverse;
    uniform mat4 u_worldInverseTranspose;
     
    attribute vec4 a_position;
    attribute vec3 a_normal;
     
    varying vec4 v_position;
    varying vec3 v_normal;
    varying vec3 v_surfaceToLight;
    varying vec3 v_surfaceToView;
    varying vec4 v_ambient;
    
    vec3 quadraticInterpolation(vec3 start, vec3 end, vec3 control, float amount) {
        vec3 left = mix(start, control, amount);
        vec3 right = mix(control, end, amount);
        return mix(left, right, amount);
    }
     
    void main() {
      vec3 hot = vec3(0.6, 0.0, 0.1);
      vec3 cold = vec3(0.1, 0.1, 0.6);
      vec3 medium = vec3(0.4, 0.8, 0.4);
    
      v_ambient.rgb = quadraticInterpolation(cold, hot, medium, a_position.y + .5); 
      v_ambient.a = 1.0;
      
      
      v_position = (u_worldViewProjection * a_position);
      v_normal = (u_worldInverseTranspose * vec4(a_normal, 0)).xyz;
      v_surfaceToLight = u_lightWorldPos - (u_world * a_position).xyz;
      v_surfaceToView = (u_viewInverse[3] - (u_world * a_position)).xyz;
      gl_Position = v_position;
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
