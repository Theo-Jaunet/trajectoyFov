

const MAX_STRIPE_W = 6000;
const _scratch = [];

function scratchCanvas(k, w, h) {
    const c = _scratch[k] || (_scratch[k] = document.createElement("canvas"));
    if (c.width !== w || c.height !== h) {
        c.width = w;           // resizing also clears and resets the context state
        c.height = h;
    } else {
        c.getContext("2d").clearRect(0, 0, w, h);
    }
    return c;
}

/**
 * Draw the source rectangle (sx,sy,sw,sh) of `src` into (dx,dy,dw,dh) of `ctx`,
 * reducing by at most 2:1 per step so that every source pixel contributes (box filter).
 */
function drawBox(src, sx, sy, sw, sh, ctx, dx, dy, dw, dh) {
    let cur = src, cx = sx, cy = sy, cw = sw, ch = sh, k = 0;
    while (cw >= dw * 2 || ch >= dh * 2) {
        const nw = cw >= dw * 2 ? Math.max(dw, Math.ceil(cw / 2)) : Math.ceil(cw);
        const nh = ch >= dh * 2 ? Math.max(dh, Math.ceil(ch / 2)) : Math.ceil(ch);
        const s = scratchCanvas(k % 2, nw, nh);
        const c = s.getContext("2d");
        c.imageSmoothingEnabled = true;
        c.imageSmoothingQuality = "high";
        c.drawImage(cur, cx, cy, cw, ch, 0, 0, nw, nh);
        cur = s; cx = 0; cy = 0; cw = nw; ch = nh; k++;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(cur, cx, cy, cw, ch, dx, dy, dw, dh);
}

function framesPerColumn(nFrames, sampleWidth, requested) {
    return Math.max(1, requested || 1, Math.ceil(nFrames * sampleWidth / MAX_STRIPE_W));
}


function videoDurationSec(frames) {
    const m = frames.meta;
    if (m && m.duration > 0) return m.duration;
    const ts = m && m.timestamps;
    if (ts && ts.length > 1) return (ts[ts.length - 1] - ts[0]) * ts.length / (ts.length - 1);
    if (typeof document !== "undefined") {
        const v = document.getElementById("mainVideo");
        if (v && v.duration > 0 && isFinite(v.duration)) return v.duration;
    }
    console.warn("slit: video duration unknown (no frames.meta, no #mainVideo); assuming 12 frames per second.");
    return frames.length / 12;
}


function strokeLengthPx() {
    const s = (typeof mapFlag !== "undefined" && mapFlag && typeof mapStroke !== "undefined") ? mapStroke
        : (typeof stroke !== "undefined" ? stroke : null);
    if (!s || s.length < 2) return 0;
    let L = 0;
    for (let i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
    return L;
}


function stripeLength(frames, stripe, sampleWidth) {
    const N = frames.length;
    const mode = stripe.lengthMode || "duration";

    if (mode === "frames") {
        const group = framesPerColumn(N, sampleWidth, stripe.fps);
        return {nCols: Math.max(1, Math.floor(N / group)), legacyGroup: group, mode, length: 0};
    }

    const minL = stripe.minLength || 512;
    const maxL = Math.min(stripe.maxLength || MAX_STRIPE_W, MAX_STRIPE_W);
    let L = 0, used = mode;
    if (mode === "path") L = strokeLengthPx() * (stripe.oversample || 2);
    if (!(L > 0)) { L = videoDurationSec(frames) * (stripe.pxPerSecond || 10); used = "duration"; }
    L = Math.min(maxL, Math.max(minL, L));

    const nCols = Math.max(1, Math.min(N, Math.round(L / sampleWidth)));
    return {nCols, legacyGroup: 0, mode: used, length: nCols * sampleWidth};
}

function columnRanges(frames, nCols, legacyGroup) {
    const N = frames.length, ranges = new Array(nCols);
    if (legacyGroup) {
        for (let j = 0; j < nCols; j++) ranges[j] = [j * legacyGroup, Math.min(N, (j + 1) * legacyGroup)];
        return ranges;
    }
    const ts = frames.meta && frames.meta.timestamps;
    if (!ts || ts.length < N) {
        for (let j = 0; j < nCols; j++) {
            const s = Math.min(N - 1, Math.floor(j * N / nCols));
            ranges[j] = [s, Math.min(N, Math.max(s + 1, Math.floor((j + 1) * N / nCols)))];
        }
        return ranges;
    }
    const t0 = ts[0], dtm = (ts[N - 1] - t0) / Math.max(1, N - 1), T = ts[N - 1] - t0 + dtm;
    let k = 0;
    for (let j = 0; j < nCols; j++) {
        const tb = t0 + T * (j + 1) / nCols, s = k;
        while (k < N && ts[k] < tb - 1e-9) k++;
        if (j === nCols - 1) k = N;
        ranges[j] = k > s ? [s, k] : [Math.max(0, s - 1), Math.max(0, s - 1) + 1];
    }
    return ranges;
}


/* ================================================================== slit extraction */

function slitRect(frames, rect, n) {
    const stripe = stripes[n] || {};
    const [sampleWidth, sampleHeight] = stripe.size || defaultSampleSize;
    const plan = stripeLength(frames, stripe, sampleWidth);
    const average = stripe.average !== false;
    const nCols = plan.nCols;
    const ranges = columnRanges(frames, nCols, plan.legacyGroup);
    const maxAvg = stripe.maxAverage || 12;


    let track = null;
    if (stripe.fluid && stripe.track) {
        if (stripe.track.dx.length === frames.length) track = stripe.track;
        else console.warn(`slitRect: track has ${stripe.track.dx.length} entries but there are ${frames.length} frames; using the static slit.`);
    }

    const fw = frames[0].width, fh = frames[0].height;
    const x = Math.floor(fw * rect.x);
    const y = Math.floor(fh * rect.y);
    const w = Math.max(2, Math.floor(fw * rect.width));
    const h = Math.max(2, Math.floor(fh * rect.height));

    const can = d3.select(`.stripeCan[row='${n}']`).node();
    can.width = nCols * sampleWidth;
    can.height = sampleHeight;
    const ctx = can.getContext("2d");
    ctx.imageSmoothingQuality = "high";


    let be = birdsEyeConfig(stripe);
    const geo = be ? birdsEyeGeometry(fw, fh, rect, be) : null;
    if (be && !geo) {
        console.warn("slitRect: bird's-eye needs the slit to be below the horizon; using the normal slit.");
        be = null;
    }

    const rot = !!stripe.fov && !be;
    const flip = !!stripe.flip;
    const stageW = rot ? sampleHeight : sampleWidth;
    const stageH = rot ? sampleWidth : sampleHeight;
    const stage = scratchCanvas(2, stageW, stageH);
    const sctx = stage.getContext("2d");

    const em = emphasisConfig(stripe);
    let flow = null;
    if (em) {
        if (rot || be) {
            console.warn("slitRect: emphasis works on unrotated side slits only; skipping it.");
        } else if (!stripe.flow || stripe.flow.ver !== FLOW_VERSION || stripe.flow.n !== frames.length) {
            console.warn("slitRect: emphasis needs the flow: await ensureFlow(frames, base, n) (or toggleEmphasis); skipping it.");
        } else flow = stripe.flow;
    }
    const rowMap = flow ? flowRowMap(flow.rows, stageH) : null;
    const maps = flow ? {boost: new Float32Array(nCols * stageH), fade: new Float32Array(nCols * stageH),
        moving: new Float32Array(nCols * stageH)} : null;

    for (let j = 0; j < nCols; j++) {
        const start = ranges[j][0];
        const end = average ? ranges[j][1] : start + 1;
        const step = Math.max(1, Math.ceil((end - start) / maxAvg));

        sctx.clearRect(0, 0, stageW, stageH);
        let used = 0, fused = 0;
        const bAcc = flow ? new Float32Array(flow.rows) : null, cAcc = flow ? new Float32Array(flow.rows) : null,
            mAcc = flow ? new Float32Array(flow.rows) : null;
        for (let k = start; k < end; k += step) {
            sctx.globalAlpha = 1 / (++used);
            if (flow) {
                for (let q = 0; q < flow.rows; q++) {
                    const c = flow.conf[k * flow.rows + q];
                    bAcc[q] += c * flow.near[k * flow.rows + q];
                    cAcc[q] += c;
                    mAcc[q] += flow.moving[k * flow.rows + q];
                }
                fused++;
            }
            if (geo) {

                const su = track ? track.dx[k] * fw : 0, sv = track ? track.dy[k] * fh : 0;
                birdsEyeDraw(frames[k], geo, be, su, sv, stageW, stageH, sctx);
            } else if (track) {
                const r = fluidRectAt(rect, track, k);
                drawBox(frames[k], r.x * fw, r.y * fh, Math.max(2, r.w * fw), Math.max(2, r.h * fh), sctx, 0, 0, stageW, stageH);
            } else {
                drawBox(frames[k], x, y, w, h, sctx, 0, 0, stageW, stageH);
            }
        }
        sctx.globalAlpha = 1;

        if (flow && fused) {
            const B = flowRowsTo(bAcc, fused, rowMap), C = flowRowsTo(cAcc, fused, rowMap), M = flowRowsTo(mAcc, fused, rowMap);
            for (let yy = 0; yy < stageH; yy++) {
                const y2 = flip ? stageH - 1 - yy : yy;
                maps.boost[j * stageH + y2] = B[yy];
                maps.fade[j * stageH + y2] = Math.max(0, C[yy] - B[yy]);
                maps.moving[j * stageH + y2] = M[yy];
            }
        }

        const dx = j * sampleWidth;
        if (rot) {
            ctx.save();
            ctx.translate(dx + sampleWidth, 0);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(stage, 0, 0);
            ctx.restore();
        } else if (flip) {
            ctx.save();
            ctx.translate(dx + sampleWidth, sampleHeight);
            ctx.rotate(Math.PI);
            ctx.drawImage(stage, 0, 0);
            ctx.restore();
        } else {
            ctx.drawImage(stage, dx, 0);
        }
    }

    if (maps) applyEmphasisMap(can, maps, nCols, sampleWidth, em);

    if (typeof redrawMapping === "function") {
        redrawMapping();
    } else if (stroke.length > 0) {
        makeMapping(stroke.map(d => ({x: d[0], y: d[1]})));
    }
}


function slitLine(frames, pt1, pt2, n) {
    const stripe = stripes[n] || {};
    const imw = frames[0].width, imh = frames[0].height;
    const main = d3.select(`.stripeCan[row='${n}']`).node();
    const mainCtx = main.getContext("2d");

    const plan = stripeLength(frames, stripe, 1);
    const nCols = plan.nCols;
    const ranges = columnRanges(frames, nCols, plan.legacyGroup);
    const maxAvg = stripe.maxAverage || 12;
    const thickness = stripe.thickness || 3;

    const keepH = main.height;
    main.width = nCols;
    main.height = keepH;

    for (let j = 0; j < nCols; j++) {
        const start = ranges[j][0];
        const end = ranges[j][1];
        const step = Math.max(1, Math.ceil((end - start) / maxAvg));

        let acc = null, cnt = 0;
        for (let k = start; k < end; k += step) {
            cnt++;
            const px = sampleLine(frames[k].getContext("2d"),
                pt1.x * imw, pt1.y * imh, pt2.x * imw, pt2.y * imh, thickness);
            if (!acc) acc = new Float32Array(px.length);
            for (let q = 0; q < px.length; q++) acc[q] += px[q];
        }
        const len = acc.length / 4;
        const colData = new Uint8ClampedArray(acc.length);
        for (let q = 0; q < acc.length; q++) colData[q] = acc[q] / cnt;

        const col = scratchCanvas(3, 1, len);
        col.getContext("2d").putImageData(new ImageData(colData, 1, len), 0, 0);
        drawBox(col, 0, 0, 1, len, mainCtx, j, 0, 1, main.height);
    }
}


function sampleLine(ctx, x1, y1, x2, y2, thickness) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const len = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
    const out = new Uint8ClampedArray(len * 4);

    const half = (thickness - 1) / 2;
    const pad = Math.ceil(half) + 2;
    const bx = Math.max(0, Math.floor(Math.min(x1, x2)) - pad);
    const by = Math.max(0, Math.floor(Math.min(y1, y2)) - pad);
    const bw = Math.min(W, Math.ceil(Math.max(x1, x2)) + pad + 1) - bx;
    const bh = Math.min(H, Math.ceil(Math.max(y1, y2)) + pad + 1) - by;
    if (bw <= 0 || bh <= 0) return out;

    const d = ctx.getImageData(bx, by, bw, bh).data;
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const taps = Math.max(1, Math.round(thickness));

    const at = (xx, yy, c) => {
        xx = Math.min(bw - 1, Math.max(0, xx));
        yy = Math.min(bh - 1, Math.max(0, yy));
        return d[(yy * bw + xx) * 4 + c];
    };

    for (let i = 0; i < len; i++) {
        const t = i / (len - 1);
        const cx = x1 + dx * t - bx, cy = y1 + dy * t - by;
        const acc = [0, 0, 0, 0];
        for (let k = 0; k < taps; k++) {
            const o = taps === 1 ? 0 : (k / (taps - 1) - 0.5) * 2 * half;
            const sx = cx + nx * o - 0.5, sy = cy + ny * o - 0.5;
            const x0 = Math.floor(sx), y0 = Math.floor(sy);
            const fx = sx - x0, fy = sy - y0;
            for (let c = 0; c < 4; c++) {
                acc[c] += (at(x0, y0, c) * (1 - fx) + at(x0 + 1, y0, c) * fx) * (1 - fy)
                    + (at(x0, y0 + 1, c) * (1 - fx) + at(x0 + 1, y0 + 1, c) * fx) * fy;
            }
        }
        for (let c = 0; c < 4; c++) out[i * 4 + c] = acc[c] / taps;
    }
    return out;
}

function birdsEyeConfig(stripe) {
    const b = stripe.birdsEye;
    if (!b || (typeof b === "object" && b.enabled === false)) return null;
    return {hfov: 70, pitch: 20, horizon: null, samples: 3, maxReduce: 8, minFar: 0.03, ...(typeof b === "object" ? b : {})};
}

function birdsEyeGeometry(W, H, rect, cfg) {
    const f = (W / 2) / Math.tan(cfg.hfov * Math.PI / 360);
    const cx = W / 2, cy = H / 2;
    const theta = cfg.horizon != null ? Math.atan2((0.5 - cfg.horizon) * H, f) : cfg.pitch * Math.PI / 180;
    const g = {W, H, f, cx, cy, theta, sin: Math.sin(theta), cos: Math.cos(theta)};

    const vHor = cy - f * Math.tan(theta);
    const vNear = (rect.y + rect.height) * H;
    const vFar = Math.max(rect.y * H, vHor + cfg.minFar * H);
    if (vNear <= vHor + 1 || vFar >= vNear - 1) return null;

    const near = birdsEyeToGround(g, rect.x * W, vNear);
    const nearR = birdsEyeToGround(g, (rect.x + rect.width) * W, vNear);
    const far = birdsEyeToGround(g, rect.x * W, vFar);
    if (!near || !nearR || !far || nearR.X <= near.X) return null;
    g.Y0 = near.Y; g.Y1 = far.Y;
    g.X0 = near.X; g.X1 = nearR.X;
    g.vHor = vHor;
    return g;
}

function birdsEyeToGround(g, u, v) {
    const xc = (u - g.cx) / g.f, yc = (v - g.cy) / g.f;
    const den = yc * g.cos + g.sin;
    if (den <= 1e-6) return null;
    const t = 1 / den;
    return {X: t * xc, Y: t * (g.cos - yc * g.sin)};
}


function birdsEyeToImage(g, X, Y) {
    const zc = Y * g.cos + g.sin;
    if (zc <= 1e-6) return null;
    return {u: g.cx + g.f * X / zc, v: g.cy + g.f * (g.cos - Y * g.sin) / zc};
}

function pitchFromHorizon(W, H, hfovDeg, horizon) {
    const f = (W / 2) / Math.tan(hfovDeg * Math.PI / 360);
    return Math.atan2((0.5 - horizon) * H, f);
}

function birdsEyeWarp(g, px, pw, ph, bx, by, kx, ky, outW, outH, su, sv, nSub) {
    const out = new Uint8ClampedArray(outW * outH * 4);
    const n2 = nSub * nSub;
    for (let oy = 0; oy < outH; oy++) {
        for (let ox = 0; ox < outW; ox++) {
            let r = 0, gg = 0, b = 0, valid = 0;
            for (let a = 0; a < nSub; a++) {
                const s = (ox + (a + 0.5) / nSub) / outW;
                const Y = g.Y0 + s * (g.Y1 - g.Y0);
                for (let c = 0; c < nSub; c++) {
                    const t = (oy + (c + 0.5) / nSub) / outH;
                    const X = g.X0 + t * (g.X1 - g.X0);
                    const p = birdsEyeToImage(g, X, Y);
                    if (!p) continue;
                    const u = p.u + su, v = p.v + sv;
                    if (u < 0 || v < 0 || u >= g.W || v >= g.H) continue;
                    // bilinear fetch in the reduced crop (pixel centres at +0.5)
                    const fx = (u - bx) * kx - 0.5, fy = (v - by) * ky - 0.5;
                    const x0 = Math.floor(fx), y0 = Math.floor(fy), wx = fx - x0, wy = fy - y0;
                    const cl = (i, m) => i < 0 ? 0 : (i > m - 1 ? m - 1 : i);
                    const i00 = (cl(y0, ph) * pw + cl(x0, pw)) * 4, i10 = (cl(y0, ph) * pw + cl(x0 + 1, pw)) * 4;
                    const i01 = (cl(y0 + 1, ph) * pw + cl(x0, pw)) * 4, i11 = (cl(y0 + 1, ph) * pw + cl(x0 + 1, pw)) * 4;
                    const w00 = (1 - wx) * (1 - wy), w10 = wx * (1 - wy), w01 = (1 - wx) * wy, w11 = wx * wy;
                    r += px[i00] * w00 + px[i10] * w10 + px[i01] * w01 + px[i11] * w11;
                    gg += px[i00 + 1] * w00 + px[i10 + 1] * w10 + px[i01 + 1] * w01 + px[i11 + 1] * w11;
                    b += px[i00 + 2] * w00 + px[i10 + 2] * w10 + px[i01 + 2] * w01 + px[i11 + 2] * w11;
                    valid++;
                }
            }
            const q = (oy * outW + ox) * 4;
            if (valid) {
                out[q] = r / valid; out[q + 1] = gg / valid; out[q + 2] = b / valid;
                out[q + 3] = 255 * valid / n2;
            }
        }
    }
    return out;
}

function birdsEyeDraw(frame, g, cfg, su, sv, outW, outH, ctx) {
    const cs = [[g.X0, g.Y0], [g.X1, g.Y0], [g.X1, g.Y1], [g.X0, g.Y1]].map(([X, Y]) => birdsEyeToImage(g, X, Y));
    if (cs.some(c => !c)) return;
    const pad = 2;
    const us = cs.map(c => c.u + su), vs = cs.map(c => c.v + sv);
    const bx = Math.max(0, Math.floor(Math.min(...us)) - pad), by = Math.max(0, Math.floor(Math.min(...vs)) - pad);
    const bw = Math.min(g.W, Math.ceil(Math.max(...us)) + pad) - bx, bh = Math.min(g.H, Math.ceil(Math.max(...vs)) + pad) - by;
    if (bw < 2 || bh < 2) return;

    // box-filter the crop by a power of two so that each output pixel covers about one source pixel
    const lateral = (Math.abs(cs[1].u - cs[0].u) + Math.abs(cs[2].u - cs[3].u)) / 2 / outH;
    const forward = Math.abs(cs[0].v - cs[3].v) / outW;
    let r = 1;
    while (r * 2 <= cfg.maxReduce && r * 2 <= Math.min(lateral, forward)) r *= 2;
    const rw = Math.max(1, Math.ceil(bw / r)), rh = Math.max(1, Math.ceil(bh / r));

    const crop = scratchCanvas(5, rw, rh);
    const cctx = crop.getContext("2d");
    drawBox(frame, bx, by, bw, bh, cctx, 0, 0, rw, rh);
    const px = cctx.getImageData(0, 0, rw, rh).data;

    const out = birdsEyeWarp(g, px, rw, rh, bx, by, rw / bw, rh / bh, outW, outH, su, sv, cfg.samples);
    const tmp = scratchCanvas(4, outW, outH);
    tmp.getContext("2d").putImageData(new ImageData(out, outW, outH), 0, 0);
    ctx.drawImage(tmp, 0, 0);
}


function toggleBirdsEye(frames, base, n, on, opts) {
    const s = stripes[n];
    const prev = typeof s.birdsEye === "object" ? s.birdsEye : {};
    const next = on === undefined ? !birdsEyeConfig(s) : !!on;
    s.birdsEye = {...prev, ...(opts || {}), enabled: next};
    slitRect(frames, base, n);
    return next;
}

function drawBirdsEyeDebug(canvas, frame, base, birdsEye) {
    const cfg = birdsEyeConfig({birdsEye: birdsEye || true});
    const W = canvas.width = frame.width, H = canvas.height = frame.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(frame, 0, 0);
    const g = birdsEyeGeometry(W, H, base, cfg);
    if (!g) return false;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0ff";
    ctx.beginPath(); ctx.moveTo(0, g.vHor); ctx.lineTo(W, g.vHor); ctx.stroke();
    ctx.strokeStyle = "#ff0";
    ctx.beginPath();
    [[g.X0, g.Y0], [g.X1, g.Y0], [g.X1, g.Y1], [g.X0, g.Y1], [g.X0, g.Y0]].forEach(([X, Y], i) => {
        const p = birdsEyeToImage(g, X, Y);
        if (i === 0) ctx.moveTo(p.u, p.v); else ctx.lineTo(p.u, p.v);
    });
    ctx.stroke();
    return true;
}


const FLOW_VERSION = 2;

const FLOW_DEFAULTS = {
    rows: 32,
    context: 0.6,
    pxFrac: 0.006,
    blockFrac: 0.06,
    searchFrac: 0.06,
    blockH: 4,
    texMin: 3, confMin: 0.15,
    fbTol: 0.75,
    minFlow: 0.3,
    scalePct: 0.9,
    halfWindow: 1.0,
    movingTol: 1.0,
    movingMinFrames: 3,
    movingMinRows: 3,
    movingMaxFrac: 0.5,
    yawRegion: {x: 0.35, y: 0.2, width: 0.3, height: 0.4},
    dt: 1 / 12,
};

function emphasisConfig(stripe) {
    const e = stripe.emphasis;
    if (!e || (typeof e === "object" && e.enabled === false)) return null;
    const c = {mode: "near", boost: 0.7, fade: 0.35, movingBoost: 0.8, tint: null, tintAmount: 0.35, smooth: 0.5,
        ...(typeof e === "object" ? e : {})};
    if (c.mode === "moving" && e.movingBoost === undefined && typeof e.boost === "number") c.movingBoost = e.boost;
    return c;
}

const _frameSetIds = new WeakMap();
let _frameSetNext = 1;
function frameSetId(frames) {
    if (!_frameSetIds.has(frames)) _frameSetIds.set(frames, _frameSetNext++);
    return _frameSetIds.get(frames);
}

function flowKey(frames, base, stripe) {
    return JSON.stringify([FLOW_VERSION, frameSetId(frames), frames.length, base, stripe.flowOpts || {},
        stripe.fluid && stripe.track ? stripe.trackKey : null]);
}

async function ensureFlow(frames, base, n, onProgress, force, signal) {
    const s = stripes[n], key = flowKey(frames, base, s);
    if (force || !s.flow || s.flow.ver !== FLOW_VERSION || s.flowKey !== key) {
        s.flow = await computeSlitFlow(frames, base, {...(s.flowOpts || {}), track: s.fluid ? s.track : null, onProgress, signal});
        s.flowKey = key;
    }
    return s.flow;
}

async function computeSlitFlow(frames, base, opts = {}) {
    const o = {...FLUID_DEFAULTS, ...FLOW_DEFAULTS, ...opts};
    const N = frames.length, R = o.rows, bh = o.blockH, ch = R * bh;
    const bw = Math.max(4, o.blockW ?? Math.round(o.blockFrac / o.pxFrac));
    let S = Math.max(2, o.maxShift ?? Math.ceil(o.searchFrac / o.pxFrac));
    const cw = Math.min(240, Math.max(o.cw ?? Math.round(o.context / o.pxFrac), bw + 2 * S + 2));   // room for block + search
    const fo = {cw, blockW: bw, blockH: bh, maxShift: S, rows: R, texMin: o.texMin, confMin: o.confMin};

    const out = {ver: FLOW_VERSION, near: new Float32Array(N * R), conf: new Float32Array(N * R),
        moving: new Float32Array(N * R), rows: R, n: N, sign: 1, scale: new Float32Array(N)};
    if (N < 3) return out;
    const grab = o.sampler || fluidGrab, track = o.track || null;

    const ts = o.timestamps || frames.meta?.timestamps;
    const mdt = ts ? Math.max(1e-3, (ts[N - 1] - ts[0]) / (N - 1)) : o.dt;

    let done = 0;
    const total = 2 * N;
    const tick = async () => {
        done++;
        if (o.signal?.aborted) throw new Error("Flow computation aborted");
        if ((done & 15) === 0) { o.onProgress?.(Math.min(1, done / total)); await fluidYield(); }
    };

    const mo = await fluidGlobalMotion(frames, {...o, motionRegion: o.yawRegion}, grab, tick);

    const regionAt = (i) => {
        const r = track ? fluidRectAt(base, track, i) : {x: base.x, y: base.y, w: base.width, h: base.height};
        const wr = Math.min(1, Math.max(cw * o.pxFrac, r.w));
        const x0 = Math.min(1 - wr, Math.max(0, r.x + r.w / 2 - wr / 2));
        const c0 = Math.min(cw - bw - S, Math.max(S, Math.round((r.x + r.w / 2 - x0) / wr * cw - bw / 2)));
        return {x: x0, y: r.y, width: wr, height: r.h, c0};
    };
    const lumOf = (px) => {
        const l = new Float32Array(cw * ch);
        for (let q = 0; q < l.length; q++) l[q] = 0.299 * px[q * 4] + 0.587 * px[q * 4 + 1] + 0.114 * px[q * 4 + 2];
        return l;
    };
    const fx = new Float32Array(N * R).fill(NaN), mq = new Float32Array(N * R), yawPx = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        const reg = regionAt(i);
        yawPx[i] = mo.dx[i] * cw / reg.width;
        if (i > 0) {
 regPrev = {...reg, y: Math.min(1 - reg.height, Math.max(0, reg.y - mo.dy[i]))};
            const cur = lumOf(grab(frames[i], reg, cw, ch)), prev = lumOf(grab(frames[i - 1], regPrev, cw, ch));
            fo.c0 = reg.c0;
            const fwd = flowRows(prev, cur, fo), bwd = flowRows(cur, prev, fo);
            for (let r = 0; r < R; r++) {
                const a = fwd.f[r], b = bwd.f[r];
                if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a + b) <= o.fbTol && Math.abs(a) < S - 0.25) {
                    fx[i * R + r] = a;
                    mq[i * R + r] = fwd.q[r];
                }
            }
        }
        await tick();
    }
    for (let r = 0; r < R; r++) { fx[r] = fx[R + r]; mq[r] = mq[R + r]; }
    yawPx[0] = yawPx[1];

    const fp = new Float32Array(N * R);
    for (let i = 0; i < N; i++) for (let r = 0; r < R; r++) fp[i * R + r] = fx[i * R + r] - yawPx[i];
    const meds = [];
    for (let i = 0; i < N; i++) {
        const v = [];
        for (let r = 0; r < R; r++) { const x = fp[i * R + r]; if (Number.isFinite(x)) v.push(x); }
        if (v.length >= 4) { v.sort((a, b) => a - b); meds.push(flowPercentile(v, 0.5)); }
    }
    meds.sort((a, b) => a - b);
    out.sign = meds.length && flowPercentile(meds, 0.5) < 0 ? -1 : 1;
    for (let q = 0; q < fp.length; q++) fp[q] *= out.sign;

    const half = Math.max(1, Math.round(o.halfWindow / mdt));
    const step = Math.max(1, Math.floor(half / 6));
    const keys = [];
    for (let i = 0; i < N; i += step) keys.push(i);
    if (keys[keys.length - 1] !== N - 1) keys.push(N - 1);
    const keyScale = keys.map(i => {
        const g = [];
        for (let k = Math.max(0, i - half); k <= Math.min(N - 1, i + half); k++)
            for (let r = 0; r < R; r++) { const x = fp[k * R + r]; if (Number.isFinite(x) && x > 0) g.push(x); }
        if (g.length < 8) return 0;
        g.sort((a, b) => a - b);
        return flowPercentile(g, o.scalePct);
    });
    for (let i = 0, kk = 0; i < N; i++) {
        while (kk < keys.length - 2 && keys[kk + 1] < i) kk++;
        const a = keys[kk], b = keys[kk + 1], t = b > a ? (i - a) / (b - a) : 0;
        out.scale[i] = keyScale[kk] * (1 - t) + keyScale[kk + 1] * t;
    }
    const nearRaw = new Float32Array(N * R), confRaw = new Float32Array(N * R), mov = new Float32Array(N * R);
    for (let i = 0; i < N; i++) {
        const s = out.scale[i];
        const gate = flowSmooth(0.5 * o.minFlow, 1.5 * o.minFlow, s);   // fades in / out instead of switching
        const nr = new Float32Array(R).fill(NaN), cf = new Float32Array(R), mr = new Float32Array(R);
        let valid = 0, movCount = 0;
        for (let r = 0; r < R; r++) {
            const v = fp[i * R + r];
            if (!Number.isFinite(v) || gate <= 0) continue;
            valid++;
            nr[r] = Math.min(1, Math.max(0, v / Math.max(s, o.minFlow)));
            cf[r] = gate * (0.5 + 0.5 * mq[i * R + r]);
            mr[r] = Math.min(1, Math.max(0, (-v - o.movingTol) / Math.max(s, o.minFlow)));
            if (mr[r] > 0.3) movCount++;
        }
        if (valid && movCount > o.movingMaxFrac * valid) mr.fill(0);
        const wasNaN = Array.from(nr, v => !Number.isFinite(v));
        flowFillGaps(nr, 3);
        for (let r = 0; r < R; r++) {
            if (!Number.isFinite(nr[r])) { nr[r] = 0; cf[r] = 0; }
            else if (wasNaN[r]) cf[r] = 0.25 * gate;
            nearRaw[i * R + r] = nr[r]; confRaw[i * R + r] = cf[r]; mov[i * R + r] = mr[r];
        }
    }

    const sm = [1, 2, 3, 2, 1];
    for (let i = 0; i < N; i++) for (let r = 0; r < R; r++) {
        let a = 0, b = 0, w = 0;
        for (let k = -2; k <= 2; k++) {
            const j = Math.min(N - 1, Math.max(0, i + k)), c = confRaw[j * R + r], wk = sm[k + 2];
            a += wk * nearRaw[j * R + r] * c; b += wk * c; w += wk;
        }
        out.conf[i * R + r] = b / w;
        out.near[i * R + r] = b > 1e-6 ? a / b : 0;
    }
    out.moving.set(flowOpen(mov, N, R, Math.max(0, (o.movingMinFrames - 1) >> 1), Math.max(0, (o.movingMinRows - 1) >> 1)));
    o.onProgress?.(1);
    return out;
}

