let nStripe = 0
let selectedStripe = null

let stripes = {}
let slitEdit = false
const defaultSampleSize = [1, 100]


function makeClientStripe(n = undefined) {
    let container = document.getElementById('stripeList');

    let row = document.createElement("div")
    let options = document.createElement("div");
    let tcan = document.createElement("canvas");

    let trow = (n !== undefined ? n : nStripe)

    row.setAttribute("class", "stripeRow")
    options.setAttribute("class", "slitInfo")
    tcan.setAttribute("class", "stripeCan")
    tcan.setAttribute("row", trow)

    // All options of a stripe live in the settings dialog (stripeSettings.js). The row only keeps the slit tools,
    // the button that opens the dialog and a one-line summary of what is switched on.
    options.innerHTML = `
    <div class="stripeTitle">Stripe ${isNaN(+trow) ? trow : (+trow) + 1}</div>
    <div class="stripeTypes">
        <img class="rectSlit" row="${trow}" src="assets/images/pictos/rect.png" title="Draw a rectangular slit on the video" alt="Draw a rectangular slit"/>
        <img class="lineSlit" row="${trow}" src="assets/images/pictos/poly.png" title="Draw a line slit on the video" alt="Draw a line slit"/>
        <button type="button" class="stripeGear" row="${trow}" title="All options of this stripe">&#9881; Options</button>
    </div>
    <div class="stripeBadges" row="${trow}"></div>
    `
    let tcross = document.createElement("div");
    tcross.setAttribute("row", trow)
    tcross.innerHTML = `<img row="${trow}" class="delRowImg" src="assets/images/pictos/cross.png" title="Delete this stripe" alt="Delete this stripe"/>`
    row.appendChild(tcross)
    row.appendChild(options)
    row.appendChild(tcan)
    container.appendChild(row)
    slitEvents(row)
    if (n === undefined) {
        stripes[nStripe] = {}
        ++nStripe
    }
    updateStripeBadges(trow)


    tcan.onclick = async e => {

        let rect = tcan.getBoundingClientRect()
        const ratio = e.offsetX / rect.width
        updateVid(ratio)
        testCube(Math.floor(ratio * gframes.length))
    }
}


function iniStripe() {

    let can = document.getElementById('stripe');

    const ctx = can.getContext("2d");


    const gradient = ctx.createLinearGradient(0, 0, can.width, 10);

    gradient.addColorStop(0, "blue");
    gradient.addColorStop(0.5, "white");
    gradient.addColorStop(1, "red");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, can.width, can.height / 2);

    const gradient2 = ctx.createLinearGradient(0, 0, can.width, 10);

    gradient2.addColorStop(0, "orange");
    gradient2.addColorStop(0.5, "white");
    gradient2.addColorStop(1, "green");

    ctx.fillStyle = gradient2;
    ctx.fillRect(0, can.height / 2, can.width, can.height);

    // debugSquares(can)
}


function debugSquares(can) {
    const sqSize = 20
    const cont = can.getContext("2d")
    cont.beginPath()
    for (let i = 0; i < Math.floor(can.width / sqSize); i++) {
        // for (let j = 0; j < Math.floor(can.height / sqSize); j++) {
        let j = 0
        cont.rect(i * sqSize, j * sqSize, sqSize, sqSize)
        // }
    }
    cont.stroke()
    cont.closePath()

}

function rectMatch(pts, height, type = 'pointWise') {
    let stripe = document.getElementById('stripe');
    let can = document.getElementById('main');
    const ctx = can.getContext("2d");

    let w = stripe.width / pts.length;
    let orrs = getTrajFullOrr(pts)

    if (type === 'pointWise') {


        for (let i = 0; i < pts.length; i++) {

            const rad = orrs[i] * Math.PI / 180;

            ctx.translate(pts[i][0] + w / 2, pts[i][1] - height / 2);
            ctx.rotate(rad);
            ctx.drawImage(stripe, w * i, 0, w, stripe.height, 0, 0, w, height);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }


    }

    if (type === 'stretch') {
        const dists = getTrajFullDist(pts)
        const total = dists.reduce((acc, curr) => acc + curr)
        let acc = 0

        for (let i = 0; i < pts.length; i++) {

            const rad = orrs[i] * Math.PI / 180;

            const tw = Math.max(dists[i], 1)

            const ratio = (tw / total) * stripe.width
            acc += ratio - 0.5 //TODO: change the minus to fix matching
            ctx.translate(pts[i][0], pts[i][1]);
            ctx.fillRect(-5, -5, 10, 10);
            ctx.rotate(rad);
            ctx.drawImage(stripe, acc, 0, ratio, stripe.height, -tw / 2, -height / 2, tw, height);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }


    }


}

