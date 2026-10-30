const STRIPE_DEFAULTS = {
    fov: false, flip: false, skew: false, scale: 1,
    size: [1, 100], fps: 1,
    lengthMode: "duration", pxPerSecond: 10, oversample: 2, minLength: 512, maxLength: 6000, average: true, maxAverage: 12,
    birdsEye: {enabled: false, hfov: 70, angleBy: "pitch", horizon: 0.4, pitch: 20, samples: 3},
    fluid: false,
    fluidOpts: {mode: "ground", seedFrame: 0, scaleToPath: true, shakeGain: 1, tauHighpass: 1},
    sweep: {enabled: false, direction: "right", endMode: "edge", endX: 0.5, ease: "linear", positionPer: "frame"},
    emphasis: {enabled: false, preset: "balanced", mode: "near", boost: 0.7, fade: 0.35, movingBoost: 0.8, smooth: 0.5,
        tintOn: false, tint: "#00c8ff", tintAmount: 0.35},
    flowOpts: {halfWindow: 1, minFlow: 0.3, movingTol: 1, context: 0.6},
};

const EMPHASIS_PRESETS = {
    subtle: {boost: 0.4, fade: 0.2},
    balanced: {boost: 0.7, fade: 0.35},
    strong: {boost: 1.0, fade: 0.6},
};

const SS = {n: null, draft: null, abort: null, busy: false, frame: 0, rules: [], previews: {}};


const ssClone = (v) => JSON.parse(JSON.stringify(v));
const ssHex = (rgb) => "#" + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const ssRgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

const ssEnum = (v, list, def) => list.includes(v) ? v : def;

function readDraft(s) {
    const D = ssClone(STRIPE_DEFAULTS);
    for (const k of ["fov", "flip", "skew", "scale", "fps", "lengthMode", "pxPerSecond", "oversample", "minLength", "maxLength",
        "average", "maxAverage"]) {
        if (s[k] !== undefined) D[k] = s[k];
    }
    D.lengthMode = ssEnum(D.lengthMode, ["duration", "path", "frames"], "duration");
    if (Array.isArray(s.size)) D.size = [s.size[0], s.size[1]];

    const b = s.birdsEye;
    if (b) {
        D.birdsEye.enabled = !(typeof b === "object" && b.enabled === false);
        if (typeof b === "object") {
            for (const k of ["hfov", "pitch", "samples"]) if (b[k] !== undefined) D.birdsEye[k] = b[k];
            if (b.horizon !== undefined && b.horizon !== null) { D.birdsEye.horizon = b.horizon; D.birdsEye.angleBy = "horizon"; }
        }
    }

    D.fluid = !!s.fluid;
    Object.assign(D.fluidOpts, s.fluidOpts || {});
    D.fluidOpts.mode = ssEnum(D.fluidOpts.mode, ["ground", "shake"], "ground");

    const w = s.sweep;
    if (w) {
        D.sweep.enabled = !(typeof w === "object" && w.enabled === false);
        if (typeof w === "object") {
            D.sweep.direction = ssEnum(w.direction, ["right", "left"], "right");
            if (w.endX !== undefined && w.endX !== null && Number.isFinite(+w.endX)) { D.sweep.endMode = "custom"; D.sweep.endX = +w.endX; }
            D.sweep.ease = ssEnum(w.ease, ["linear", "smooth"], "linear");
            D.sweep.positionPer = ssEnum(w.positionPer, ["frame", "column"], "frame");
        }
    }

    const e = s.emphasis;
    if (e) {
        D.emphasis.enabled = !(typeof e === "object" && e.enabled === false);
        if (typeof e === "object") {
            for (const k of ["mode", "boost", "fade", "movingBoost", "smooth", "tintAmount"]) if (e[k] !== undefined) D.emphasis[k] = e[k];
            if (Array.isArray(e.tint) && e.tint.length === 3 && e.tint.every(Number.isFinite)) { D.emphasis.tintOn = true; D.emphasis.tint = ssHex(e.tint); }
            if (e.mode === "moving" && e.movingBoost === undefined && typeof e.boost === "number") D.emphasis.movingBoost = e.boost;
        }
    }
    D.emphasis.mode = ssEnum(D.emphasis.mode, ["near", "moving", "both"], "near");
    D.emphasis.preset = ssPresetOf(D.emphasis);
    Object.assign(D.flowOpts, s.flowOpts || {});
    return D;
}

