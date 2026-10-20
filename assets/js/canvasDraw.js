let stroke = []
let strokePoint;
let currStroke = []
let mouseDown = 0
let dataset = []
let mode = "zoom"

let mapFlag = false

let mapStroke = []
let map

let mapRedraw = null;
let mapReposition = null;
let strokeBackup = null;

const pathView = {k: 1, x: 0, y: 0, minK: 0.2, maxK: 40, scaleRibbon: true};
let navShift = false;
let navPan = null;
let _baseMeshHeight;
let _navRaf = 0, _drawRaf = 0;


/* ------------------------------------------------------------------ view transform */

function screenToWorld(p) { return [(p[0] - pathView.x) / pathView.k, (p[1] - pathView.y) / pathView.k]; }
function worldToScreen(p) { return [p[0] * pathView.k + pathView.x, p[1] * pathView.k + pathView.y]; }
function screenPath(path) { return path.map(d => ({x: d[0] * pathView.k + pathView.x, y: d[1] * pathView.k + pathView.y})); }

function resetView() {
    pathView.k = 1;
    pathView.x = 0;
    pathView.y = 0;
    redrawMapping();
}

function activeCanvas() {
    if (mapFlag) return typeof mapCan !== "undefined" ? mapCan : null;
    return document.getElementById("main");
}

function toPathSpace(xy) {
    return mapFlag ? [xy.x, xy.y] : screenToWorld([xy.x, xy.y]);
}

function polyLength(pts) {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return L;
}


/* ------------------------------------------------------------------ canvas setup */

function sizeCanvas(can) {
    const rect = can.getBoundingClientRect();
    const w = Math.round(rect.width), h = Math.round(rect.height);
    if (can.width !== w || can.height !== h) {
        can.width = w;
        can.height = h;
        return true;
    }
    return false;
}

function iniCan() {
    const can = document.getElementById("main")
    sizeCanvas(can);
    initNav(can);
}

function initDraw() {
    const can = activeCanvas();
    if (!can) return;
    sizeCanvas(can);
    if (!mapFlag) initNav(can);
    can.style.touchAction = "none";

    can.onpointerdown = onMouseDown
    can.onpointermove = onMouseMove
    can.onpointerup = onMouseUp
    can.onpointercancel = onPointerCancel      // FIX: a cancelled pointer no longer leaves mouseDown stuck at 1
    updateNavState();
}

function delDraw() {
    const cans = [document.getElementById("main"), typeof mapCan !== "undefined" ? mapCan : null];
    for (const can of cans) {
        if (!can) continue;
        can.onpointerdown = null
        can.onpointermove = null
        can.onpointerup = null
        can.onpointercancel = null
    }
}


/* ------------------------------------------------------------------ pan / zoom with Shift */

function isNavEvent(e) {
    return e.shiftKey || e.button === 1 || (!mapFlag && mode === "zoom");
}

function initNav(can) {
    if (!can || can._navBound) return;
    can._navBound = true;
    can.style.touchAction = "none";
    can.addEventListener("pointerdown", navPointerDown);
    can.addEventListener("pointermove", navPointerMove);
    can.addEventListener("pointerup", navPointerUp);
    can.addEventListener("pointercancel", navPointerUp);
    can.addEventListener("wheel", navWheel, {passive: false});
    can.addEventListener("dblclick", e => {
        if (!mapFlag && (e.shiftKey || mode === "zoom")) resetView();
    });
}

function navPointerDown(e) {
    if (mapFlag || mouseDown === 1) return;                       // the map is handled by Leaflet
    if (!isNavEvent(e) || (e.button !== 0 && e.button !== 1)) return;
    const s = getMousePos(e);
    navPan = {id: e.pointerId, sx: s.x, sy: s.y, vx: pathView.x, vy: pathView.y};
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.preventDefault();
    updateNavState();
}

function navPointerMove(e) {
    if (!navPan || e.pointerId !== navPan.id) return;
    const s = getMousePos(e);
    pathView.x = navPan.vx + (s.x - navPan.sx);
    pathView.y = navPan.vy + (s.y - navPan.sy);
    scheduleRedraw();
}

function navPointerUp(e) {
    if (!navPan || e.pointerId !== navPan.id) return;
    navPan = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    updateNavState();
}

function navWheel(e) {
    if (mapFlag || !(mode === "zoom" || e.shiftKey)) return;
    e.preventDefault();
    // browsers report Shift + wheel as horizontal scroll (deltaX); deltaMode 1 = lines instead of pixels
    const d = e.deltaY || e.deltaX;
    const s = getMousePos(e);
    const f = Math.exp(-d * (e.deltaMode === 1 ? 0.05 : 0.0015));
    const k2 = Math.min(pathView.maxK, Math.max(pathView.minK, pathView.k * f));
    const r = k2 / pathView.k;
    pathView.x = s.x - (s.x - pathView.x) * r;                    // the point under the cursor stays under the cursor
    pathView.y = s.y - (s.y - pathView.y) * r;
    pathView.k = k2;
    scheduleRedraw();
}

