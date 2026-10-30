let initSvg = true;
let loadingBar;
let _lastUiUpdate = 0;

function frameBudget(width, height, memoryBudgetMB) {
    const mb = memoryBudgetMB ?? Math.min(1536, ((typeof navigator !== "undefined" && navigator.deviceMemory) || 4) * 256);
    return Math.max(100, Math.floor(mb * 1024 * 1024 / (width * height * 4)));
}

function chooseTimestamps(duration, nativeFps, maxFrames, {maxFps = 24, start = 0} = {}) {
    const span = Math.max(0.001, duration);
    const fps = Math.min(nativeFps > 0 ? nativeFps : maxFps, maxFps, maxFrames / span);
    const n = Math.max(1, Math.floor(span * fps));
    const timestamps = new Array(n);
    for (let i = 0; i < n; i++) timestamps[i] = start + i / fps;
    return {timestamps, fps};
}

/* ------------------------------------------------------------------ frame size (FIX) */

function toPositiveInt(v) {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n > 0 ? n : null;
}


function resolveFrameSize(o, track, notice) {
    const nativeW = toPositiveInt(track.displayWidth) ?? toPositiveInt(track.codedWidth);
    const nativeH = toPositiveInt(track.displayHeight) ?? toPositiveInt(track.codedHeight);

    let w, h, label;
    if (o.size === "native") {
        label = "native size";
        w = nativeW;
        h = nativeH;
    } else if (o.size && typeof o.size === "object") {
        label = "size option";
        w = toPositiveInt(o.size.width);
        h = toPositiveInt(o.size.height);
    } else {
        label = "vidSize";
        const v = typeof vidSize !== "undefined" ? vidSize : null;
        w = v ? toPositiveInt(v.width) : null;
        h = v ? toPositiveInt(v.height) : null;
    }

    if (!w || !h) {
        if (!nativeW || !nativeH) {
            throw new Error(`Could not determine the video frame size (displayWidth=${track.displayWidth}, `
                + `displayHeight=${track.displayHeight}). Pass an explicit size: {width, height}.`);
        }
        notice(`The requested ${label} was not usable (width=${w}, height=${h}); using the native ${nativeW}x${nativeH}.`);
        w = nativeW;
        h = nativeH;
    }
    return {width: w, height: h};
}


function defaultMemoryBudgetMB() {
    return Math.min(1536, ((typeof navigator !== "undefined" && navigator.deviceMemory) || 4) * 256);
}

let _yieldMC = null;
const _yieldPending = [];

function yieldToUI() {
    if (typeof MessageChannel === "undefined") return new Promise(r => setTimeout(r, 0));
    if (!_yieldMC) {
        _yieldMC = new MessageChannel();
        _yieldMC.port1.onmessage = () => {
            const f = _yieldPending.shift();
            if (f) f();
        };
    }
    return new Promise(r => {
        _yieldPending.push(r);
        _yieldMC.port2.postMessage(0);
    });
}