function ssPresetOf(em) {
    for (const [name, p] of Object.entries(EMPHASIS_PRESETS)) {
        if (Math.abs(em.boost - p.boost) < 1e-6 && Math.abs(em.fade - p.fade) < 1e-6) return name;
    }
    return "custom";
}

function writeDraft(s, D) {
    const num = (v, lo, hi, def) => { v = +v; return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def; };
    s.fov = !!D.fov; s.flip = !!D.flip; s.skew = !!D.skew;
    s.scale = num(D.scale, 0.1, 2, 1);
    s.size = [Math.round(num(D.size[0], 1, 64, 1)), Math.round(num(D.size[1], 1, 1000, 100))];
    s.fps = Math.round(num(D.fps, 1, 1000, 1));
    s.lengthMode = D.lengthMode;
    s.pxPerSecond = num(D.pxPerSecond, 0.1, 1000, 10);
    s.oversample = num(D.oversample, 0.1, 20, 2);
    s.minLength = Math.round(num(D.minLength, 16, 16000, 512));
    s.maxLength = Math.round(num(D.maxLength, 64, 16000, 6000));
    if (s.minLength > s.maxLength) s.minLength = s.maxLength;
    s.average = !!D.average;
    s.maxAverage = Math.round(num(D.maxAverage, 1, 200, 12));

    const b = D.birdsEye;
    s.birdsEye = {enabled: !!b.enabled, hfov: num(b.hfov, 20, 179, 70), pitch: num(b.pitch, -10, 80, 20),
        horizon: b.angleBy === "horizon" ? num(b.horizon, 0, 1, 0.4) : null, samples: Math.round(num(b.samples, 1, 6, 3))};

    s.fluid = !!D.fluid;
    const f = D.fluidOpts;
    s.fluidOpts = {mode: f.mode, seedFrame: Math.round(num(f.seedFrame, 0, 1e6, 0)), scaleToPath: !!f.scaleToPath,
        shakeGain: num(f.shakeGain, 0, 3, 1), tauHighpass: num(f.tauHighpass, 0.1, 10, 1)};

    const w = D.sweep;      // endX null = sweep to the frame edge; read by slitSweep (slit.sweep.js)
    s.sweep = {enabled: !!w.enabled, direction: w.direction === "left" ? "left" : "right",
        endX: w.endMode === "custom" ? num(w.endX, 0, 1, 0.5) : null,
        ease: w.ease === "smooth" ? "smooth" : "linear", positionPer: w.positionPer === "column" ? "column" : "frame"};

    const e = D.emphasis;
    s.emphasis = {enabled: !!e.enabled, mode: e.mode, boost: num(e.boost, 0, 2, 0.7), fade: num(e.fade, 0, 1, 0.35),
        movingBoost: num(e.movingBoost, 0, 2, 0.8), smooth: num(e.smooth, 0, 1, 0.5),
        tint: e.tintOn ? ssRgb(e.tint) : null, tintAmount: num(e.tintAmount, 0, 1, 0.35)};
    const o = D.flowOpts;
    s.flowOpts = {halfWindow: num(o.halfWindow, 0.2, 10, 1), minFlow: num(o.minFlow, 0.05, 5, 0.3),
        movingTol: num(o.movingTol, 0.2, 10, 1), context: num(o.context, 0.1, 1, 0.6)};
}

function ssEl(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k.startsWith("on")) el[k] = v;
        else if (v === true) el.setAttribute(k, "");
        else if (v !== false && v !== null && v !== undefined) el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid) el.append(kid);
    return el;
}

let _ssId = 0;
function ssRule(el, rule) { SS.rules.push({el, ...rule}); }

function ssRefresh() {
    for (const r of SS.rules) {
        const show = r.show ? !!r.show() : true, enabled = r.enable ? !!r.enable() : true;
        r.el.hidden = !show;
        r.el.inert = !enabled;
        r.el.classList.toggle("ssOff", !enabled);
    }
    ssRefreshStatus();
}

function ssField(label, input, hint) {
    const id = "ss" + (++_ssId);
    input.id = id;
    const wrap = ssEl("div", {class: "ssField"}, ssEl("label", {for: id, text: label}), input);
    if (hint) wrap.append(ssEl("div", {class: "ssHint", text: hint}));
    return wrap;
}

function ssFieldFor(label, wrapper, control, hint) {
    const id = "ss" + (++_ssId);
    control.id = id;
    const w = ssEl("div", {class: "ssField"}, ssEl("label", {for: id, text: label}), wrapper);
    if (hint) w.append(ssEl("div", {class: "ssHint", text: hint}));
    return w;
}