function slitEvents(row) {

    row.onclick = (e) => {
        const el = e.target;

        if (el.matches(".rectSlit")) {
            toggleSlitEdit("rect", el.getAttribute("row"), el)
        } else if (el.matches(".lineSlit")) {
            toggleSlitEdit("line", el.getAttribute("row"), el)
        } else if (el.closest(".stripeGear")) {
            openStripeSettings(el.closest(".stripeGear").getAttribute("row"))
        } else if (el.matches(".delRowImg")) {
            const n = +el.getAttribute("row")
            row.remove()
            delete stripes[n]
        }
    }
}

/** Starts (or stops) drawing a slit on the video for stripe n. forceOn restarts it when another slit is being edited. */
function toggleSlitEdit(type, n, el, forceOn = false) {
    const key = isNaN(+n) ? n : +n
    const btn = el || document.querySelector(`.${type}Slit[row='${key}']`)
    if (slitEdit && forceOn) {
        document.querySelectorAll(".slitEdit").forEach(b => b.classList.remove("slitEdit"))
        slitEdit = false
        resetSvg()
    }
    selectedStripe = key
    if (!slitEdit) {
        slitEdit = true
        if (btn) btn.classList.add("slitEdit")
        prepSvg(type, key)
    } else {
        if (btn) btn.classList.remove("slitEdit")
        slitEdit = false
        resetSvg()
    }
}

/**
 * Older presets used a special `type` per feature ("flow", "bird", "fluid"). Everything is an option of a rectangular
 * slit now, so those presets are converted once.
 */
function normalizeStripe(s) {
    if (!s || s._normalized) return s
    if (s.type === "flow") {
        s.type = "rect"
        if (s.emphasis === undefined) s.emphasis = {mode: s.mode || "near", ...(s.boost !== undefined ? {boost: s.boost} : {})}
    } else if (s.type === "bird") {
        s.type = "rect"
        if (s.birdsEye === undefined) s.birdsEye = true
    } else if (s.type === "fluid") {
        s.type = "rect"
        if (s.fluid === undefined) s.fluid = true
    }
    s._normalized = true
    return s
}

/** The one-line summary of the active options shown in a stripe row. */
function updateStripeBadges(n) {
    const box = document.querySelector(`.stripeBadges[row='${n}']`)
    const s = stripes[n]
    if (!box || !s) return
    normalizeStripe(s)
    const bird = typeof birdsEyeConfig === "function" && birdsEyeConfig(s)
    const emph = typeof emphasisConfig === "function" && emphasisConfig(s)
    const items = []
    items.push([s.type === "line" ? "line slit" : (s.rect ? "rect slit" : "no slit yet"), "base"])
    if (s.fov && !bird) items.push(["90\u00b0", ""])
    if (s.flip) items.push(["flip", ""])
    if (s.skew) items.push(["skew", ""])
    if (bird) items.push(["bird's-eye", "on"])
    if (s.fluid) items.push(["tracking: " + ((s.fluidOpts && s.fluidOpts.mode) || "ground"), "on"])
    if (emph) items.push(["flow: " + emph.mode, "on"])
    if (s.lengthMode === "path") items.push(["length: path", ""])
    else if (s.lengthMode === "frames") items.push([(s.fps || 1) + " frame(s)/column", ""])
    else if (s.pxPerSecond && s.pxPerSecond !== 10) items.push([s.pxPerSecond + " px/s", ""])
    if (s.scale && s.scale !== 1) items.push(["\u00d7" + s.scale, ""])
    box.innerHTML = ""
    for (const [text, cls] of items) {
        const b = document.createElement("span")
        b.className = "stripeBadge " + cls
        b.textContent = text
        box.appendChild(b)
        box.appendChild(document.createTextNode(" "))     // keeps the badges apart for screen readers
    }
}

/**
 * Renders stripe n from its options. Whatever the options need is computed first (and cached on the stripe):
 * the fluid-slit track when `fluid` is on, the optical flow when the flow emphasis is on.
 * opts = {onProgress(stage, 0..1), signal (AbortSignal), force: "track" | "flow"}
 */
