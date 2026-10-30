docReady(setup)

let vidUrl = ""
let gframes = []
let dev = false
let vidSize = {width: 800, height: 600};
let keymap = {}
let cv

let bgImg

let bgTransform = {x: 0, y: 0, scale: 1}

let seaMap
let mapCan

let derivedData = {}

let viewMod = 0
/*let presetStripes= {
    0: {
        type: "rect",
        rect: {x: 0, y: 0,width: 0.8, height: 0.8},
    },
    1: {
        type: "rect",
        rect: {x: 0, y: 0,width: 0.8, height: 0.8},
        fov:true,
        skew:true,
    },
    2: {
        type: "rect",
        rect: {x: 0, y: 0,width: 0.8, height: 0.8},
        flip:true
    }
}*/

/*let presetStripes = {
    0: {
        type: "rect",
        rect: {
            x: 0.22613713406253977,
            y: 0.09173485117172527,
            width: 0.020366598778004074,
            height: 0.6857555882197442
        }
    },
    "1": {
        "type": "rect",
        "rect": {
            "x": 0.18540393650653164,
            "y": 0.7522257603327268,
            "width": 0.6741344040134531,
            "height": 0.014436959462138669
        },
        "fov": true,
        "skew": false
    },
    "2": {
        "type": "rect",
        "rect": {
            "x": 0.831025102230779,
            "y": 0.04842398655346671,
            "width": 0.002036659877800407,
            "height": 0.7687682015041437
        },
        "flip": true
    }
}*/

// TEST FLOW

/*let presetStripes = {
    0: {
        type: "rect",
        rect: {
            x: 0.22613713406253977,
            y: 0.09173485117172527,
            width: 0.020366598778004074,
            height: 0.6857555882197442
        },
        boost:0.5,
        mode: "near"
    },
    1: {
        type: "flow",
        rect: {
            x: 0.22613713406253977,
            y: 0.09173485117172527,
            width: 0.020366598778004074,
            height: 0.6857555882197442
        },
        boost:0.5,
        mode: "near"
    },
    2: {
        type: "flow",
        rect: {
            x: 0.22613713406253977,
            y: 0.09173485117172527,
            width: 0.020366598778004074,
            height: 0.6857555882197442
        },
        boost:0.1,
        mode: "both"
    },
    3: {
        type: "flow",
        rect: {
            x: 0.22613713406253977,
            y: 0.09173485117172527,
            width: 0.020366598778004074,
            height: 0.6857555882197442
        },
        boost:1.5,
        mode: "moving"
    },
}*/

/*** TEST FOV ***/

let presetStripes = {
    0: {
        "type": "rect",
        "rect": {
            "x": 0.08540393650653164,
            "y": 0.5522257603327268,
            "width": 0.8741344040134531,
            "height": 0.014436959462138669
        },
        "fov": true,
        "skew": false
    },
    1: {
        type: "bird",
        "rect": {
            "x": 0.08540393650653164,
            "y": 0.5522257603327268,
            "width": 0.8741344040134531,
            "height": 0.014436959462138669
        },

    },
    2: {
        type: "fluid",
        "rect": {
            "x": 0.08540393650653164,
            "y": 0.5522257603327268,
            "width": 0.8741344040134531,
            "height": 0.014436959462138669
        },
        "fov": true,

    }
}