function flowOpen(a, N, R, ht, hr) {
    const pass = (src, vertical, radius, useMin) => {
        const dst = new Float32Array(src.length);
        for (let i = 0; i < N; i++) for (let r = 0; r < R; r++) {
            let v = useMin ? Infinity : -Infinity;
            for (let k = -radius; k <= radius; k++) {
                const ii = vertical ? i : Math.min(N - 1, Math.max(0, i + k));
                const rr = vertical ? Math.min(R - 1, Math.max(0, r + k)) : r;
                const x = src[ii * R + rr];
                v = useMin ? Math.min(v, x) : Math.max(v, x);
            }
            dst[i * R + r] = v;
        }
        return dst;
    };
    let m = a;
    if (ht > 0) m = pass(pass(m, false, ht, true), false, ht, false);
    if (hr > 0) m = pass(pass(m, true, hr, true), true, hr, false);
    return m;
}

function flowSmooth(a, b, x) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
}

function flowRows(prev, cur, o) {
    const {cw, blockW: bw, blockH: bh, maxShift: S, rows: R} = o;
    const c0 = o.c0 ?? ((cw - bw) >> 1), n = bw * bh;
    const f = new Float32Array(R).fill(NaN), q = new Float32Array(R);
    const sads = new Float32Array(2 * S + 1), cn = new Float32Array(n), pn = new Float32Array(n);
    for (let r = 0; r < R; r++) {
        const y0 = r * bh;
        let m = 0;
        for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const v = cur[(y0 + y) * cw + c0 + x]; cn[y * bw + x] = v; m += v; }
        m /= n;
        let v2 = 0;
        for (let i = 0; i < n; i++) { cn[i] -= m; v2 += cn[i] * cn[i]; }
        const sd = Math.sqrt(v2 / n);
        if (sd < o.texMin) continue;
        for (let i = 0; i < n; i++) cn[i] /= sd;
        for (let s = -S; s <= S; s++) {
            let mp = 0;
            for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const v = prev[(y0 + y) * cw + c0 + x - s]; pn[y * bw + x] = v; mp += v; }
            mp /= n;
            let vp = 0;
            for (let i = 0; i < n; i++) { pn[i] -= mp; vp += pn[i] * pn[i]; }
            const sp = Math.sqrt(vp / n);
            if (sp < o.texMin * 0.5) { sads[s + S] = 2 * n; continue; }   // flat candidate: worst possible score
            let sad = 0;
            for (let i = 0; i < n; i++) sad += Math.abs(cn[i] - pn[i] / sp);
            sads[s + S] = sad;
        }
        let bi = 0, mean = 0;
        for (let k = 0; k < sads.length; k++) { mean += sads[k]; if (sads[k] < sads[bi]) bi = k; }
        mean /= sads.length;
        let second = Infinity;
        for (let k = 0; k < sads.length; k++) if (Math.abs(k - bi) > 1 && sads[k] < second) second = sads[k];
        const dip = 1 - sads[bi] / (mean + 1e-6), distinct = Number.isFinite(second) ? 1 - sads[bi] / (second + 1e-6) : 1;
        if (dip < o.confMin || distinct < 0.05) continue;                 // flat or ambiguous (periodic) match
        let sub = 0;
        if (bi > 0 && bi < sads.length - 1) {
            const l = sads[bi - 1], mm = sads[bi], rr = sads[bi + 1], den = l - 2 * mm + rr;
            if (den > 0) sub = 0.5 * (l - rr) / den;
        }
        f[r] = (bi - S) + sub;
        q[r] = Math.min(1, distinct / 0.3);
    }
    return {f, q};
}