async function makeSlit(strip, n = selectedStripe, opts = {}) {
    normalizeStripe(strip)
    const can = document.querySelector(`.stripeCan[row='${n}']`)
    if (can) can.classList.add("stripeBusy")
    try {
        if (strip.type === "line") {
            if (strip.points && gframes.length) slitLine(gframes, ...strip.points, n)
            return
        }
        if (!strip.rect || !gframes || !gframes.length) return
        const progress = opts.onProgress
        if (strip.fluid) {
            await ensureTrack(gframes, strip.rect, n, progress && (f => progress("track", f)), opts.force === "track", opts.signal)
        }
        // the emphasis is skipped by slitRect for rotated and bird's-eye slits, so the flow is not computed for them
        if (emphasisConfig(strip) && !strip.fov && !birdsEyeConfig(strip)) {
            await ensureFlow(gframes, strip.rect, n, progress && (f => progress("flow", f)), opts.force === "flow", opts.signal)
        }
        slitRect(gframes, strip.rect, n)
    } finally {
        if (can) can.classList.remove("stripeBusy")
        updateStripeBadges(n)
    }
}


function prepSvg(type, n) {
    const vid = document.getElementById('mainVideo');
    const svg = d3.select("#videoOverlay")
    vid.controls = false
    selectedStripe = n
    stripes[selectedStripe].type = type
    // stripes[selectedStripe].fov = true
    svg.style('display', 'inline-block');

    if (type === "rect") {
        svg.append("g")
            .attr("class", "brush")
            .call(d3.brush().on("end", brushed))
        // .extent()
    } else if (type === "line") {
        const cr = 7
        stripes[selectedStripe].points = [{x: 0, y: 0.5}, {x: 1, y: 0.5}]

        let pt1 = stripes[selectedStripe].points[0]
        let pt2 = stripes[selectedStripe].points[1]
        svg.append("line")
            .attr("id", "slitLine")
            .attr("x1", vidSize.width * pt1.x)
            .attr("y1", vidSize.height * pt1.y)
            .attr("x2", vidSize.width * pt2.x)
            .attr("y2", vidSize.height * pt2.y)
            .attr("stroke-width", 2)
            .attr("stroke", "black")

        svg.append("circle")
            .attr("id", "pointer1")
            .attr("cx", vidSize.width * pt1.x)
            .attr("cy", vidSize.height * pt1.y)
            .attr("r", cr)
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        svg.append("circle")
            .attr("id", "pointer2")
            .attr("cx", vidSize.width * pt2.x)
            .attr("cy", vidSize.height * pt2.y)
            .attr("r", cr)
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        slitLine(gframes, ...stripes[selectedStripe].points, selectedStripe)
    }
}


function dragstarted() {
    d3.select(this).attr("stroke", "black");
}

function dragged(event) {
    const elem = d3.select(this)
    elem.raise().attr("cx", event.x).attr("cy", event.y);

    let id = +elem.attr("id").slice(-1) - 1

    stripes[selectedStripe].points[id] = {x: event.x / vidSize.width, y: event.y / vidSize.height};

    d3.select("#slitLine")
        .attr("x1", vidSize.width * stripes[selectedStripe].points[0].x)
        .attr("y1", vidSize.height * stripes[selectedStripe].points[0].y)
        .attr("x2", vidSize.width * stripes[selectedStripe].points[1].x)
        .attr("y2", vidSize.height * stripes[selectedStripe].points[1].y)

}

function dragended() {
    d3.select(this).attr("stroke", null);


    slitLine(gframes, ...stripes[selectedStripe].points, selectedStripe)
}


async function brushed(e) {
    const select = e.selection
    if (!select) return                                  // the brush was cleared: nothing to draw

    let rect = {
        x: select[0][0] / vidSize.width,
        y: select[0][1] / vidSize.height,
        width: (select[1][0] - select[0][0]) / vidSize.width,
        height: (select[1][1] - select[0][1]) / vidSize.height
    }

    stripes[selectedStripe].rect = rect
    // renders with the stripe's options (set in the settings dialog)
    await makeSlit(stripes[selectedStripe], selectedStripe)
}

function resetSvg() {
    const vid = document.getElementById('mainVideo');
    const svg = d3.select("#videoOverlay")
    vid.controls = true
    svg.style('display', 'none');
    svg.selectAll("*").remove()
}


function updateVid(ratio) {

    const vid = document.getElementById('mainVideo');
    vid.currentTime = vid.duration * ratio;
}