function ssCheck(label, get, set, hint) {
    const i = ssEl("input", {type: "checkbox"});
    i.checked = !!get();
    i.onchange = () => { set(i.checked); ssRefresh(); };
    const wrap = ssField(label, i, hint);
    wrap.classList.add("ssCheck");
    return wrap;
}

function ssNumber(label, get, set, {min, max, step = 1, unit = "", hint} = {}) {
    const i = ssEl("input", {type: "number", min, max, step});
    i.value = get();
    const commit = () => { if (i.value !== "" && Number.isFinite(+i.value)) { set(+i.value); ssRefresh(); } };
    i.oninput = commit; i.onchange = commit;
    const wrap = ssField(label, i, hint);
    if (unit) wrap.querySelector("label").textContent = `${label} (${unit})`;
    return wrap;
}

function ssRange(label, get, set, {min, max, step, hint, fmt = v => (+v).toFixed(2)} = {}) {
    const i = ssEl("input", {type: "range", min, max, step});
    i.value = get();
    const out = ssEl("output", {text: fmt(get())});
    i.oninput = () => { set(+i.value); out.textContent = fmt(i.value); ssRefresh(); };
    const wrap = ssFieldFor(label, ssEl("div", {class: "ssRange"}, i, out), i, hint);
    wrap.rangeInput = i; wrap.rangeOut = out; wrap.fmt = fmt;
    return wrap;
}

function ssSelect(label, options, get, set, hint) {
    const i = ssEl("select", {}, options.map(([v, t]) => ssEl("option", {value: v, text: t})));
    i.value = get();
    i.onchange = () => { set(i.value); ssRefresh(); };
    return ssField(label, i, hint);
}

function ssSection(title, {toggle, help} = {}, ...fields) {
    const head = ssEl("div", {class: "ssHead"});
    if (toggle) {
        const id = "ss" + (++_ssId), c = ssEl("input", {type: "checkbox", id});
        c.checked = !!toggle.get();
        c.onchange = () => { toggle.set(c.checked); ssRefresh(); };
        head.append(c, ssEl("label", {for: id, text: title}));
    } else head.append(ssEl("span", {text: title}));
    const body = ssEl("div", {class: "ssGrid"}, fields);
    const sec = ssEl("section", {class: "ssSection"}, head);
    if (help) sec.append(ssEl("div", {class: "ssHelp", text: help}));
    sec.append(body);
    sec.body = body;
    if (toggle) ssRule(body, {enable: toggle.get});
    return sec;
}

function ssPreview(key, label, draw, needs) {
    const cv = ssEl("canvas", {class: "ssPreview", width: 320, height: 180});
    const msg = ssEl("div", {class: "ssHint ssPreviewMsg"});
    const box = ssEl("div", {class: "ssPreviewBox"}, ssEl("div", {class: "ssHint", text: label}), cv, msg);
    SS.previews[key] = () => {
        const s = stripes[SS.n], frames = typeof gframes !== "undefined" ? gframes : [];
        cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
        const why = !frames.length ? "Load a video first." : (!s.rect ? "Draw a rectangular slit on the video first." : needs && needs(s));
        if (why) { msg.textContent = why; return; }
        const k = Math.min(frames.length - 1, SS.frame);
        try { msg.textContent = draw(cv, frames, s, k) || ""; } catch (err) { msg.textContent = String(err.message || err); }
    };
    return box;
}

function openStripeSettings(n) {
    n = String(n);
    const s = stripes[n];
    if (!s) return;
    normalizeStripe(s);
    SS.n = n;
    SS.draft = readDraft(s);
    SS.frame = 0;
    SS.busy = false;
    buildStripeSettings();
    document.getElementById("stripeSettings").showModal();
    ssRefresh();
    Object.values(SS.previews).forEach(f => f());
}

function closeStripeSettings() {
    SS.abort?.abort();
    const d = document.getElementById("stripeSettings");
    if (d.open) d.close();
}