async function setup() {

    // iniStripe()

    await getVidFromUrl("assets/baseVid/trail.mp4")
    iniCan()
    addIntervalSvg()
    const vid = document.getElementById("mainVideo")
    if (dev) {
        const tcan = document.getElementById("main")
        const tcon = tcan.getContext("2d")
        tcon.font = "bold 48px serif";
        tcon.fillText("Loading Images...", 260, 200)
        gframes = await getThem(471)
        vidSize = {width: gframes[0].width, height: gframes[0].height}

        let svg = document.getElementById("videoOverlay")
        const vid = document.getElementById("mainVideo")
        vid.width = vidSize.width
        vid.height = vidSize.height

        vid.controls = false

        svg.style.width = vidSize.width + "px";
        svg.style.height = vidSize.height + "px";
        // singleSlit(gframes)
        // slitSquare(gframes)
    }

    vid.addEventListener("timeupdate", updateCube)


    document.getElementById("mainVideo").addEventListener("loadedmetadata", async function (e) {

        let svg = document.getElementById("videoOverlay")

        let coords = vid.getBoundingClientRect()

        vid.controls = false

        svg.style.width = coords.width + "px";
        svg.style.height = coords.height + "px";

        let stackCan = document.getElementById("testStack")

        stackCan.style.width = coords.width + "px";
        stackCan.style.height = coords.height + "px";

        stackCan.width = coords.width
        stackCan.height = coords.height

        vidSize = {width: coords.width, height: coords.height};


        // await getVidFromUrl(vidUrl)
        // testCube(10)

    }, false);

    document.getElementById("videoInput").onchange = async e => {


        vidUrl = URL.createObjectURL(e.target.files[0])

        // await getVidFromUrl(vidUrl)

        document.getElementById("mainSource").src = vidUrl
        let svg = document.getElementById("videoOverlay")
        svg.style.display = "inline-block"
        //Weird stuff to be on the safe side might opti later
        await vid.load()
        await vid.play()
        await vid.pause()

        let coords = vid.getBoundingClientRect()
        vidSize = {width: coords.width, height: coords.height};
        vid.controls = false


        console.time("encoding")
        let frames = await mediaFramesTest(e.target.files[0])

        console.timeEnd("encoding")
        //
        gframes = frames
        svg.style.display = "none"

    }

    document.getElementById("meshHeight").oninput = async e => {

        // console.log(+e.target.value);
        setMeshHeight(+e.target.value)                  // updates the base width, keeps the zoom scaling, handles the map mode
        // let can = d3.select(`.stripeCan[row='${selectedStripe}'`).node()

        /*
                makeMapping(screenPath(stroke.map(d => {
                    return {x: d[0], y: d[1]}
                })))
        */

        // panzoom.pan(10, 10)
        // panzoom.zoom(2, { animate: true })


    }


    document.getElementById("seaFile").onchange = async e => {

        seaTraj(e.target.files[0], e)
    }


    document.getElementById("trajectoryFile").onchange = async e => {

        dataDispatcher(e.target.files[0], e)
    }

    document.getElementById("mainBg").onchange = async e => {

        loadBG(e.target.files[0], e)
    }


    document.getElementById("mainChart").onchange = async e => {

        loadData(e.target.files[0], e)
    }


    document.getElementById("waypointFile").onchange = async e => {

        loadWaypointImage(e.target.files[0], e)
    }


    // makeClientStripe()
    loadPreset()
    document.getElementById("moreStripe").onclick = async e => {
        makeClientStripe()
    }

    document.getElementById("moreLabel").onclick = async e => {
        makeNewLabel()
    }

}

function loadOptions(data) {

    const selectX = document.getElementById("chartX")
    const selectY = document.getElementById("chartY")

    let keys = Object.keys(data[0])
    let options = ""

    for (let i = 0; i < keys.length; i++) {
        options += `<option value="${keys[i]}">${keys[i]}</option>`
    }

    selectX.innerHTML = options
    selectY.innerHTML = options


    selectX.addEventListener("change", drawChart)
    selectY.addEventListener("change", drawChart)

}

function determineDataType(data, key) {
    const values = data
        .map(d => d[key])
        .filter(v => v != null && String(v).trim() !== "")
        .map(v => String(v).trim());

    // if (values.length === 0) return "unknown";

    const parseDate = d3.timeParse("%Y-%m-%d");

    const isTemporal = values.every(v => parseDate(v) !== null);
    if (isTemporal) return "temporal";

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

    if (values.every(v => timePattern.test(v))) {
        return "temporal";
    }

    const isLinear = values.every(v => Number.isFinite(Number(v)));
    if (isLinear) return "linear";

    return "categorical";
}