function mergeSlits() {
    let tH = 0
    let mW = 0

    // let distribution = [1, 0.5]
    let scale = 1
    // let i = 0
    for (const [key, value] of Object.entries(stripes)) {
        // console.log(key);
        let can = d3.select(`.stripeCan[row='${key}'`).node()

        if (stripes[key].scale) {
            scale = stripes[key].scale
        } else {
            scale = 1
        }

        tH += can.height * scale
        mW = (can.width > mW ? can.width : mW)
    }


    let ref = document.createElement("canvas");
    ref.width = mW;
    ref.height = tH;
    let tcon = ref.getContext("2d")

    // document.getElementById("debugger").appendChild(ref)
    let currH = 0
    const angle = 30 * Math.PI / 180;
    // overscan used to be a fixed 60 px, which is ~1% of a 6000 px stripe but cuts off ~10% of the end of a short one
    const margin = Math.min(60, Math.round(mW * 0.01))
    for (const [key, value] of Object.entries(stripes)) {
        let can = d3.select(`.stripeCan[row='${key}'`).node()
        let tth = 0

        if (stripes[key].scale) {
            scale = stripes[key].scale
        } else {
            scale = 1
        }
        tth += can.height * scale
        /*        if (nStripe === distribution.length) {
                    //
                } else {
                    tth += can.height
                }*/

        if (stripes[key].skew) {

            // tcon.setTransform(1, Math.tan(angle), 0, 1, 0, 0);
            tcon.transform(1, 0, Math.tan(angle), 1, 0, 0);
            tcon.drawImage(can, -margin, currH, mW - margin, tth)
            tcon.resetTransform()
        } else if (stripes[key].flip) {
            tcon.drawImage(can, 0, currH, mW + margin, tth)
        } else {
            tcon.drawImage(can, 0, currH, mW + margin, tth)
        }

        currH += tth
    }


    // if (intervals.length > 0) {
    //     ref = stripeTransform(ref, intervals)
    // }


    for (const [key, value] of Object.entries(megaIntervals)) {
        if (value.type.toLowerCase() == "interval") {
            if (value.data.length > 0) {
                ref = stripeTransform(ref, value)
            }
        } else if (value.type.toLowerCase() == "linear") {
            if (value.data.length > 0) {
                ref = slicedLinear(ref, value)
            }
        }
    }


    // document.getElementById("debugger").appendChild(ref)

    return ref

}


let presetGeneration = 0

async function loadPreset() {
    const generation = ++presetGeneration                // two overlapping calls (setup + "Reset preset") must not both add rows
    stripes = {}
    nStripe = Object.keys(presetStripes).length          // set first: the loop below awaits, and "+" may be clicked meanwhile

    document.getElementById("stripeList").innerHTML = ''

    for (const [key, value] of Object.entries(presetStripes)) {
        if (generation !== presetGeneration) return      // a newer loadPreset() has taken over
        stripes[key] = JSON.parse(JSON.stringify(value))  // a copy, so "Reset preset" really resets what the dialog changed
        selectedStripe = key
        makeClientStripe(key)
        await makeSlit(stripes[key], key)
    }
}

function resetInterval(row) {

    delBrush()
    delete megaIntervals[row]
    // delete
    document.getElementById('intervalList').innerHTML = ''
    drawAllIntervals()
}


function loadTransformModal(row) {

    let select = document.getElementById('transformType');
    currInterRow = row
    const dialog = document.getElementById("transformSettings");
    dialog.showModal();
    fillModalOptions(megaIntervals[currInterRow].transform.type)
    fillTypeSelect(megaIntervals[currInterRow].transform.type)
}


function fillTypeSelect(type = undefined) {
    let cont = document.getElementById('transformType');
    cont.innerHTML = ""
    for (const [key, value] of Object.entries(transforms)) {
        cont.innerHTML += `<option value="${key}" ${(key === type ? "selected" : "")}>${key}</option>`
    }


    cont.oninput = function () {
        megaIntervals[currInterRow].transform.type = cont.value
        fillModalOptions(cont.options[cont.selectedIndex].text)

    }

    // fillDataInfo(megaIntervals[currInterRow].transform.type,megaIntervals[currInterRow].type)


}