function buildStripeSettings() {
    const D = SS.draft, dlg = document.getElementById("stripeSettings"), body = document.getElementById("stripeSettingsBody");
    const title = document.getElementById("stripeSettingsTitle");
    const s = stripes[SS.n];
    title.textContent = `Stripe settings · ${isNaN(+SS.n) ? SS.n : "stripe " + (+SS.n + 1)}`;
    body.innerHTML = "";
    SS.rules = []; SS.previews = {};

    const nFrames = typeof gframes !== "undefined" ? gframes.length : 0;
    const bird = () => D.birdsEye.enabled;
    const em = () => D.emphasis;

    const frameRange = ssRange("Preview frame", () => SS.frame, v => { SS.frame = Math.round(v); Object.values(SS.previews).forEach(f => f()); },
        {min: 0, max: Math.max(0, nFrames - 1), step: 1, fmt: v => String(Math.round(v)),
            hint: "Used by the previews below; it does not change the stripe."});
    frameRange.classList.add("ssFrameRow");

    const rectInfo = ssEl("div", {class: "ssHint", id: "ssRectInfo"});
    const slitSec = ssSection("Slit", {},
        ssEl("div", {class: "ssField ssWide"},
            ssEl("button", {type: "button", class: "ssBtn", text: "Draw rectangle on video",
                onclick: () => { closeStripeSettings(); toggleSlitEdit("rect", SS.n, document.querySelector(`.rectSlit[row='${SS.n}']`), true); }}),
            ssEl("button", {type: "button", class: "ssBtn", text: "Draw line on video",
                onclick: () => { closeStripeSettings(); toggleSlitEdit("line", SS.n, document.querySelector(`.lineSlit[row='${SS.n}']`), true); }}),
            rectInfo),
        ssCheck("Rotate 90° (FoV)", () => D.fov, v => D.fov = v, "Keeps horizontal features, such as the ground, readable."),
        ssCheck("Flip 180°", () => D.flip, v => D.flip = v),
        ssCheck("Skew when merged", () => D.skew, v => D.skew = v, "Shears this stripe when the stripes are merged."),
        ssRange("Scale in merged stripe", () => D.scale, v => D.scale = v, {min: 0.1, max: 2, step: 0.1}));
    ssRule(slitSec.body.children[1], {enable: () => !bird() && !D.sweep.enabled});   // "Rotate 90°" is ignored by the bird's-eye view and the sweep
    rectInfo.textContent = s.rect
        ? `Rectangle: x ${s.rect.x.toFixed(3)}, y ${s.rect.y.toFixed(3)}, w ${s.rect.width.toFixed(3)}, h ${s.rect.height.toFixed(3)}`
        : (s.points ? "Line slit" : "No slit drawn yet.");

    const lenSec = ssSection("Sampling and length", {},
        ssSelect("Stripe length", [["duration", "Follows the video length"], ["path", "Follows the drawn path"], ["frames", "Fixed frames per column"]],
            () => D.lengthMode, v => D.lengthMode = v,
            "Duration: pixels per second of video. Path: pixels of the drawn path × oversampling (more detail when zooming)."),
        ssNumber("Pixels per second", () => D.pxPerSecond, v => D.pxPerSecond = v, {min: 0.1, max: 1000, step: 0.5, unit: "px/s"}),
        ssNumber("Oversampling", () => D.oversample, v => D.oversample = v, {min: 0.1, max: 20, step: 0.5, unit: "×"}),
        ssNumber("Frames per column", () => D.fps, v => D.fps = v, {min: 1, max: 1000, step: 1, unit: "frames", hint: "Each column merges this many frames."}),
        ssNumber("Minimum length", () => D.minLength, v => D.minLength = v, {min: 16, max: 16000, step: 16, unit: "px"}),
        ssNumber("Maximum length", () => D.maxLength, v => D.maxLength = v, {min: 64, max: 16000, step: 64, unit: "px"}),
        ssCheck("Average the frames of a column", () => D.average, v => D.average = v, "Off: one frame per column (sharper, noisier)."),
        ssNumber("Frames averaged at most", () => D.maxAverage, v => D.maxAverage = v, {min: 1, max: 200, step: 1, hint: "Evenly subsampled when a column has more."}),
        ssNumber("Sample width", () => D.size[0], v => D.size[0] = v, {min: 1, max: 64, step: 1, unit: "px"}),
        ssNumber("Sample height", () => D.size[1], v => D.size[1] = v, {min: 1, max: 1000, step: 1, unit: "px"}));
    const lf = lenSec.body.children;
    ssRule(lf[1], {show: () => D.lengthMode === "duration"});
    ssRule(lf[2], {show: () => D.lengthMode === "path"});
    ssRule(lf[3], {show: () => D.lengthMode === "frames"});
    ssRule(lf[4], {show: () => D.lengthMode !== "frames"});
    ssRule(lf[5], {show: () => D.lengthMode !== "frames"});
    ssRule(lf[7], {enable: () => D.average});

    /* ---- Sweeping slit ---- */
    const sw = D.sweep;
    const sweepOpts = () => ({direction: sw.direction, endX: sw.endMode === "custom" ? +sw.endX : null, ease: sw.ease, positionPer: sw.positionPer});
    const sweepSec = ssSection("Sweeping slit", {toggle: {get: () => sw.enabled, set: v => sw.enabled = v},
            help: "A vertical slit that moves across the frame during the whole video, starting from the drawn rectangle. Each column of the stripe is what the slit sees at that moment. Uses the sampling and length settings above."},
        ssSelect("Direction", [["right", "Left → right"], ["left", "Right → left"]], () => sw.direction, v => sw.direction = v,
            "The slit starts at the drawn rectangle and moves this way."),
        ssSelect("End position", [["edge", "Frame edge"], ["custom", "Custom"]], () => sw.endMode, v => sw.endMode = v),
        ssRange("End x", () => sw.endX, v => sw.endX = v, {min: 0, max: 1, step: 0.01,
            hint: "Left edge of the slit at the last frame: 0 = left of the frame, 1 = right."}),
        ssSelect("Speed", [["linear", "Constant"], ["smooth", "Slow start and end"]], () => sw.ease, v => sw.ease = v),
        ssSelect("Slit position", [["frame", "Follows every frame"], ["column", "One position per column"]], () => sw.positionPer, v => sw.positionPer = v,
            "One position per column gives sharper columns when many frames are averaged."),
        ssPreview("sweep", "First and last slit position (cyan), slit at the preview frame (yellow)", (cv, frames, st, k) => {
            drawSweepDebug(cv, frames, st.rect, sweepOpts(), k);
            return st.rect.height < st.rect.width ? "The rectangle is wider than tall: a sweeping slit is meant to be vertical." : "";
        }, st => (st.type === "line" ? "The sweeping slit needs a rectangular slit." : null)));
    ssRule(sweepSec.body.children[2], {show: () => sw.endMode === "custom"});
    const sweepWarn = ssEl("div", {class: "ssWarn", role: "status"});
    ssRule(sweepWarn, {show: () => {
            const ignored = [];
            if (D.fov) ignored.push("Rotate 90°");
            if (bird()) ignored.push("bird's-eye view");
            if (D.fluid) ignored.push("fluid slit");
            if (em().enabled) ignored.push("flow emphasis");
            sweepWarn.textContent = sw.enabled && ignored.length ? `Ignored while the sweeping slit is on: ${ignored.join(", ")}.` : "";
            return !!sweepWarn.textContent;
        }});
    sweepSec.insertBefore(sweepWarn, sweepSec.body);

    const be = D.birdsEye;
    const birdSec = ssSection("Bird's-eye view", {toggle: {get: () => be.enabled, set: v => be.enabled = v},
            help: "Rectifies the ground slit to a top-down view with a simple camera model, so the ground stripe has a uniform scale."},
        ssNumber("Horizontal field of view", () => be.hfov, v => be.hfov = v, {min: 20, max: 179, step: 1, unit: "°",
            hint: "Phones ≈ 65-70°, GoPro wide is much larger."}),
        ssSelect("Camera angle given by", [["pitch", "Pitch below the horizon"], ["horizon", "Row of the horizon"]], () => be.angleBy, v => be.angleBy = v),
        ssNumber("Pitch", () => be.pitch, v => be.pitch = v, {min: -10, max: 80, step: 1, unit: "°"}),
        ssRange("Horizon row", () => be.horizon, v => be.horizon = v, {min: 0, max: 1, step: 0.01, hint: "0 = top of the frame, 1 = bottom."}),
        ssNumber("Supersampling", () => be.samples, v => be.samples = v, {min: 1, max: 6, step: 1, hint: "Taps per output pixel and axis."}),
        ssPreview("bird", "Ground patch (yellow) and horizon (cyan)", (cv, frames, st, k) => {
            const cfg = {hfov: +be.hfov, pitch: +be.pitch, horizon: be.angleBy === "horizon" ? +be.horizon : null, samples: be.samples};
            return drawBirdsEyeDebug(cv, frames[k], st.rect, cfg) ? "" : "The slit must be below the horizon.";
        }, st => (st.type === "line" ? "Bird's-eye needs a rectangular slit." : null)));
    const bf = birdSec.body.children;
    ssRule(bf[2], {show: () => be.angleBy === "pitch"});
    ssRule(bf[3], {show: () => be.angleBy === "horizon"});

    const fo = D.fluidOpts;
    const trackStatus = ssEl("div", {class: "ssHint ssStatus", id: "ssTrackStatus"});
    const fluidSec = ssSection("Fluid slit (tracking)", {toggle: {get: () => D.fluid, set: v => D.fluid = v},
            help: "The slit follows the ground path and cancels running bounce, frame by frame."},
        ssSelect("Mode", [["ground", "Follow the ground path + cancel bounce"], ["shake", "Cancel bounce / yaw only"]], () => fo.mode, v => fo.mode = v),
        ssNumber("Seed frame", () => fo.seedFrame, v => fo.seedFrame = v, {min: 0, max: Math.max(0, nFrames - 1), step: 1,
            hint: "A frame where the middle of the slit is on the path."}),
        ssCheck("Scale with the path width", () => fo.scaleToPath, v => fo.scaleToPath = v),
        ssRange("Bounce compensation", () => fo.shakeGain, v => fo.shakeGain = v, {min: 0, max: 2, step: 0.05}),
        ssRange("Bounce / slope split", () => fo.tauHighpass, v => fo.tauHighpass = v, {min: 0.2, max: 4, step: 0.1,
            fmt: v => (+v).toFixed(1) + " s", hint: "Motion faster than this is cancelled; slower motion (slopes, turns) is kept."}),
        ssEl("div", {class: "ssField ssWide"}, ssEl("button", {type: "button", class: "ssBtn", text: "↻ Recompute track",
            onclick: () => ssApply({force: "track"})}), trackStatus),
        ssPreview("fluid", "Static slit (cyan) and tracked slit (yellow)", (cv, frames, st, k) => {
            if (!st.track || st.track.dx.length !== frames.length) return "Compute the track to see it here.";
            drawTrackDebug(cv, frames, st.rect, st.track, k);
            return "";
        }, st => (st.type === "line" ? "Tracking needs a rectangular slit." : null)));
    ssRule(fluidSec.body.children[2], {show: () => fo.mode === "ground"});

    /* ---- Flow emphasis ---- */
    const flowStatus = ssEl("div", {class: "ssHint ssStatus", id: "ssFlowStatus"});
    const presetField = ssSelect("Preset", [["subtle", "Subtle"], ["balanced", "Balanced"], ["strong", "Strong"], ["custom", "Custom"]],
        () => em().preset, v => {
            em().preset = v;
            if (EMPHASIS_PRESETS[v]) {
                Object.assign(em(), EMPHASIS_PRESETS[v]);
                boostF.rangeInput.value = em().boost; boostF.rangeOut.textContent = boostF.fmt(em().boost);
                fadeF.rangeInput.value = em().fade; fadeF.rangeOut.textContent = fadeF.fmt(em().fade);
            }
        });
    const custom = () => { em().preset = ssPresetOf(em()); presetField.querySelector("select").value = em().preset; };
    const boostF = ssRange("Boost near objects", () => em().boost, v => { em().boost = v; custom(); }, {min: 0, max: 2, step: 0.05,
        hint: "More luminance contrast and chroma on near objects. Hue and average brightness are kept."});
    const fadeF = ssRange("Mute far areas", () => em().fade, v => { em().fade = v; custom(); }, {min: 0, max: 1, step: 0.05,
        hint: "Less contrast and chroma where the flow clearly says \"far\". Rows without a reliable estimate are never changed."});
    const flowSec = ssSection("Flow emphasis (trees, poles, cars)", {toggle: {get: () => em().enabled, set: v => em().enabled = v},
            help: "Uses optical flow: objects that cross the image faster than the rest are near. Side slits only (not rotated, not bird's-eye)."},
        ssSelect("Emphasise", [["near", "Near objects"], ["moving", "Movers (counter-flow)"], ["both", "Both"]], () => em().mode, v => em().mode = v),
        presetField, boostF, fadeF,
        ssRange("Moving objects boost", () => em().movingBoost, v => em().movingBoost = v, {min: 0, max: 2, step: 0.05,
            hint: "Contrast and chroma for objects moving against the expected flow."}),
        ssRange("Smoothing", () => em().smooth, v => em().smooth = v, {min: 0, max: 1, step: 0.05, hint: "Removes flicker between neighbouring columns and rows."}),
        ssCheck("Tint movers", () => em().tintOn, v => em().tintOn = v, "Off by default. The tint keeps the luminance."),
        ssEl("div", {class: "ssField"}, ssEl("label", {text: "Tint colour"}), (() => {
            const c = ssEl("input", {type: "color", value: em().tint, "aria-label": "Tint colour"});
            c.oninput = () => { em().tint = c.value; };
            return c;
        })()),
        ssRange("Tint amount", () => em().tintAmount, v => em().tintAmount = v, {min: 0, max: 1, step: 0.05}),
        ssEl("details", {class: "ssField ssWide ssAdvanced"}, ssEl("summary", {text: "Analysis settings"}),
            ssNumber("Scale window (± seconds)", () => D.flowOpts.halfWindow, v => D.flowOpts.halfWindow = v, {min: 0.2, max: 10, step: 0.1,
                hint: "Nearness is measured relative to the motion in this window."}),
            ssNumber("Static threshold", () => D.flowOpts.minFlow, v => D.flowOpts.minFlow = v, {min: 0.05, max: 5, step: 0.05,
                hint: "Below this motion the scene is treated as static (no emphasis)."}),
            ssNumber("Mover threshold", () => D.flowOpts.movingTol, v => D.flowOpts.movingTol = v, {min: 0.2, max: 10, step: 0.1,
                hint: "Counter-flow needed before a block counts as moving."}),
            ssNumber("Analysis region width", () => D.flowOpts.context, v => D.flowOpts.context = v, {min: 0.1, max: 1, step: 0.05,
                hint: "Fraction of the frame width. The matching block is always placed on the slit.", unit: "× frame"})),
        ssEl("div", {class: "ssField ssWide"}, ssEl("button", {type: "button", class: "ssBtn", text: "↻ Recompute flow",
            onclick: () => ssApply({force: "flow"})}), flowStatus),
        ssPreview("flow", "Slit (white); bars: red = near, grey = unknown, cyan = moving", (cv, frames, st, k) => {
            if (!st.flow || st.flow.ver !== FLOW_VERSION || st.flow.n !== frames.length) return "Compute the flow to see it here.";
            drawFlowDebug(cv, frames, st.rect, st.flow, k);
            return "";
        }, st => (st.type === "line" ? "Flow emphasis needs a rectangular slit." : null)));
    const wf = flowSec.body.children;
    ssRule(wf[4], {show: () => em().mode !== "near"});
    ssRule(wf[6], {show: () => em().mode !== "near"});
    ssRule(wf[7], {show: () => em().mode !== "near" && em().tintOn});
    ssRule(wf[8], {show: () => em().mode !== "near" && em().tintOn});
    ssRule(wf[2], {show: () => em().mode !== "moving"});
    ssRule(wf[3], {show: () => em().mode !== "moving"});
    ssRule(wf[1], {show: () => em().mode !== "moving"});
    const incompat = ssEl("div", {class: "ssWarn", role: "status"});
    ssRule(incompat, {show: () => {
            const why = em().enabled && (D.sweep.enabled ? "Flow emphasis is skipped while the sweeping slit is on." :
                (D.fov ? "Flow emphasis is skipped while \"Rotate 90°\" is on." :
                    (bird() ? "Flow emphasis is skipped while the bird's-eye view is on." : "")));
            incompat.textContent = why || "";
            return !!why;
        }});
    flowSec.insertBefore(incompat, flowSec.body);

    body.append(frameRange, slitSec, lenSec, sweepSec, birdSec, fluidSec, flowSec);
    ssRefresh();
}

