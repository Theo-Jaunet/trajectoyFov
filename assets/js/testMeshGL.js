const SAMPLE_STEP = 10;
let gl;
let meshHeight = 0.3

function makeMapping(path, stripe, heightEncoding = undefined) {
    prepMapping()
    stripe = mergeSlits()

    const ref = document.getElementById("main");

    const canvas = new OffscreenCanvas(ref.width, ref.height);


    gl = canvas.getContext("webgl");
    if (!gl) throw "WebGL not supported";


    const samples = buildSamples(path, SAMPLE_STEP);
    const mesh = buildMesh(samples, stripe.height * meshHeight, heightEncoding);

    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, `
attribute vec2 a_pos;
attribute vec2 a_uv;
uniform vec2 u_res;
varying vec2 v_uv;
void main() {
  vec2 p = a_pos / u_res * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0, 1);
  v_uv = a_uv;
}`));

    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
precision mediump float;
uniform sampler2D u_tex;
varying vec2 v_uv;
void main() {
  gl_FragColor = texture2D(u_tex, v_uv);
}`));

    gl.linkProgram(program);
    gl.useProgram(program);


    function buffer(type, data, attr, size) {
        const b = gl.createBuffer();
        gl.bindBuffer(type, b);
        gl.bufferData(type, data, gl.STATIC_DRAW);
        if (attr) {
            const loc = gl.getAttribLocation(program, attr);
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
        }
        return b;
    }

    buffer(gl.ARRAY_BUFFER, mesh.pos, "a_pos", 2);
    buffer(gl.ARRAY_BUFFER, mesh.uv, "a_uv", 2);
    buffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idx);

    // texture
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
        gl.UNSIGNED_BYTE, stripe
    );

    gl.uniform2f(
        gl.getUniformLocation(program, "u_res"),
        canvas.width,
        canvas.height
    );

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_SHORT, 0);


    ref.getContext("2d").drawImage(canvas, 0, 0);
}


function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw gl.getShaderInfoLog(s);
    return s;
}

function buildSamples(path, step) {
    const s = [];
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        const n = Math.ceil(len / step);

        for (let j = 0; j < n; j++) {
            const t = j / n;
            s.push({
                x: a.x + dx * t,
                y: a.y + dy * t,
                angle: Math.atan2(dy, dx)
            });
        }
    }
    return s;
}

function buildMesh(samples, h, hEncode) {
    const pos = [];
    const uv = [];
    const idx = [];
    let hh = h / 2;
    let step, it, tn = 0
    let interpol

    if (hEncode) {
        step = Math.floor(samples.length / hEncode.length)
        it = 0
        tn = 0
         interpol = d3.scaleLinear([0,step],[hEncode[0], hEncode[1]]);
    }

    samples.forEach((p, i) => {


        if (hEncode) {
            if (it < step) {
                // console.log(hEncode[i]);
                hh = (h / 2) * interpol(it);
                ++it
            } else {
                ++tn
                it = 0
                interpol.range([hEncode[tn-1],hEncode[tn]])
            }
        }


        const nx = Math.cos(p.angle + Math.PI / 2);
        const ny = Math.sin(p.angle + Math.PI / 2);
        const u = i / (samples.length - 1);

        // top
        pos.push(p.x + nx * hh, p.y + ny * hh);
        uv.push(u, 1);

        // bottom
        pos.push(p.x - nx * hh, p.y - ny * hh);
        uv.push(u, 0);

        if (i < samples.length - 1) {
            const k = i * 2;
            idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
    });

    return {
        pos: new Float32Array(pos),
        uv: new Float32Array(uv),
        idx: new Uint16Array(idx)
    };
}