function fillModalOptions(type) {

    let container = document.getElementById('transformOptions');
    container.innerHTML = '';
    megaIntervals[currInterRow].transform.values = {}
    for (const option of transforms[type].options) {

        let tinpunt = document.createElement("input");
        let label = document.createElement("label");

        container.appendChild(label);
        container.appendChild(tinpunt);
        label.innerHTML = option.name;
        tinpunt.type = option.type;
        tinpunt.value = option.value;

        megaIntervals[currInterRow].transform.values[option.name] = option.value

        if (option.type == "range") {
            tinpunt.setAttribute("min", 0)
            tinpunt.setAttribute("max", 1)
            tinpunt.setAttribute("step", 0.1)

        }

        tinpunt.oninput = function () {

            megaIntervals[currInterRow].transform.values[option.name] = tinpunt.value;
        }


    }
    let dataRows = document.getElementById("dataRow");
    dataRows.innerHTML = ""
    for (const [key, value] of Object.entries(derivedData)) {
        dataRows.innerHTML += `<option value="${key}" >${key}</option>`
    }

    dataRows.oninput = function () {
        fillDataInfo(dataRows.value, megaIntervals[currInterRow].type)
    }

    let defaultData = Object.keys(derivedData)
    if (defaultData.length > 0) {
        fillDataInfo(defaultData[0], megaIntervals[currInterRow].type)
    }
}

function fillDataInfo(key, type) {
    let infos = document.getElementById("dataExtent");
    let range = [0, 0]

    if (derivedData[key].length > 0) {
        range = d3.extent(derivedData[key]);
    }
    infos.innerHTML = `<p><span style="font-weight: 600">min:</span> ${range[0]}, <span style="font-weight: 600">max:</span> ${range[1]}</p>`;

    let operators = document.getElementById("dataOperator");
    operators.innerHTML = ""
    if (type.toLowerCase() == "interval") {
        operators.innerHTML = `<select id="interSign">
                <option value="0"> >  </option>
                <option value="1"> < </option>
                </select>
                   <input id="interVal" type="number" value="0" min="${range[0]}" max="${range[1]}"> `;
    } else if (type.toLowerCase() == "linear") {
        operators.innerHTML = `
<p><span style="font-weight: 600">min Val:</span></p>
          <input id="LinearMinVal" type="range" step="0.1" value="0" min="0" max="1"> 
          <p><span style="font-weight: 600">Max Val:</span></p>
            <input id="LinearMaxVal" type="range" step="0.1" value="1" min="0" max="1"> 
        `
        //TODO: Linear
    } else if (type == "none") {


    }

}


function applyData() {

    let type = document.getElementById("dataType");

    megaIntervals[currInterRow].type = type.options[type.selectedIndex].text

    let dRow = document.getElementById("dataRow")
    let dataRow = dRow.options[dRow.selectedIndex].text

    if (megaIntervals[currInterRow].type === "Interval") {
        let op = document.getElementById("interSign").value;
        let tval = document.getElementById("interVal").value;

        let inters = makeInters(derivedData[dataRow], op, tval)
        console.log(inters);
        megaIntervals[currInterRow].data = inters;
        drawAllIntervals()
    } else if (megaIntervals[currInterRow].type === "Linear") {
        let min = document.getElementById("LinearMinVal").value
        let max = document.getElementById("LinearMaxVal").value
        let extent = d3.extent(derivedData[dataRow])
        let range = d3.scaleLinear(extent, [min, max]).clamp(true);
        megaIntervals[currInterRow].data = derivedData[dataRow].map(d => +range(d))

    }

    makeMapping(stroke.map(d => {
        return {x: d[0], y: d[1]}
    }))

}


function makeInters(data, type, threshold) {

    let res = []
    let temp = []
    let flag = false
    for (let i = 0; i < data.length; i++) {
        if (type == 0) {
            if (data[i] > threshold) {
                if (flag === false) {
                    flag = true
                    temp.push(i / data.length)
                }
            } else {
                if (flag) {
                    temp.push(i / data.length)
                    flag = false
                    res.push(temp)
                    temp = []
                }
            }
        }
        if (type == 1) {
            if (data[i] < threshold) {
                if (flag === false) {
                    flag = true
                    temp.push(i / data.length)
                }
            } else {
                if (flag) {
                    temp.push(i / data.length)
                    flag = false
                    res.push(temp)
                    temp = []
                }
            }
        }

    }

    if (flag) {
        temp.push(1)
        res.push(temp)
    }

    return res
}


function updateFromDataType() {

    let val = document.getElementById("dataType").value;
    let dataRows = document.getElementById("dataRow").value;
    fillDataInfo(dataRows, val)

}


function closeModal() {
    const dialog = document.getElementById("transformSettings");
    dialog.close();
}