function flowPercentile(sorted, p) {
    const x = p * (sorted.length - 1), i = Math.floor(x), fr = x - i;
    return sorted[i] * (1 - fr) + (sorted[Math.min(sorted.length - 1, i + 1)]) * fr;
}

function flowFillGaps(a, maxGap) {
    const n = a.length;
    let i = 0;
    while (i < n) {
        if (Number.isFinite(a[i])) { i++; continue; }
        let j = i;
        while (j < n && !Number.isFinite(a[j])) j++;
        if (i > 0 && j < n && j - i <= maxGap) {
            for (let k = i; k < j; k++) a[k] = a[i - 1] + (a[j] - a[i - 1]) * (k - i + 1) / (j - i + 1);
        }
        i = j;
    }
}

function flowRowMap(R, H) {
    const i0 = new Int32Array(H), w = new Float32Array(H);
    for (let y = 0; y < H; y++) {
        const x = Math.min(R - 1, Math.max(0, (y + 0.5) / H * R - 0.5));
        i0[y] = Math.min(R - 2 < 0 ? 0 : R - 2, Math.floor(x));
        w[y] = R > 1 ? x - i0[y] : 0;
    }
    return {i0, w, R};
}

function flowRowsTo(acc, count, map) {
    const H = map.i0.length, out = new Float32Array(H), R = map.R;
    for (let y = 0; y < H; y++) {
        const a = acc[map.i0[y]], b = acc[Math.min(R - 1, map.i0[y] + 1)];
        out[y] = (a * (1 - map.w[y]) + b * map.w[y]) / count;
    }
    return out;
}