function ssRefreshStatus() {
    const s = stripes[SS.n], frames = typeof gframes !== "undefined" ? gframes : [];
    if (!s) return;
    const cur = readDraft(s);
    const t = document.getElementById("ssTrackStatus"), f = document.getElementById("ssFlowStatus");
    if (t) {
        const have = s.track && s.track.dx.length === frames.length;
        const changed = JSON.stringify(cur.fluidOpts) !== JSON.stringify(SS.draft.fluidOpts);
        t.textContent = !have ? "Not computed yet." : (changed ? "Settings changed: it will be recomputed on Apply." : `Computed for ${frames.length} frames.`);
    }
    if (f) {
        const have = s.flow && s.flow.ver === FLOW_VERSION && s.flow.n === frames.length;
        const changed = JSON.stringify(cur.flowOpts) !== JSON.stringify(SS.draft.flowOpts) || cur.fluid !== SS.draft.fluid;
        f.textContent = !have ? "Not computed yet." : (changed ? "Settings changed: it will be recomputed on Apply." : `Computed for ${frames.length} frames.`);
    }
    const info = document.getElementById("ssRectInfo");
    if (info && s.rect) info.textContent = `Rectangle: x ${s.rect.x.toFixed(3)}, y ${s.rect.y.toFixed(3)}, w ${s.rect.width.toFixed(3)}, h ${s.rect.height.toFixed(3)}`;
}

