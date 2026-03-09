const W = 64, H = 64;
const canvas = new OffscreenCanvas(W, H);
const gl = canvas.getContext("webgl");

canvas.width = W;
canvas.height = H;
gl.viewport(0, 0, W, H);
const prevTex = createTexture(gl);
const currTex = createTexture(gl);

function processFrame(canvasPrev, canvasCurr) {
    uploadCanvasToTexture(gl, prevTex, canvasPrev);
    uploadCanvasToTexture(gl, currTex, canvasCurr);

    gl.useProgram(program);
    gl.viewport(0, 0, W, H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const pixels = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    return estimateMotionFromPixels(pixels);
}


function createTexture(gl) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return tex;
}

function uploadCanvasToTexture(gl, texture, canvas) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        canvas
    );
}

function estimateMotionFromPixels(pixels) {
    let sumX = 0, sumY = 0, count = 0;

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            const v = pixels[i] - 128; // signed motion

            sumX += v * (x - W / 2);
            sumY += v * (y - H / 2);
            count++;
        }
    }

    return {
        yaw: sumX / count * 0.0005,
        pitch: sumY / count * 0.0005,
        forward: Math.abs(sumX) + Math.abs(sumY)
    };
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

const vertexSrc = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentSrc = `
precision highp float;
uniform sampler2D prevFrame;
uniform sampler2D currFrame;
varying vec2 vUv;

void main() {
  vec3 p = texture2D(prevFrame, vUv).rgb;
  vec3 c = texture2D(currFrame, vUv).rgb;

  float gp = dot(p, vec3(0.299, 0.587, 0.114));
  float gc = dot(c, vec3(0.299, 0.587, 0.114));

  float diff = gc - gp;
  gl_FragColor = vec4(diff, diff, diff, 1.0);
}
`;

const program = gl.createProgram();
gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexSrc));
gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc));
gl.linkProgram(program);