function makeAxis(type, data, column) {

    if (type === "temporal") {
        const value = data.find(d => d[column]?.trim())?.[column];

        if (!value) return null;

        let parse;

        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            parse = d3.timeParse("%Y-%m-%d");
        } else if (/^\d{2}:\d{2}$/.test(value)) {
            parse = d3.timeParse("%H:%M");
        } else if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
            parse = d3.timeParse("%H:%M:%S");
        } else {
            return null;
        }


        const dates = data
            .map(d => parse(d[column]))
            .filter(d => d !== null);


        return [d3.scaleTime()
            .domain(d3.extent(dates))
            .range([0, 1]), parse]

    } else if (type === "linear") {
        let domain = d3.extent(data.map(d => d[column]))

        return d3.scaleLinear()
            .domain(domain)
            .range([0, 1])
    } else {
        return d3.scaleBand()
            .domain([...new Set(data.map(d => d[column]))])
            .range([0, 1]);
    }

}
function drawChart() {
    const selectX = document.getElementById("chartX");
    const selectY = document.getElementById("chartY");

    const typeX = determineDataType(megaData, selectX.value);
    const typeY = determineDataType(megaData, selectY.value);

    if (typeX === "unknown" || typeY === "unknown") return;

    let xScale = makeAxis(typeX, megaData, selectX.value);
    let parseX = d => d;
    if (Array.isArray(xScale)) [xScale, parseX] = xScale;

    let yScale = makeAxis(typeY, megaData, selectY.value);
    let parseY = d => d;
    if (Array.isArray(yScale)) [yScale, parseY] = yScale;

    const can = document.getElementById("main");
    const context = can.getContext("2d");
    context.clearRect(0, 0, can.width, can.height);

    const m = {
        left:   can.width * 0.08,
        right:  can.width * 0.05,
        top:    can.height * 0.05,
        bottom: can.height * 0.08,
    };
    const left = m.left, right = can.width - m.right;
    const top = m.top,   bottom = can.height - m.bottom;

    xScale.range([left, right]);
    yScale.range([bottom, top]);

    const px = d => xScale(parseX(d[selectX.value]));
    const py = d => yScale(parseY(d[selectY.value]));

   
    context.beginPath();
    const line = megaData.map(d => [px(d), py(d)]);
    line.forEach(([x, y], i) => i === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
    context.strokeStyle = "#000";
    context.stroke();

    stroke = line;
    redrawMapping();

    context.font = "10px sans-serif";
    axisBottom(context, xScale, bottom);
    axisLeft(context, yScale, left);
}

function axisBottom(ctx, scale, y, {count = 10, size = 6, pad = 3} = {}) {
    const ticks = scale.ticks ? scale.ticks(count) : scale.domain();
    const format = scale.tickFormat ? scale.tickFormat(count) : d => d;
    const offset = scale.bandwidth ? scale.bandwidth() / 2 : 0; // center ticks on bands
    const [r0, r1] = scale.range();

    ctx.beginPath();
    ctx.moveTo(r0, y + 0.5);            // +0.5 keeps 1px lines crisp
    ctx.lineTo(r1, y + 0.5);
    for (const t of ticks) {
        const x = Math.round(scale(t) + offset) + 0.5;
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + size);
    }
    ctx.strokeStyle = "currentColor";
    ctx.stroke();

    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const t of ticks) {
        ctx.fillText(format(t), scale(t) + offset, y + size + pad);
    }
    console.log("dsdsadas Axis");
}

function axisLeft(ctx, scale, x, {count = 10, size = 6, pad = 3} = {}) {
    const ticks = scale.ticks ? scale.ticks(count) : scale.domain();
    const format = scale.tickFormat ? scale.tickFormat(count) : d => d;
    const offset = scale.bandwidth ? scale.bandwidth() / 2 : 0;
    const [r0, r1] = scale.range();

    ctx.beginPath();
    ctx.moveTo(x + 0.5, r0);
    ctx.lineTo(x + 0.5, r1);
    for (const t of ticks) {
        const y = Math.round(scale(t) + offset) + 0.5;
        ctx.moveTo(x, y);
        ctx.lineTo(x - size, y);
    }
    ctx.strokeStyle = "currentColor";
    ctx.stroke();

    ctx.fillStyle = "#000";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const t of ticks) {
        ctx.fillText(format(t), x - size - pad, scale(t) + offset);
    }
}