async function ssApply({force = null, close = false} = {}) {
    if (SS.busy) return;
    const n = SS.n, s = stripes[n];
    if (!s) return;
    writeDraft(s, SS.draft);
    const clamped = ssAdopt(readDraft(s));
    selectedStripe = n;

    const bar = document.getElementById("stripeSettingsProgress"), msg = document.getElementById("stripeSettingsMsg");
    const setBusy = (b) => {
        SS.busy = b;
        document.getElementById("ssStop").hidden = !b;
        bar.hidden = !b;
        document.querySelectorAll("#stripeSettings .ssFoot button:not(#ssStop), #stripeSettingsBody").forEach(el => { el.inert = b; });
        ssRefresh();
    };
    SS.abort = new AbortController();
    setBusy(true);
    msg.textContent = "Rendering…";
    bar.value = 0;
    try {
        const frames = typeof gframes !== "undefined" ? gframes : [];
        if (s.sweep && s.sweep.enabled) {
            // the sweeping slit has no tracking / flow step: it is rendered directly (fluid, bird's-eye, emphasis and rotation are ignored)
            if (!frames.length) msg.textContent = "Saved. Load a video to render the stripe.";
            else if (!s.rect) msg.textContent = "Saved. Draw a rectangular slit on the video first.";
            else {
                msg.textContent = "Rendering the sweep…";
                await new Promise(r => setTimeout(r));           // let the message paint before the synchronous render
                slitSweep(frames, s.rect, n);
                bar.value = 1;
                msg.textContent = "Done.";
            }
        } else {
            await makeSlit(s, n, {
                force, signal: SS.abort.signal,
                onProgress: (stage, f) => {
                    bar.value = f;
                    msg.textContent = (stage === "track" ? "Tracking the slit… " : "Measuring optical flow… ") + Math.round(100 * f) + "%";
                },
            });
            msg.textContent = frames.length ? "Done." : "Saved. Load a video to render the stripe.";
        }
    } catch (err) {
        const stopped = /abort/i.test(String(err && err.message));
        msg.textContent = stopped ? "Stopped." : "Error: " + (err && err.message || err);
        if (!stopped) console.error(err);
    } finally {
        SS.abort = null;
        setBusy(false);
        updateStripeBadges(n);
        if ((ssAdopt(readDraft(s)) || clamped) && document.getElementById("stripeSettings").open) buildStripeSettings();
        ssRefreshStatus();
        Object.values(SS.previews).forEach(f => f());
    }
    if (close && !/Error|Stopped/.test(msg.textContent)) closeStripeSettings();
}

