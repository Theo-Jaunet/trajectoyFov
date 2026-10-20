
const SAMPLE_STEP = 4;          // px between ribbon cross-sections (smaller = smoother on curves)
const CURV_SAFETY = 0.8;        // inner half-width <= CURV_SAFETY * radius of curvature
const CURV_WINDOW = 3;          // samples used to smooth the curvature limit
const TANGENT_SPAN = 2;         // samples on each side used for the tangent / curvature estimate
const EDGE_PX = 1.5;            // border width in px (0 = off)
const EDGE_COLOR = [1, 1, 1, 0.9];

let gl;
let meshHeight = 0.3;
let glState = null;


/* ------------------------------------------------------------------ rendering */

function makeMapping(path, heightEncoding = undefined) {
    prepMapping();
    drawWaypoints();
    const stripe = mergeSlits();

    let ref = document.getElementById("main");
    if (mapFlag) ref = mapCan;

    const st = getGLState(ref.width, ref.height);
    gl = st.gl;

    // geometry
    const dense = buildSamples(path);
    const samples = resampleByArcLength(dense, SAMPLE_STEP);
    computeFrames(samples);
    const mesh = buildMesh(samples, stripe.height * meshHeight, heightEncoding);

    // texture, pre-filtered to roughly 1 texel per screen pixel
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const tw = Math.min(maxTex, Math.ceil(samples.pathLength));
    const th = Math.min(maxTex, Math.ceil(mesh.maxWidth));
    const source = boxDownscale(stripe, tw, th);

    gl.bindTexture(gl.TEXTURE_2D, st.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);

    // geometry upload
    gl.bindVertexArray(st.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, st.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, st.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.DYNAMIC_DRAW);

    gl.viewport(0, 0, st.canvas.width, st.canvas.height);
    gl.useProgram(st.program);
    gl.uniform2f(st.loc.res, st.canvas.width, st.canvas.height);
    gl.uniform1f(st.loc.edgePx, EDGE_PX);
    gl.uniform4fv(st.loc.edgeColor, EDGE_COLOR);
    gl.uniform1i(st.loc.tex, 0);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_INT, 0);

    // make sure prepMapping() clears `ref`; otherwise antialiased edges accumulate over repeated draws
    ref.getContext("2d").drawImage(st.canvas, 0, 0);
}

function getGLState(w, h) {
    if (!glState) {
        const canvas = new OffscreenCanvas(w, h);
        const g = canvas.getContext("webgl2", {antialias: true, premultipliedAlpha: true});
        if (!g) throw "WebGL2 not supported";

        const program = g.createProgram();
        g.attachShader(program, shader(g, g.VERTEX_SHADER, VERT_SRC));
        g.attachShader(program, shader(g, g.FRAGMENT_SHADER, FRAG_SRC));
        g.linkProgram(program);
        if (!g.getProgramParameter(program, g.LINK_STATUS)) throw g.getProgramInfoLog(program);

        const vao = g.createVertexArray();
        g.bindVertexArray(vao);
        const vbo = g.createBuffer();
        g.bindBuffer(g.ARRAY_BUFFER, vbo);
        const stride = 5 * 4;                          // x, y, u, v, width (floats)
        const attr = (name, size, offset) => {
            const l = g.getAttribLocation(program, name);
            g.enableVertexAttribArray(l);
            g.vertexAttribPointer(l, size, g.FLOAT, false, stride, offset);
        };
        attr("a_pos", 2, 0);
        attr("a_uv", 2, 8);
        attr("a_width", 1, 16);
        const ibo = g.createBuffer();
        g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ibo);

        const tex = g.createTexture();
        g.bindTexture(g.TEXTURE_2D, tex);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR_MIPMAP_LINEAR);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
        const aniso = g.getExtension("EXT_texture_filter_anisotropic");
        if (aniso) {
            const max = g.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            g.texParameterf(g.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
        }

        glState = {
            canvas, gl: g, program, vao, vbo, ibo, tex,
            loc: {
                res: g.getUniformLocation(program, "u_res"),
                tex: g.getUniformLocation(program, "u_tex"),
                edgePx: g.getUniformLocation(program, "u_edgePx"),
                edgeColor: g.getUniformLocation(program, "u_edgeColor")
            }
        };
    }
    if (glState.canvas.width !== w || glState.canvas.height !== h) {
        glState.canvas.width = w;
        glState.canvas.height = h;
    }
    return glState;
}