function loadData(file, e) {

    const reader = new FileReader();

    reader.onload = function (e) {
        const text = e.target.result;
        // const data = d3.csvParse(text);

        const data = parseDelimited(text);

        megaData = data
        loadOptions(data)
    }
    reader.readAsText(e.target.files[0]);

}


function detectDelimiter(text, candidates = [",", ";", "\t", "|"]) {
    // Count a delimiter on one line, ignoring anything inside double quotes
    const countOutsideQuotes = (line, delim) => {
        let inQuotes = false, n = 0;
        for (const ch of line) {
            if (ch === '"') inQuotes = !inQuotes;
            else if (ch === delim && !inQuotes) n++;
        }
        return n;
    };

    const lines = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 10);
    if (!lines.length) return ",";

    let best = ",", bestScore = -1;
    for (const delim of candidates) {
        const counts = lines.map(l => countOutsideQuotes(l, delim));
        const mode = counts.sort((a, b) => a - b)[Math.floor(counts.length / 2)];
        if (mode === 0) continue; // delimiter doesn't appear in a typical line

        // Fraction of lines with the same count as the typical line
        const consistency = counts.filter(c => c === mode).length / counts.length;
        const score = consistency * 1000 + mode; // consistency first, then column count
        if (score > bestScore) { bestScore = score; best = delim; }
    }
    return best;
}

function parseDelimited(text) {
    text = text.replace(/^\uFEFF/, ""); // strip BOM

    // Excel sometimes writes "sep=;" as the first line
    let delimiter;
    const sep = text.match(/^sep=(.)\r?\n/i);
    if (sep) {
        delimiter = sep[1];
        text = text.slice(sep[0].length);
    } else {
        delimiter = detectDelimiter(text);
    }

    return d3.dsvFormat(delimiter).parse(text);
}


function loadBG(file, e) {
    const reader = new FileReader();

    reader.onload = async function (e) {

        // bgImg = loadImg(e.target.result)
        bgImg = await addImageProcess(e.target.result)
        drawBg()

    }
    reader.readAsDataURL(file);
}


function drawBg() {
    let tcan = document.getElementById("main")
    let tcon = tcan.getContext("2d")

    let t = Math.round((bgImg.naturalHeight * tcan.getBoundingClientRect().width) / bgImg.naturalWidth)

    let ratio = bgImg.naturalWidth / bgImg.naturalHeight


    let newH = tcan.getBoundingClientRect().width * ratio

    let viewDim = [tcan.getBoundingClientRect().width, t]

    let canSize = [tcan.getBoundingClientRect().width, tcan.getBoundingClientRect().height]

    //THis is to crop
    // tcon.drawImage(bgImg, 0, 0, bgImg.naturalWidth, bgImg.naturalHeight,0, 0, viewDim[0], viewDim[1])

    //THis is to stretch
    // tcon.drawImage(bgImg, 0, 0, bgImg.naturalWidth, bgImg.naturalHeight, 0, 0, canSize[0], canSize[1])


    let mw = (canSize[1] * bgImg.naturalWidth) / bgImg.naturalHeight

    seaMap = [mw, canSize[1]]
    //THis is to center and Fit based on Max Height
    tcon.drawImage(bgImg, 0, 0, bgImg.naturalWidth, bgImg.naturalHeight, canSize[0] / 2 - mw / 2, 0, mw, canSize[1])
}

function testpreload() {


    var video = document.createElement("video");


    var xhr = new XMLHttpRequest();
    xhr.open("GET", vidUrl, true);
    xhr.responseType = "arraybuffer";

    xhr.onload = function (oEvent) {

        var blob = new Blob([oEvent.target.response], {type: "video/yourvideosmimmetype"});

        video.src = URL.createObjectURL(blob);

        //video.play()  if you want it to play on load
    };

    xhr.onprogress = function (oEvent) {

        if (oEvent.lengthComputable) {
            var percentComplete = oEvent.loaded / oEvent.total;
            // do something with this
        }
    }
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            return video
        }
    }

    xhr.send();

    return video
}