/* ------------------------------------------------------------------ rendering of the emphasis */

function flowGauss(sigma) {
    const r = Math.max(1, Math.ceil(3 * sigma)), k = new Float32Array(2 * r + 1);
    let s = 0;
    for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-0.5 * (i / sigma) * (i / sigma)); s += k[i + r]; }
    for (let i = 0; i < k.length; i++) k[i] /= s;
    return k;
}

function flowBlurGrid(a, w, h, sx, sy) {
    const kx = flowGauss(sx), ky = flowGauss(sy), rx = kx.length >> 1, ry = ky.length >> 1;
    const t = new Float32Array(a.length), o = new Float32Array(a.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let s = 0;
        for (let k = -rx; k <= rx; k++) s += kx[k + rx] * a[y * w + Math.min(w - 1, Math.max(0, x + k))];
        t[y * w + x] = s;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let s = 0;
        for (let k = -ry; k <= ry; k++) s += ky[k + ry] * t[Math.min(h - 1, Math.max(0, y + k)) * w + x];
        o[y * w + x] = s;
    }
    return o;
}

function flowBoxPlane(a, w, h, rx, ry) {
    const t = new Float32Array(a.length), o = new Float32Array(a.length);
    const nx = 2 * rx + 1, ny = 2 * ry + 1;
    for (let y = 0; y < h; y++) {
        let s = 0;
        for (let k = -rx; k <= rx; k++) s += a[y * w + Math.min(w - 1, Math.max(0, k))];
        for (let x = 0; x < w; x++) {
            t[y * w + x] = s / nx;
            s += a[y * w + Math.min(w - 1, x + rx + 1)] - a[y * w + Math.max(0, x - rx)];
        }
    }
    for (let x = 0; x < w; x++) {
        let s = 0;
        for (let k = -ry; k <= ry; k++) s += t[Math.min(h - 1, Math.max(0, k)) * w + x];
        for (let y = 0; y < h; y++) {
            o[y * w + x] = s / ny;
            s += t[Math.min(h - 1, y + ry + 1) * w + x] - t[Math.max(0, y - ry) * w + x];
        }
    }
    return o;
}