const VERT_SRC = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
in float a_width;
uniform vec2 u_res;
out vec2 v_uv;
out float v_width;
void main() {
  vec2 p = a_pos / u_res * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
  v_uv = a_uv;
  v_width = a_width;
}`;

const FRAG_SRC = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform float u_edgePx;
uniform vec4 u_edgeColor;
in vec2 v_uv;
in float v_width;
out vec4 outColor;
void main() {
  vec4 c = texture(u_tex, v_uv);
  float distPx = min(v_uv.y, 1.0 - v_uv.y) * v_width;      // distance to the nearest ribbon edge, in px
  float b = u_edgePx > 0.0
      ? (1.0 - smoothstep(u_edgePx - 0.75, u_edgePx + 0.25, distPx)) * u_edgeColor.a
      : 0.0;
  vec3 rgb = mix(c.rgb, u_edgeColor.rgb, b);
  outColor = vec4(rgb * c.a, c.a);                           // premultiplied
}`;

function shader(g, type, src) {
    const s = g.createShader(type);
    g.shaderSource(s, src);
    g.compileShader(s);
    if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw g.getShaderInfoLog(s);
    return s;
}


function boxDownscale(src, tw, th) {
    tw = Math.max(1, Math.min(src.width, Math.round(tw)));
    th = Math.max(1, Math.min(src.height, Math.round(th)));
    const draw = (s, w, h) => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const x = c.getContext("2d");
        x.imageSmoothingEnabled = true;
        x.imageSmoothingQuality = "high";
        x.drawImage(s, 0, 0, s.width, s.height, 0, 0, w, h);
        return c;
    };
    let cur = src;
    while (cur.width >= tw * 2 || cur.height >= th * 2) {
        cur = draw(cur,
            cur.width >= tw * 2 ? Math.ceil(cur.width / 2) : cur.width,
            cur.height >= th * 2 ? Math.ceil(cur.height / 2) : cur.height);
    }
    if (cur.width !== tw || cur.height !== th) cur = draw(cur, tw, th);
    return cur;
}


/* ------------------------------------------------------------------ geometry (pure functions) */


function centripetalCR(p0, p1, p2, p3, u, alpha = 0.5) {
    const knot = (ti, a, b) => ti + Math.max(Math.pow(Math.hypot(b.x - a.x, b.y - a.y), alpha), 1e-6);
    const t0 = 0, t1 = knot(t0, p0, p1), t2 = knot(t1, p1, p2), t3 = knot(t2, p2, p3);
    const t = t1 + (t2 - t1) * u;
    const mix = (a, b, ta, tb) => {
        const k = (t - ta) / (tb - ta);
        return {x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k};
    };
    const A1 = mix(p0, p1, t0, t1), A2 = mix(p1, p2, t1, t2), A3 = mix(p2, p3, t2, t3);
    const B1 = mix(A1, A2, t0, t2), B2 = mix(A2, A3, t1, t3);
    return mix(B1, B2, t1, t2);
}

function buildSamples(path) {
    const pts = [];
    for (const p of path) {
        const last = pts[pts.length - 1];
        if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.5) pts.push({x: p.x, y: p.y});
    }
    if (pts.length < 2) return pts;

    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;
        const L = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const n = Math.min(64, Math.max(4, Math.ceil(L / SAMPLE_STEP)));
        for (let j = 0; j < n; j++) out.push(centripetalCR(p0, p1, p2, p3, j / n));
    }
    out.push({x: pts[pts.length - 1].x, y: pts[pts.length - 1].y});
    return out;
}