onkeyup = function (e) {
    if (e.keyCode in keymap) {
        keymap[e.keyCode] = false;

    }
};


onkeydown = function (e) {
    e = e || event;
    keymap[e.keyCode] = e.type === 'keydown';

    if (keymap[27]) {
        resetSvg()
    }

}

function onOpenCvReady(e) {
    cv = window.cv
    console.log("OpenCV loaded");
    // tracker = createCameraPathTracker();
}

async function getVidFromUrl(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const result = await response;

        let t = await result.blob()

        vidUrl = URL.createObjectURL(t)

        const vid = document.getElementById("mainVideo")
        document.getElementById("mainSource").src = vidUrl
        await vid.load()

        let svg = document.getElementById("videoOverlay")

        let coords = vid.getBoundingClientRect()
        vid.controls = false

        svg.style.width = coords.width + "px";
        svg.style.height = coords.height + "px";

        svg.style.display = "inline-block"
        vidSize = {width: coords.width, height: coords.height};

        let frames = await mediaFramesTest(t)
        gframes = frames;


    } catch (error) {
        console.error(error.message);
    }
}


function testSack(n = 0) {

    let ratio = gframes[0].width / gframes[0].height
    let maxW = 500
    let maxH = maxW / ratio

    let minW = 10
    let minH = minW / ratio

    let can = document.getElementById("testStack")
    let ctx = can.getContext("2d");

    let refW = Math.min(gframes[0].width, maxW)
    let refH = Math.min(gframes[0].height, maxH)


    can.width = refW
    can.height = refH
    let hstep = 2
    let vstep = 1

    let nFrames = (refW / hstep) / 2

    if (nFrames + n > gframes.length) {
        nFrames = gframes.length - 1 - n
    }
    // console.log("for ",n, "we have ", nFrames);

    for (let i = 0; i < nFrames; i++) {
        let idx = n + i
        ctx.drawImage(gframes[idx],
            0,
            0,
            gframes[idx].width,
            gframes[idx].height - 50, //to skip overlay on bike
            i * hstep,
            vstep * i,
            Math.max(refW - (hstep * i * 2), minW),
            Math.max(refH - (vstep * i * 2), minH))

        // if (refH > vstep * i * 2 || refW > hstep * i * 2) {
        /*            ctx.drawImage(gframes[i],
                        50,
                        50,
                        refW - 110,
                        refH - 120,
                        i * hstep,
                        vstep * i,
                        Math.max(refW - (hstep * i * 2), 3),
                        Math.max(refH - (i * 2 * vstep), 3))*/
        // } else {
        //     console.log(i);
        // }
    }

    // ctx.drawImage(gframes[20], i, i,refW-i*2,refH-i)

}