function applyEmphasisMap(can, maps, nCols, sw, em) {
    const W = can.width, H = can.height, ctx = can.getContext("2d");
    const useNear = em.mode !== "moving", useMov = em.mode !== "near";
    const sx = 1 + 2 * em.smooth, sy = 1 + 2.5 * em.smooth;
    const shape = (g) => g.map(v => flowSmooth(0.1, 0.9, v));
    const B = useNear ? shape(flowBlurGrid(maps.boost, nCols, H, sx, sy)) : null;
    const F = useNear ? shape(flowBlurGrid(maps.fade, nCols, H, sx, sy)) : null;
    const M = useMov ? shape(flowBlurGrid(maps.moving, nCols, H, sx, sy)) : null;

    const img = ctx.getImageData(0, 0, W, H), d = img.data;
    const Y = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) Y[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    const Ym = flowBoxPlane(Y, W, H, Math.max(4, 3 * sw), 5);          // local mean luminance

    let tdR = 0, tdB = 0;
    if (em.tint) {
        const ty = 0.299 * em.tint[0] + 0.587 * em.tint[1] + 0.114 * em.tint[2];
        tdR = em.tint[0] - ty; tdB = em.tint[2] - ty;
    }
    const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const g = Math.min(nCols - 1, (x / sw) | 0) * H + y;
            const mt = useMov ? M[g] : 0, ta = em.tint ? em.tintAmount * mt : 0;
            const b = useNear ? B[g] * em.boost : 0, f = useNear ? F[g] * em.fade : 0, m = mt * (useMov ? em.movingBoost : 0);
            if (b < 1e-3 && f < 1e-3 && m < 1e-3 && ta < 1e-3) continue;  // untouched: exactly the original pixel
            const i = (y * W + x) * 4, yy = Y[y * W + x], mean = Ym[y * W + x];
            const kc = clamp(1 + 0.8 * b - 0.5 * f + 0.8 * m, 0.3, 3);
            const kch = clamp(1 + 0.4 * b - 0.75 * f + 0.4 * m, 0, 2.5);
            const yp = clamp(mean + (yy - mean) * kc, 0, 255);
            let dR = (d[i] - yy) * kch, dB = (d[i + 2] - yy) * kch;
            if (ta > 0) { dR = (1 - ta) * dR + ta * tdR; dB = (1 - ta) * dB + ta * tdB; }   // colourise, luminance kept
            const dG = -(0.299 * dR + 0.114 * dB) / 0.587;
            // gamut mapping: shrink the chroma (not the channels) until R, G, B are inside 0..255
            let t = 1;
            for (const e of [dR, dG, dB]) {
                if (yp + e > 255) t = Math.min(t, (255 - yp) / e);
                else if (yp + e < 0) t = Math.min(t, (0 - yp) / e);
            }
            d[i] = yp + t * dR; d[i + 1] = yp + t * dG; d[i + 2] = yp + t * dB;
        }
    }
    ctx.putImageData(img, 0, 0);
}