function updateNavState() {
    const nav = mode === "zoom" || (navShift && mouseDown !== 1);
    if (map) {
        for (const h of [map.dragging, map.scrollWheelZoom, map.doubleClickZoom, map.touchZoom]) {
            if (h) nav ? h.enable() : h.disable();
        }
    }
    const can = activeCanvas();
    if (can) can.style.cursor = navPan ? "grabbing" : (nav ? "grab" : "crosshair");
}

window.addEventListener("keydown", e => { if (e.key === "Shift" && !navShift) { navShift = true; updateNavState(); } });
window.addEventListener("keyup", e => { if (e.key === "Shift") { navShift = false; updateNavState(); } });
window.addEventListener("blur", () => { navShift = false; updateNavState(); });

if (typeof document !== "undefined") {
    const bind = () => initNav(document.getElementById("main"));
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();
}


function scheduleRedraw() {
    if (_navRaf) return;
    _navRaf = requestAnimationFrame(() => {
        _navRaf = 0;
        if (mapFlag && mapReposition) mapReposition();            // reposition and redraw together: no one-frame offset
        redrawMapping();
    });
}

function redrawMapping() {
    if (mapFlag) {
        if (_baseMeshHeight !== undefined) meshHeight = _baseMeshHeight;
        if (mapRedraw) mapRedraw(); else if (mapStroke.length > 1) fakeMapDraw();
        return;
    }
    if (stroke.length < 2) { prepMapping(); return; }
    applyRibbonScale();
    makeMapping(screenPath(stroke));
}

function applyRibbonScale() {
    if (typeof meshHeight === "undefined") return;                // defined in the mesh file
    if (_baseMeshHeight === undefined) _baseMeshHeight = meshHeight;
    meshHeight = pathView.scaleRibbon ? _baseMeshHeight * pathView.k : _baseMeshHeight;
}

function setMeshHeight(v) {
    _baseMeshHeight = v;
    redrawMapping();
}


/* ------------------------------------------------------------------ drawing the path */

function paintBg(cont) {
    if (bgImg === undefined) return;
    if (mapFlag) { drawBg(); return; }
    cont.save();
    cont.setTransform(pathView.k, 0, 0, pathView.k, pathView.x, pathView.y);
    drawBg();
    cont.restore();
}

function paintBase() {
    const cont = activeCanvas().getContext("2d");
    cont.clearRect(0, 0, cont.canvas.width, cont.canvas.height);
    paintBg(cont);
    return cont;
}

function drawActive() {
    const cont = activeCanvas().getContext("2d");
    draw(cont, mapFlag ? mapStroke : stroke.map(worldToScreen));
}

function scheduleDraw() {
    if (_drawRaf) return;
    _drawRaf = requestAnimationFrame(() => { _drawRaf = 0; drawActive(); });
}

function commitStroke() {
    if (mapFlag) mapStroke = currStroke; else stroke = currStroke;
}

function onMouseDown(e) {
    if (isNavEvent(e) || e.button !== 0) return;
    const xy = getMousePos(e);

    strokePoint = toPathSpace(xy);
    mouseDown = 1;
    e.target.setPointerCapture?.(e.pointerId);

    currStroke = [[...strokePoint]];
    strokeBackup = mapFlag ? mapStroke : stroke;
    commitStroke();
    paintBase();
    updateNavState();
}

function onMouseMove(e) {
    if (mouseDown !== 1) return;
    e.preventDefault()
    const p = toPathSpace(getMousePos(e));
    const last = currStroke[currStroke.length - 1];
    const minD = mapFlag ? 2 : 2 / pathView.k;
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < minD) return;

    strokePoint = p;
    currStroke.push(p);
    commitStroke();
    scheduleDraw();
}

function onMouseUp(e) {
    if (mouseDown !== 1) return;
    mouseDown = 0
    e.preventDefault()
    e.target.releasePointerCapture?.(e.pointerId);
    if (_drawRaf) { cancelAnimationFrame(_drawRaf); _drawRaf = 0; }

    const p = toPathSpace(getMousePos(e));
    const last = currStroke[currStroke.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 0) currStroke.push(p);
    commitStroke();
    strokePoint = []

    const valid = currStroke.length >= 2 && polyLength(currStroke) > 3;
    currStroke = []
    if (!valid) {
        if (mapFlag) mapStroke = strokeBackup || []; else stroke = strokeBackup || [];
        updateNavState();
        redrawMapping();
        return;
    }

    if (mapFlag) {
        pixels2Coords()
        makeData(mapStroke)
    } else {
        makeData(stroke)
    }
    updateNavState();
    redrawMapping();
}