function testCube(n) {
    let ratio = gframes[0].width / gframes[0].height
    let maxW = 500
    let maxH = maxW / ratio

    let can = document.getElementById("testStack")
    let ctx = can.getContext("2d");

    let refW = Math.min(gframes[0].width, maxW / 2)
    let refH = Math.min(gframes[0].height, maxH / 2)


    can.width = maxW
    can.height = maxH

    let hstep = (maxW - refW) / gframes.length
    let vstep = (maxH - refH) / gframes.length

    ctx.globalAlpha = 0.9;
    for (let i = gframes.length - 1; i > 0; i--) {
        if (i < n)
            ctx.globalAlpha = 0;
        ctx.drawImage(gframes[i],
            0,
            0,
            gframes[i].width,
            gframes[i].height - 50, //to skip overlay on bike
            i * hstep,
            maxH - (vstep * i) - refH,
            refW,
            refH)
    }
    ctx.globalAlpha = 1;
    ctx.beginPath()
    ctx.moveTo(hstep, maxH - (vstep * 0) - refH)
    ctx.lineTo(hstep + refW, maxH - (vstep * gframes.length) - refH)
    ctx.lineTo((gframes.length * hstep) + refW - hstep, maxH - (vstep * gframes.length) - refH)
    ctx.lineTo(hstep + refW, maxH - (vstep * 0) - refH)
    ctx.lineTo(hstep, maxH - (vstep * 0) - refH)
    ctx.stroke()
    ctx.closePath()

    ctx.beginPath()
    ctx.moveTo(hstep + refW, maxH - (vstep * 0) - refH)
    ctx.lineTo(hstep + refW, maxH)
    ctx.lineTo((gframes.length * hstep) + refW - hstep, maxH - (vstep * gframes.length))
    ctx.lineTo((gframes.length * hstep) + refW - hstep, maxH - (vstep * gframes.length) - refH)

    ctx.stroke()
    ctx.closePath()

    ctx.beginPath()
    ctx.moveTo(hstep, maxH - (vstep * 0) - refH)
    ctx.lineTo(hstep, maxH - vstep)
    ctx.lineTo(hstep + refW, maxH - vstep)


    ctx.stroke()
    ctx.closePath()

}

function showSlitInCubes(n) {
    let ratio = gframes[0].width / gframes[0].height
    let maxW = 500
    let maxH = maxW / ratio

    let can = document.getElementById("testStack")
    let ctx = can.getContext("2d");

    let refW = Math.min(gframes[0].width, maxW / 2)
    let refH = Math.min(gframes[0].height, maxH / 2)


    can.width = maxW
    can.height = maxH + 1

    let hstep = (maxW - refW) / gframes.length
    let vstep = (maxH - refH) / gframes.length

    ctx.globalAlpha = 0.9;

    let slits = Object.keys(presetStripes)


    // let coords = [
    //      [ [0.01,0.3],[0.3,0.05] ],
    //
    //       [ [0.5,0.9],[0.3,0.05] ],
    //   ]

    // let coords =
    //     [
    //         [[0.6, 0.35], [0.3, 0.4]],
    //         [[0.3, 0.2], [0.3, 0.4]],
    //         [[0.03, 0.04], [0.3, 0.4]],
    //     ]

    let id = 2
    let it = 0
    for (let i = gframes.length - 1; i > 0; i--) {

        if (i < n)
            ctx.globalAlpha = 0;

        for (let j = 0; j < slits.length; j++) {
            let slit = presetStripes[slits[j]]

            let tx = slit.rect.x * gframes[i].width
            let ty = slit.rect.y * gframes[i].height
            let tw = slit.rect.width * gframes[i].width
            let th = slit.rect.height * gframes[i].height

            // if (i > gframes.length * 0.65) {
            //
            //     id = 2
            // } else if (i > gframes.length * 0.4) {
            //     id = 1
            // }
            // else if (i > gframes.length * 0.2) {
            //     id = 0
            // }
            // console.log(id);
            // console.log(coords[id]);

            // let tx = 0.05 * gframes[i].width
            // let ty = 0.8
            // let tw = 0.3 * gframes[i].width
            // let th = 0.95 * gframes[i].height


            // if (j ==1 ) {
            //      tx = 0.5 * gframes[i].width
            //      ty = 0.8 * gframes[i].height
            //      tw = 0.3 * gframes[i].width
            //      th = 0.95 * gframes[i].height
            // }
            // if (j == 2) {
            //     ctx.globalAlpha = 1
            // } else {
            //     ctx.globalAlpha = 1
            // }


            ctx.drawImage(gframes[i],
                tx,
                ty,
                tw,
                th,
                i * hstep + (slit.rect.x * refW),
                maxH - (vstep * i) - refH + (slit.rect.y * refH),
                slit.rect.width * refW,
                slit.rect.height * refH)


            // ctx.drawImage(gframes[i],
            //     tx,
            //     ty,
            //     tw,
            //     th,
            //     i * hstep + (coords[j][0][0] * refW),
            //     maxH - (vstep * i) - refH + (coords[j][0][1] * refH),
            //     coords[j][1][0] * refW,
            //     coords[j][1][1] * refH)


        }
        it++

    }


    ctx.globalAlpha = 1;
    ctx.beginPath()
    ctx.moveTo(hstep, maxH - (vstep * 0) - refH)
    ctx.lineTo(hstep + refW, maxH - (vstep * gframes.length) - refH)
    ctx.lineTo((gframes.length * hstep) + refW - hstep, maxH - (vstep * gframes.length) - refH)
    ctx.lineTo(hstep + refW, maxH - (vstep * 0) - refH)
    ctx.lineTo(hstep, maxH - (vstep * 0) - refH)
    ctx.stroke()
    ctx.closePath()

    ctx.beginPath()
    ctx.moveTo(hstep + refW, maxH - (vstep * 0) - refH)
    ctx.lineTo(hstep + refW, maxH)
    ctx.lineTo((gframes.length * hstep) + refW - hstep, maxH - (vstep * gframes.length))
    ctx.lineTo((gframes.length * hstep) + refW - hstep, maxH - (vstep * gframes.length) - refH)

    ctx.stroke()
    ctx.closePath()

    ctx.beginPath()
    ctx.moveTo(hstep, maxH - (vstep * 0) - refH)
    ctx.lineTo(hstep, maxH - vstep)
    ctx.lineTo(hstep + refW, maxH - vstep)


    ctx.stroke()
    ctx.closePath()

}