async function toggleEmphasis(frames, base, n, on, opts = {}) {
    const s = stripes[n];
    const prev = typeof s.emphasis === "object" ? s.emphasis : {};
    const next = on === undefined ? !emphasisConfig(s) : !!on;
    s.emphasis = {...prev, ...(opts.emphasis || {}), enabled: next};
    if (opts.flow) s.flowOpts = {...(s.flowOpts || {}), ...opts.flow};
    if (next) await ensureFlow(frames, base, n);
    slitRect(frames, base, n);
    return next;
}

function drawFlowDebug(canvas, frames, base, flow, k) {
    const W = canvas.width = frames[k].width, H = canvas.height = frames[k].height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(frames[k], 0, 0);
    const x = base.x * W, y = base.y * H, w = base.width * W, h = base.height * H, bh = h / flow.rows;
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    for (let r = 0; r < flow.rows; r++) {
        const n = flow.near[k * flow.rows + r], c = flow.conf[k * flow.rows + r], m = flow.moving[k * flow.rows + r];
        ctx.fillStyle = m > 0.2 ? `rgba(0,220,255,${0.4 + 0.6 * m})`
            : (c < 0.05 ? "rgba(150,150,150,0.5)" : `rgba(255,${Math.round(255 * (1 - n))},0,${0.2 + 0.8 * c})`);
        ctx.fillRect(Math.max(0, x - 14), y + r * bh, 10, bh - 1);
    }
}


/* ================================================================== fluid slits */

const FLUID_DEFAULTS = {
    mode: "ground",
    seedFrame: 0,
    seedRect: null,
    bandW: 128, bandH: 12,
    tol: 2.0,
    adapt: true,
    adaptRate: 0.03,
    confMin: 0.3,
    searchWin: 0.25,
    tauCenter: 0.25,
    tauWidth: 1.0,
    scaleToPath: true,
    minScale: 0.5, maxScale: 2.5,
    tauHighpass: 1.0,
    shakeGain: 1,
    motionRegion: {x: 0, y: 0.08, width: 1, height: 0.45},
    motionW: 96, motionH: 54, maxLag: 6, motionConfMin: 0.5,
    dt: 1 / 12,
};

async function ensureTrack(frames, base, n, onProgress, force, signal) {
    const s = stripes[n], key = JSON.stringify([frameSetId(frames), frames.length, base, s.fluidOpts || {}]);
    if (force || !s.track || s.trackKey !== key) {
        s.track = await computeSlitTrack(frames, base, {...(s.fluidOpts || {}), onProgress, signal});
        s.trackKey = key;
    }
    return s.track;
}