function onPointerCancel(e) {
    if (mouseDown !== 1) return;
    mouseDown = 0;
    currStroke = [];
    if (mapFlag) mapStroke = strokeBackup || []; else stroke = strokeBackup || [];
    updateNavState();
    redrawMapping();
}

function draw(cont, pts) {
    cont.clearRect(0, 0, cont.canvas.width, cont.canvas.height)
    paintBg(cont);
    cont.beginPath();

    cont.lineWidth = 1
    for (let i = 1; i < pts.length; i++) {
        cont.moveTo(pts[i - 1][0], pts[i - 1][1]);
        cont.lineTo(pts[i][0], pts[i][1]);
    }
    cont.stroke()
}


function prepMapping() {
    const can = document.getElementById("main")
    const cont = can.getContext('2d');
    draw(cont, stroke.map(worldToScreen))
}

function resetCan() {
    if (mapFlag) {
        prepMapping()
        const tcont = mapCan.getContext("2d")
        tcont.clearRect(0, 0, 9999, 9999)
        fakeMapDraw()
    } else {
        redrawMapping();
    }
}


function strokeToggle() {
    if (mode === "zoom") {
        mode = "stroke"
        initDraw()
        redrawMapping();
        document.getElementById("strokeBtn").classList.add("selectedBrush")
    } else {
        mode = "zoom"
        delDraw()
        updateNavState();
        document.getElementById("strokeBtn").classList.remove("selectedBrush")
    }
}

function mapToggle() {
    delDraw();
    mapFlag = !mapFlag

    if (mapFlag) {
        iniMap()
    } else {
        delMap()
    }
    if (mode === "stroke") initDraw();
    updateNavState();
}

////////////////////////////////////// MAP stuff ////////////////////////////

function iniMap() {
    const canvas = document.getElementById("main");
    canvas.style.display = "none";

    let container = document.getElementById("map")
    container.style.display = "inline-block";
    container.style.width = canvas.width + "px";
    container.style.height = canvas.height + "px";

    let base = [44.809025517564756, 5.495080290496283]
    if (dataRecords.length > 1) {
        base = [dataRecords[0].latitude, dataRecords[0].longitude]
    }

    map = L.map('map', {zoomControl: false, boxZoom: false}).setView(base, 13);
    // opentopomap
    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenTopoMap contributors',
        maxNativeZoom: 17
    }).addTo(map);

    mapCan = cloneCanvas(canvas)

    mapCan.style.position = "absolute";
    mapCan.style.top = 0;
    mapCan.style.left = 0;
    mapCan.style.touchAction = "none";

    map.getPanes().overlayPane.appendChild(mapCan);

    function resizeCanvas() {
        const size = map.getSize();
        mapCan.width = size.x;
        mapCan.height = size.y;
    }

    map.on("resize", () => { resizeCanvas(); scheduleRedraw(); });
    resizeCanvas();

    function repositionCanvas() {
        const topLeft = map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(mapCan, topLeft);
        drawWaypoints()
    }

    mapReposition = repositionCanvas;
    repositionCanvas();


    let ctx = mapCan.getContext('2d');

    function drawTrack(coords) {
        ctx.clearRect(0, 0, mapCan.width, mapCan.height);

        ctx.beginPath();
        if (coords.length > 0) {
            mapStroke = []
            coords.forEach((c, i) => {

                const p = map.latLngToContainerPoint(c);
                mapStroke.push([p.x, p.y]);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });

        } else {
            mapStroke.forEach((c, i) => {
                if (i === 0) ctx.moveTo(c[0], c[1]);
                else ctx.lineTo(c[0], c[1]);
            })
        }

        ctx.strokeStyle = "red";
        ctx.lineWidth = 3;
        ctx.stroke();
        fakeMapDraw()
        drawWaypoints()
    }

    const redrawTrack = () => {
        if (mouseDown === 1) return;
        drawTrack(dataRecords.map(d => [d.latitude, d.longitude]));
    };
    mapRedraw = redrawTrack;

    map.on("move zoom", scheduleRedraw);
    redrawTrack()
    updateNavState();
}

function delMap() {
    if (_navRaf) { cancelAnimationFrame(_navRaf); _navRaf = 0; }
    if (map) {
        map.remove();
        map = null;
    }
    mapRedraw = null;
    mapReposition = null;

    let container = document.getElementById("map")
    container.innerHTML = ""
    container.style.display = "none";

    const canvas = document.getElementById("main");
    canvas.style.display = "inline-block";
}


function fakeMapDraw() {
    if (mapStroke.length < 2) return;
    makeMapping(mapStroke.map(d => {
        return {x: d[0], y: d[1]}
    }))
}


function pixels2Coords() {
    dataRecords = []
    for (let i = 0; i < mapStroke.length; i++) {
        let coords = map.containerPointToLatLng(mapStroke[i])
        dataRecords.push({latitude: coords.lat, longitude: coords.lng})
    }
}