function updateCube(e) {
    let elem = e.target || e.srcElement

    let ratio = elem.currentTime / elem.duration

    // testCube(Math.min(Math.floor(ratio * gframes.length), gframes.length - 1))
}


async function testPyramidAnim() {
    for (let i = 0; i < gframes.length - 1; i++) {
        testSack(i);
        await new Promise(r => setTimeout(r, 15));

    }

}

function fakeVideo() {
    dispatchView(undefined, 0)
    document.getElementById("videoInput").click()
}

function fakeGpx() {
    document.getElementById("trajectoryFile").click()

}

function fakeBg() {
    document.getElementById("mainBg").click()
}

function fakeData() {
    document.getElementById("mainChart").click()
}


function fakeSea() {
    document.getElementById("seaFile").click()
}


function seaTraj(file) {

    const reader = new FileReader();

    reader.onload = async function (e) {

        let tt = d3.csvParse(e.target.result)
        let mapCoords = tt.map(d => [+d.x_map, +d.y_map])
        let can = document.getElementById("main")
        let trect = can.getBoundingClientRect()
        let viewDim = [trect.width, trect.height]

        let xscale = d3.scaleLinear([0, 60], [0, seaMap[0]])
        let yscale = d3.scaleLinear([0, 60], [seaMap[1], 0])

        console.log(viewDim[0]);
        stroke = mapCoords.map(d => [(viewDim[0] - seaMap[0]) / 2 + xscale(d[0]), yscale(d[1])])

        let cont = can.getContext("2d")
        draw(cont, stroke)

    }

    reader.readAsText(file);
}


function dispatchView(elem, n) {

    document.querySelector(".SelectedOption").classList.toggle("SelectedOption");
    if (elem) {
        elem.classList.toggle("SelectedOption");
    } else {
        document.querySelector(".displayOption").classList.toggle("SelectedOption");
    }

    if (n == viewMod) {

    } else if (n == 0) {
        document.getElementById("mainVideo").style.display = "inline-block";
        document.getElementById("testStack").style.display = "none";


    } else if (n == 1) {
        document.getElementById("mainVideo").style.display = "none";
        document.getElementById("testStack").style.display = "inline-block";
        testCube(0)

    } else if (n == 2) {
        document.getElementById("mainVideo").style.display = "none";
        document.getElementById("testStack").style.display = "inline-block";
        showSlitInCubes(0)
    } else if (n == 3) {
        document.getElementById("mainVideo").style.display = "none";
        document.getElementById("testStack").style.display = "inline-block";
        testSack(0)


    }
    viewMod = n
}

function nani() {
    let container = document.getElementById("debugger");

    container.appendChild(gframes[0]);
}