function resampleByArcLength(pts, step) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++)
        cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const total = cum[cum.length - 1];
    const n = Math.max(2, Math.round(total / step) + 1);
    const out = [];
    let j = 1;
    for (let k = 0; k < n; k++) {
        const s = (k / (n - 1)) * total;
        while (j < pts.length - 1 && cum[j] < s) j++;
        const seg = cum[j] - cum[j - 1] || 1;
        const t = (s - cum[j - 1]) / seg;
        out.push({
            x: pts[j - 1].x + (pts[j].x - pts[j - 1].x) * t,
            y: pts[j - 1].y + (pts[j].y - pts[j - 1].y) * t,
            u: total > 0 ? s / total : 0
        });
    }
    out.pathLength = total;
    return out;
}

function wrapAngle(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
}


function computeFrames(samples) {
    const n = samples.length;
    for (let i = 0; i < n; i++) {
        const a = samples[Math.max(0, i - TANGENT_SPAN)], b = samples[Math.min(n - 1, i + TANGENT_SPAN)];
        samples[i].angle = Math.atan2(b.y - a.y, b.x - a.x);
    }
    for (let i = 0; i < n; i++) {
        const a = samples[Math.max(0, i - TANGENT_SPAN)], b = samples[Math.min(n - 1, i + TANGENT_SPAN)];
        const ds = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        samples[i].kappa = wrapAngle(b.angle - a.angle) / ds;
    }
}


function profileAt(vals, u) {
    const x = Math.min(1, Math.max(0, u)) * (vals.length - 1);
    const i = Math.min(vals.length - 2, Math.floor(x));
    const f = x - i;
    const a = Number.isFinite(vals[i]) ? vals[i] : 1;
    const b = Number.isFinite(vals[i + 1]) ? vals[i + 1] : 1;
    return a * (1 - f) + b * f;
}


function erodeBlur(a, R) {
    const n = a.length, e = new Float32Array(n), b = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        let m = a[i];
        for (let j = Math.max(0, i - R); j <= Math.min(n - 1, i + R); j++) if (a[j] < m) m = a[j];
        e[i] = m;
    }
    for (let i = 0; i < n; i++) {
        let s = 0, c = 0;
        for (let j = Math.max(0, i - R); j <= Math.min(n - 1, i + R); j++) { s += e[j]; c++; }
        b[i] = s / c;
    }
    a.set(b);
}


function buildMesh(samples, h, hEncode) {
    const n = samples.length;
    const base = h / 2;
    const BIG = 1e9;

    const half = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const s = hEncode && hEncode.length > 1 ? profileAt(hEncode, samples[i].u) : 1;
        half[i] = base * s;
    }

    const limTop = new Float32Array(n).fill(BIG), limBot = new Float32Array(n).fill(BIG);
    for (let i = 0; i < n; i++) {
        const k = samples[i].kappa;
        if (k > 1e-6) limTop[i] = CURV_SAFETY / k;        // centre of curvature is on the +normal side
        else if (k < -1e-6) limBot[i] = CURV_SAFETY / -k;
    }
    erodeBlur(limTop, CURV_WINDOW);
    erodeBlur(limBot, CURV_WINDOW);

    const vertices = new Float32Array(n * 2 * 5);
    const indices = new Uint32Array((n - 1) * 6);
    let maxWidth = 0;

    for (let i = 0; i < n; i++) {
        const p = samples[i];
        const nx = Math.cos(p.angle + Math.PI / 2);
        const ny = Math.sin(p.angle + Math.PI / 2);
        const hT = Math.max(0.5, Math.min(half[i], limTop[i]));
        const hB = Math.max(0.5, Math.min(half[i], limBot[i]));
        const w = hT + hB;
        if (w > maxWidth) maxWidth = w;

        vertices.set([p.x + nx * hT, p.y + ny * hT, p.u, 1, w], i * 10);       // top
        vertices.set([p.x - nx * hB, p.y - ny * hB, p.u, 0, w], i * 10 + 5);   // bottom

        if (i < n - 1) {
            const k = i * 2;
            indices.set([k, k + 1, k + 2, k + 1, k + 3, k + 2], i * 6);
        }
    }
    return {vertices, indices, maxWidth};
}