function fluidRectAt(base, track, k) {
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const w = clamp(base.width * track.s[k], 0.02, 1);
    const h = base.height;
    const cx = base.x + base.width / 2 + track.dx[k];
    return {
        x: clamp(cx - w / 2, 0, 1 - w),
        y: clamp(base.y + track.dy[k], 0, 1 - h),
        w, h
    };
}

function drawTrackDebug(canvas, frames, base, track, k) {
    const W = canvas.width = frames[k].width, H = canvas.height = frames[k].height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(frames[k], 0, 0);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0ff";
    ctx.strokeRect(base.x * W, base.y * H, base.width * W, base.height * H);
    const r = fluidRectAt(base, track, k);
    ctx.strokeStyle = "#ff0";
    ctx.strokeRect(r.x * W, r.y * H, r.w * W, r.h * H);
}

async function computeSlitTrack(frames, base, opts = {}) {
    const o = {...FLUID_DEFAULTS, ...opts};
    const N = frames.length;
    const grab = o.sampler || fluidGrab;

    const track = {
        dx: new Float32Array(N), dy: new Float32Array(N), s: new Float32Array(N).fill(1),
        conf: new Float32Array(N), mode: o.mode, seedFrame: 0, center0: 0, width0: 0
    };
    if (N < 3) return track;

    const ts = o.timestamps || frames.meta?.timestamps;
    const dt = new Float32Array(N);
    for (let i = 1; i < N; i++) dt[i] = ts ? Math.max(1e-3, ts[i] - ts[i - 1]) : o.dt;
    dt[0] = dt[1];

    let done = 0;
    const totalWork = N * (o.mode === "ground" ? 2 : 1);
    const tick = async (n = 1) => {
        done += n;
        if (o.signal?.aborted) throw new Error("Tracking aborted");
        if ((done & 15) === 0) {
            o.onProgress?.(Math.min(1, done / totalWork));
            await fluidYield();
        }
    };

    const motion = await fluidGlobalMotion(frames, o, grab, tick);
    const hp = (cum) => {
        const low = fluidSmooth(cum, dt, o.tauHighpass);
        const out = new Float32Array(N);
        for (let i = 0; i < N; i++) out[i] = (cum[i] - low[i]) * o.shakeGain;
        return out;
    };
    const hfY = hp(fluidCumsum(motion.dy));

    if (o.mode === "shake") {
        const hfX = hp(fluidCumsum(motion.dx));
        track.dx.set(hfX);
        track.dy.set(hfY);
        track.conf.set(motion.conf);
        o.onProgress?.(1);
        return track;
    }
    const path = await fluidPathPass(frames, base, o, grab, tick);
    const cx = fluidSmooth(path.cx, dt, o.tauCenter);
    const lw = fluidSmooth(path.lw, dt, o.tauWidth);
    for (let i = 0; i < N; i++) {
        track.dx[i] = cx[i] - path.c0;
        track.dy[i] = hfY[i];
        track.s[i] = o.scaleToPath
            ? Math.min(o.maxScale, Math.max(o.minScale, Math.exp(lw[i] - Math.log(path.w0))))
            : 1;
        track.conf[i] = path.conf[i];
    }
    track.seedFrame = path.seed;
    track.center0 = path.c0;
    track.width0 = path.w0;
    o.onProgress?.(1);
    return track;
}


/* ------------------------------------------------------------------ global motion (projection matching) */

async function fluidGlobalMotion(frames, o, grab, tick) {
    const N = frames.length, gw = o.motionW, gh = o.motionH, R = o.motionRegion;
    const dx = new Float32Array(N), dy = new Float32Array(N), conf = new Float32Array(N);
    let prevRows = null, prevCols = null;

    for (let i = 0; i < N; i++) {
        const px = grab(frames[i], R, gw, gh);
        const rows = new Float32Array(gh), cols = new Float32Array(gw);
        for (let y = 0; y < gh; y++) {
            for (let x = 0; x < gw; x++) {
                const q = (y * gw + x) * 4;
                const l = 0.299 * px[q] + 0.587 * px[q + 1] + 0.114 * px[q + 2];
                rows[y] += l;
                cols[x] += l;
            }
        }
        for (let y = 0; y < gh; y++) rows[y] /= gw;
        for (let x = 0; x < gw; x++) cols[x] /= gh;

        if (prevRows) {
            const [lagY, cy] = fluidShift1D(prevRows, rows, o.maxLag);
            const [lagX, cxx] = fluidShift1D(prevCols, cols, o.maxLag);
            dy[i] = cy >= o.motionConfMin ? lagY / gh * R.height : 0;
            dx[i] = cxx >= o.motionConfMin ? lagX / gw * R.width : 0;
            conf[i] = Math.min(cy, cxx);
        }
        prevRows = rows;
        prevCols = cols;
        await tick();
    }
    return {dx, dy, conf};
}

function fluidShift1D(a, b, L) {
    const za = fluidNormDiff(a), zb = fluidNormDiff(b), n = za.length;
    const scores = [];
    let best = -Infinity, bi = 0;
    for (let lag = -L; lag <= L; lag++) {
        let s = 0, c = 0;
        for (let y = 0; y < n; y++) {
            const yy = y - lag;
            if (yy < 0 || yy >= n) continue;
            s += zb[y] * za[yy];
            c++;
        }
        s = c > n / 2 ? s / c : -1;
        scores.push(s);
        if (s > best) { best = s; bi = lag; }
    }
    const k = bi + L;
    let sub = 0;
    if (k > 0 && k < scores.length - 1) {
        const l = scores[k - 1], m = scores[k], r = scores[k + 1];
        const den = l - 2 * m + r;
        if (den < 0) sub = 0.5 * (l - r) / den;
    }
    return [bi + sub, best];
}

function fluidNormDiff(p) {
    const n = p.length - 1, d = new Float32Array(n);
    let m = 0;
    for (let i = 0; i < n; i++) { d[i] = p[i + 1] - p[i]; m += d[i]; }
    m /= n;
    let v = 0;
    for (let i = 0; i < n; i++) { d[i] -= m; v += d[i] * d[i]; }
    const sd = Math.sqrt(v / n);
    if (sd < 1e-3) return new Float32Array(n);          // flat: no information
    for (let i = 0; i < n; i++) d[i] /= sd;
    return d;
}


/* ------------------------------------------------------------------ path lock-on (colour model) */

const FLUID_FLOOR = [14, 8, 8];
const FLUID_LUM_RELAX = 2;