async function mediaFramesTest(file, opts = {}) {
    const o = {maxFps: 24, retain: true, ...opts};
    const notice = o.onNotice || (m => console.info(m));
    const requestedAllFrames = o.allFrames !== false;
    let allFrames = requestedAllFrames;
    const frames = [];
    const stamps = [];
    const svg = d3.select("#videoOverlay");
    let input;

    try {
        input = new Mediabunny.Input({
            formats: Mediabunny.ALL_FORMATS,
            source: new Mediabunny.BlobSource(file),
        });
        const [duration, videoTrack] = await Promise.all([input.computeDuration(), input.getPrimaryVideoTrack()]);

        // Long videos are sampled at a reduced frame rate to limit processing and memory use.
        const durationFpsCap = duration >= 3600 ? 1
            : duration > 1800 ? 4
                : duration > 900 ? 12
                    : null;
        if (durationFpsCap !== null) {
            allFrames = false;
            o.maxFps = Math.min(o.maxFps ?? 24, durationFpsCap);
            notice(`Video duration is ${Math.round(duration / 60)} minutes; sampling at up to ${o.maxFps} fps.`);
        }

        if (!videoTrack) throw new Error("No video track found in this file.");
        if (!(await videoTrack.canDecode())) {
            throw new Error("This video's codec cannot be decoded by your browser (HEVC/H.265 is a common cause, "
                + "e.g. GoPro or iPhone footage). Re-encode it as H.264 and try again.");
        }

        o.size = "native"

        const size = resolveFrameSize(o, videoTrack, notice);
        const stats = await videoTrack.computePacketStats(100);
        const nativeFps = stats.averagePacketRate;
        const start = (await videoTrack.getFirstTimestamp?.()) ?? 0;
        const span = Math.max(0.001, duration - start);
        const perFrameMB = size.width * size.height * 4 / 1048576;
        const budgetMB = o.memoryBudgetMB ?? defaultMemoryBudgetMB();

        let plan = null, total;
        if (allFrames) {
            total = Math.max(1, Math.round(span * (nativeFps > 0 ? nativeFps : 30)));
            if (o.maxFrames) total = Math.min(total, o.maxFrames);
            const need = total * perFrameMB;
            if (o.retain && need > budgetMB) {
                notice(`Keeping every frame: about ${total} frames of ${size.width}x${size.height} need roughly ${Math.round(need)} MB `
                    + `(budget ${Math.round(budgetMB)} MB), so the browser may run out of memory. `
                    + `Pass {allFrames: false} for budgeted sampling, or a smaller {size} / {maxFrames}.`);
            }
        } else {
            const maxFrames = o.maxFrames ?? frameBudget(size.width, size.height, o.memoryBudgetMB);
            plan = chooseTimestamps(span, nativeFps, maxFrames, {maxFps: o.maxFps, start});
            total = plan.timestamps.length;
        }
        const timesFor = () => plan
            ? plan.timestamps
            : chooseTimestamps(span, nativeFps, o.maxFrames ?? Infinity, {maxFps: Infinity, start}).timestamps;

        initSvg = true;
        _lastUiUpdate = 0;
        let count = 0, last = null;

        const emit = async (canvas, t) => {
            last = canvas;
            if (o.retain) frames.push(canvas);
            stamps.push(t);
            o.onFrame?.(canvas, count, t);
            count++;
            if (reportProgress(svg, size, Math.min(count, total), total)) await yieldToUI();
        };
        const stop = () => o.signal?.aborted || (o.maxFrames && count >= o.maxFrames);

        if (typeof Mediabunny.CanvasSink === "function") {
            const sink = new Mediabunny.CanvasSink(videoTrack, {
                width: size.width, height: size.height, fit: "fill",
                poolSize: o.retain ? undefined : 3,
            });
            if (allFrames && typeof sink.canvases === "function") {
                for await (const wrapped of sink.canvases(start)) {
                    if (stop()) break;
                    await emit(wrapped.canvas, wrapped.timestamp);
                }
            } else {
                const ts = timesFor();
                let idx = 0;
                for await (const wrapped of sink.canvasesAtTimestamps(ts)) {
                    if (o.signal?.aborted) break;
                    const canvas = wrapped ? wrapped.canvas : last;
                    if (canvas) await emit(canvas, ts[idx]);
                    idx++;
                }
            }
        } else {

            const sink = new Mediabunny.VideoSampleSink(videoTrack);
            const shared = o.retain ? null : document.createElement("canvas");
            const drawSample = async (sample, t) => {
                const canvas = shared || document.createElement("canvas");
                canvas.width = size.width;
                canvas.height = size.height;
                const ctx = canvas.getContext("2d");
                ctx.imageSmoothingQuality = "high";
                sample.draw(ctx, 0, 0, videoTrack.displayWidth, videoTrack.displayHeight, 0, 0, size.width, size.height);
                sample.close();
                await emit(canvas, t);
            };
            if (allFrames && typeof sink.samples === "function") {
                for await (const sample of sink.samples(start)) {
                    if (stop()) {
                        sample.close();
                        break;
                    }
                    await drawSample(sample, sample.timestamp);
                }
            } else {
                const ts = timesFor();
                let idx = 0;
                for await (const sample of sink.samplesAtTimestamps(ts)) {
                    if (o.signal?.aborted) {
                        sample?.close();
                        break;
                    }
                    if (sample) await drawSample(sample, ts[idx]);
                    else if (last && o.retain) await emit(last, ts[idx]);
                    idx++;
                }
            }
        }

        const n = stamps.length;
        frames.meta = {
            timestamps: stamps,
            fps: n > 1 ? (n - 1) / (stamps[n - 1] - stamps[0]) : nativeFps,
            nativeFps, size, duration: span, start, allFrames,
            estimatedMB: frames.length * perFrameMB,
        };
    } catch (err) {
        console.error(err);
        (o.onError || (m => console.warn(m)))(err.message || String(err));
        return [];
    } finally {
        clearLoading();
        input?.dispose?.();
    }
    return frames;
}


/* ------------------------------------------------------------------ loading overlay */

function reportProgress(svg, rect, n, total) {
    const now = performance.now();
    if (n < total && now - _lastUiUpdate < 100) return false;
    _lastUiUpdate = now;
    loadingSvg(svg, rect, n, total);
    return true;
}

function loadingSvg(svg, rect, n, total) {
    const barH = 10;
    const barW = rect.width * 0.7;
    const x = (rect.width - barW) / 2;
    const y = (rect.height - barH) / 2;

    if (initSvg) {
        initSvg = false;
        svg.append("rect").attr("x", 0).attr("y", 0)
            .attr("width", rect.width).attr("height", rect.height)
            .style("fill", "rgba(163,159,159,0.68)");
        svg.append("text").attr("x", x).attr("y", y - barH * 2).text("Extracting frames...");
        svg.append("rect").attr("x", x).attr("y", y).attr("width", barW).attr("height", barH).style("fill", "#555");
        loadingBar = svg.append("rect").attr("x", x + 1).attr("y", y + 1).attr("height", barH - 2).style("fill", "#538ed1");
    }
    loadingBar.attr("width", (barW - 2) * (n / total));
}

function clearLoading() {
    const svg = d3.select("#videoOverlay");
    svg.selectAll("*").remove();
    const v = document.getElementById("mainVideo");
    if (v) v.controls = true;
    initSvg = true;
    svg.style("display", "none");
}