function ssAssign(dst, src) {
    for (const k of Object.keys(src)) {
        const v = src[k];
        if (v && typeof v === "object" && !Array.isArray(v) && dst[k] && typeof dst[k] === "object" && !Array.isArray(dst[k])) ssAssign(dst[k], v);
        else dst[k] = Array.isArray(v) ? v.slice() : v;
    }
}

function ssAdopt(fresh) {
    const before = JSON.stringify(SS.draft);
    ssAssign(SS.draft, fresh);
    return before !== JSON.stringify(SS.draft);
}

function ssResetDefaults() {
    if (SS.busy) return;
    SS.draft = ssClone(STRIPE_DEFAULTS);
    buildStripeSettings();
    Object.values(SS.previews).forEach(f => f());
}

(function wireStripeSettings() {
    const bind = () => {
        const dlg = document.getElementById("stripeSettings");
        if (!dlg || dlg._wired) return;
        dlg._wired = true;
        document.getElementById("ssApply").onclick = () => ssApply();
        document.getElementById("ssOk").onclick = () => ssApply({close: true});
        document.getElementById("ssCancel").onclick = () => closeStripeSettings();
        document.getElementById("ssReset").onclick = () => ssResetDefaults();
        document.getElementById("ssStop").onclick = () => SS.abort?.abort();
        document.getElementById("ssClose").onclick = () => closeStripeSettings();
        dlg.addEventListener("close", () => SS.abort?.abort());
        dlg.addEventListener("cancel", () => SS.abort?.abort());
    };
    if (typeof document === "undefined") return;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();