async function fluidPathPass(frames, base, o, grab, tick) {
    const N = frames.length, bw = o.bandW, bh = o.bandH;
    const seed = Math.min(N - 1, Math.max(0, o.seedFrame | 0));
    const band = {x: 0, y: base.y, width: 1, height: base.height};    // full width, the rows of the slit
    const seedRect = o.seedRect || {x: base.x + base.width * 0.35, y: base.y, width: base.width * 0.3, height: base.height};

    // colour model from the seed region
    const sw = 24, sh = 12;
    const model0 = fluidModelFrom(fluidFeatStats(grab(frames[seed], seedRect, sw, sh), sw, sh, 0, sw - 1), o.tol);

    // path run in the seed frame
    const px0 = grab(frames[seed], band, bw, bh);
    const run0 = fluidRun(fluidProfile(px0, bw, bh, model0), (seedRect.x + seedRect.width / 2) * bw, bw * 0.5, o.confMin);
    if (!run0) {
        throw new Error("Could not find the path in the seed frame: the seed region does not look uniform. "
            + "Pass seedFrame / seedRect covering only the path.");
    }
    const c0 = run0.c / bw, w0 = Math.max(run0.w / bw, 1 / bw);

    const cx = new Float32Array(N), lw = new Float32Array(N), conf = new Float32Array(N), valid = new Uint8Array(N);
    cx[seed] = c0; lw[seed] = Math.log(w0); conf[seed] = run0.conf; valid[seed] = 1;

    for (const step of [1, -1]) {
        let model = {mu: model0.mu.slice(), sd: model0.sd.slice()};
        let c = c0, w = w0, lost = 0;
        for (let i = seed + step; i >= 0 && i < N; i += step) {
            const px = grab(frames[i], band, bw, bh);
            const p = fluidProfile(px, bw, bh, model);
            const win = Math.min(bw, Math.max(6, o.searchWin * bw) * (1 + 0.5 * lost));
            const run = fluidRun(p, c * bw, win, o.confMin);
            if (run) {
                c = run.c / bw;
                w = Math.max(run.w / bw, 1 / bw);
                lost = 0;
                valid[i] = 1;
                conf[i] = run.conf;
                if (o.adapt && run.conf >= 0.5) {
                    const x0 = Math.floor(run.l + 0.25 * run.w), x1 = Math.max(x0, Math.ceil(run.l + 0.75 * run.w) - 1);
                    model = fluidAdapt(model, model0, fluidFeatStats(px, bw, bh, x0, x1), o);
                }
            } else {
                lost++;
            }
            cx[i] = c;
            lw[i] = Math.log(w);
            await tick();
        }
    }

    fluidFill(cx, valid);
    fluidFill(lw, valid);
    return {cx: fluidMedian(cx, 2), lw: fluidMedian(lw, 2), conf, c0, w0, seed};
}

function fluidProfile(px, bw, bh, m) {
    const p = new Float32Array(bw);
    for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
            const q = (y * bw + x) * 4;
            p[x] += fluidScore(m, px[q], px[q + 1], px[q + 2]);
        }
    }
    for (let x = 0; x < bw; x++) p[x] /= bh;
    return fluidBox(p, 2);
}

function fluidScore(m, r, g, b) {
    const dl = ((r + g + b) / 3 - m.mu[0]) / (m.sd[0] * FLUID_LUM_RELAX);
    const du = ((r - g) - m.mu[1]) / m.sd[1];
    const dv = (((r + g) / 2 - b) - m.mu[2]) / m.sd[2];
    return Math.exp(-0.5 * (dl * dl + du * du + dv * dv));
}

function fluidFeatStats(px, bw, bh, x0, x1) {
    const sum = [0, 0, 0], sq = [0, 0, 0];
    let n = 0;
    for (let y = 0; y < bh; y++) {
        for (let x = x0; x <= x1; x++) {
            const q = (y * bw + x) * 4;
            const f = [(px[q] + px[q + 1] + px[q + 2]) / 3, px[q] - px[q + 1], (px[q] + px[q + 1]) / 2 - px[q + 2]];
            for (let c = 0; c < 3; c++) { sum[c] += f[c]; sq[c] += f[c] * f[c]; }
            n++;
        }
    }
    const mean = sum.map(s => s / n);
    const std = sq.map((s, c) => Math.sqrt(Math.max(0, s / n - mean[c] * mean[c])));
    return {mean, std};
}

function fluidModelFrom(stats, tol) {
    return {mu: stats.mean.slice(), sd: stats.std.map((s, c) => Math.max(s * tol, FLUID_FLOOR[c]))};
}

function fluidAdapt(model, model0, stats, o) {
    const a = o.adaptRate;

    for (let c = 0; c < 3; c++) if (Math.abs(stats.mean[c] - model0.mu[c]) / model0.sd[c] > 4) return model;
    return {
        mu: model.mu.map((m, c) => (1 - a) * m + a * stats.mean[c]),
        sd: model.sd.map((s, c) => Math.max(FLUID_FLOOR[c], (1 - a) * s + a * stats.std[c] * o.tol)),
    };
}

function fluidRun(p, c0, win, confMin) {
    const n = p.length;
    const lo = Math.max(0, Math.round(c0 - win)), hi = Math.min(n - 1, Math.round(c0 + win));
    let bi = -1, bv = -1;
    for (let x = lo; x <= hi; x++) if (p[x] > bv) { bv = p[x]; bi = x; }
    if (bi < 0 || bv < confMin) return null;
    const thr = Math.max(confMin, 0.5 * bv);
    let l = bi, r = bi;
    while (l > 0 && p[l - 1] > thr) l--;
    while (r < n - 1 && p[r + 1] > thr) r++;
    return {c: (l + r + 1) / 2, w: r - l + 1, l, conf: bv};
}


function fluidBox(a, R) {
    const n = a.length, out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        let s = 0, c = 0;
        for (let j = Math.max(0, i - R); j <= Math.min(n - 1, i + R); j++) { s += a[j]; c++; }
        out[i] = s / c;
    }
    return out;
}

function fluidSmooth(arr, dt, tau) {
    const n = arr.length, f = new Float32Array(n), b = new Float32Array(n), out = new Float32Array(n);
    f[0] = arr[0];
    for (let i = 1; i < n; i++) f[i] = f[i - 1] + (1 - Math.exp(-dt[i] / tau)) * (arr[i] - f[i - 1]);
    b[n - 1] = arr[n - 1];
    for (let i = n - 2; i >= 0; i--) b[i] = b[i + 1] + (1 - Math.exp(-dt[i + 1] / tau)) * (arr[i] - b[i + 1]);
    for (let i = 0; i < n; i++) out[i] = 0.5 * (f[i] + b[i]);
    return out;
}

function fluidCumsum(a) {
    const out = new Float32Array(a.length);
    let s = 0;
    for (let i = 0; i < a.length; i++) { s += a[i]; out[i] = s; }
    return out;
}

function fluidMedian(a, R) {
    const n = a.length, out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const w = [];
        for (let j = Math.max(0, i - R); j <= Math.min(n - 1, i + R); j++) w.push(a[j]);
        w.sort((x, y) => x - y);
        out[i] = w[w.length >> 1];
    }
    return out;
}

function fluidFill(a, valid) {
    const n = a.length;
    let prev = -1;
    for (let i = 0; i < n; i++) {
        if (!valid[i]) continue;
        if (prev < 0) for (let j = 0; j < i; j++) a[j] = a[i];
        else for (let j = prev + 1; j < i; j++) a[j] = a[prev] + (a[i] - a[prev]) * (j - prev) / (i - prev);
        prev = i;
    }
    if (prev >= 0) for (let j = prev + 1; j < n; j++) a[j] = a[prev];
}


/* ------------------------------------------------------------------ pixel access (browser) */

const _grab = {};
function fluidGrab(frame, region, w, h) {
    const key = w + "x" + h;
    const c = _grab[key] || (_grab[key] = Object.assign(document.createElement("canvas"), {width: w, height: h}));
    const ctx = c.getContext("2d", {willReadFrequently: true});
    ctx.clearRect(0, 0, w, h);
    const fw = frame.width, fh = frame.height;
    drawBox(frame, region.x * fw, region.y * fh, Math.max(1, region.width * fw), Math.max(1, region.height * fh), ctx, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h).data;
}

let _fluidMC = null;
const _fluidPending = [];
function fluidYield() {
    if (typeof MessageChannel === "undefined") return new Promise(r => setTimeout(r, 0));
    if (!_fluidMC) {
        _fluidMC = new MessageChannel();
        _fluidMC.port1.onmessage = () => { const f = _fluidPending.shift(); if (f) f(); };
    }
    return new Promise(r => { _fluidPending.push(r); _fluidMC.port2.postMessage(0); });
}
