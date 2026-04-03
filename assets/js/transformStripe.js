const svgLeft = 5
const svgRight = 8
const svgTop = 4
const svgBottom = 6

let intervals = []

let megaIntervals = {}

let currInterRow = 0

let brushFlip = false;

let nInterRow = 0


let transforms = {
    "spike": {options: [{"type": "range", name: "Intensity", value: 0.5}]},
    "direction": {options: [{"type": "range", name: "Intensity", value: 0.5}]},
    "color": {
        options: [{"type": "color", name: "Color", value: "#555"}, {
            "type": "range",
            name: "Intensity",
            value: 0.5
        }]
    },
    "grayscale": {options: [{"type": "range", name: "Intensity", value: 0.5}]},
    "blur": {options: [{"type": "range", name: "Intensity", value: 0.5}]},
    "opacity": {options: [{"type": "range", name: "Intensity", value: 0.5}]},
    "height": {options: [{"type": "range", name: "Intensity", value: 0.5}]},
    "border": {options: [{"type": "range", name: "Intensity", value: 0.5}]},
    "brightness": {options: [{"type": "range", name: "Intensity", value: 0.5}]},
    "invert": {options: [{"type": "range", name: "Intensity", value: 0.5}]},
    "pixelate": {options: [{"type": "range", name: "Intensity", value: 0.5}]},

}

function closestIndex(ratio, len) {
    return Math.min(len - 1, Math.round(len * ratio))

}

function slicedLinear(canvas, interval) {
    const sampleRate = 10
    let can = document.createElement('canvas');

    can.width = canvas.width;
    can.height = canvas.height;
    let ctx = can.getContext('2d');

    for (let i = 0; i < can.width; i += sampleRate) {

        let miniCan = document.createElement('canvas');
        let miniCon = miniCan.getContext('2d');
        miniCan.width = sampleRate;
        miniCan.height = canvas.height;

        miniCon.drawImage(canvas,
            i,
            0,
            sampleRate,
            can.height,
            0,
            0,
            sampleRate,
            can.height)

        // console.log(interval.data);
        let val = interval.data[closestIndex(i / can.width, interval.data.length)]

        if (interval.transform.type.toLowerCase() !== "color") {
            console.log(interval.transform.type, val);
            let tminiCan = applyTransform(miniCan, interval.transform.type, val);

            ctx.drawImage(tminiCan, 0,
                0,
                sampleRate,
                can.height,
                i,
                0,
                sampleRate,
                can.height)
        } else {
            let tminiCan = applyTransform(miniCan, interval.transform.type, interval.transform.values["Color"], val);
            ctx.drawImage(tminiCan, 0,
                0,
                sampleRate,
                can.height,
                i,
                0,
                sampleRate,
                can.height)
        }


    }
    return can

}


function applyTransform(can, type, val, val2 = undefined) {
    if (type === "spike") {
        can = jagged(can)
    } else if (type === "direction") {

        can = triangles(can, val)

    } else if (type === "color") {
        can = colored(can, val, val2) // color then alpha
    } else if (type === "opacity") {

        can = opacity(can, val)

    } else if (type === "height") {

        can = height(can, val)

    } else if (type === "border") {

        can = border(can, val)

    } else if (type === "brightness") {
        can = brightness(can, val)
    } else if (type === "grayscale") {
        can = grayscale(can, val)
    } else if (type === "blur") {
        can = blur(can, val)
    } else if (type === "invert") {
        can = invert(can, val)
    } else if (type === "pixelate") {
        can = pixelate(can, val / 2)
    }
    return can
}

function stripeTransform(canvas, interval) {
    let [merged, anti] = processIntervals(interval.data);
    let can = document.createElement('canvas');
    // document.getElementById("debugger").appendChild(canvas)
    can.width = canvas.width;
    can.height = canvas.height;

    let ctx = can.getContext('2d');

    for (let i = 0; i < anti.length; i++) {

        let tx = can.width * anti[i][0]
        let tw = (can.width * anti[i][1]) - tx

        ctx.drawImage(canvas, tx,
            0,
            tw,
            can.height,
            tx,
            0,
            tw,
            can.height)

    }

    for (let i = 0; i < merged.length; i++) {

        let tcan = document.createElement('canvas');
        let tcon = tcan.getContext('2d');

        let tx = can.width * merged[i][0]
        let tw = (can.width * merged[i][1]) - tx

        tcan.width = tw
        tcan.height = can.height

        tcon.drawImage(canvas, tx,
            0,
            tw,
            can.height,
            0,
            0,
            tw,
            can.height)


        if (interval.transform.type === "spike") {
            tcan = jagged(tcan)
        } else if (interval.transform.type === "color") {
            tcan = colored(tcan, interval.transform.values["Color"], interval.transform.values["Intensity"])
        } else if (interval.transform.type === "opacity") {

            tcan = opacity(tcan, interval.transform.values["Intensity"])

        } else if (interval.transform.type === "height") {

            tcan = height(tcan, interval.transform.values["Intensity"])

        } else if (interval.transform.type === "border") {

            tcan = border(tcan, interval.transform.values["Intensity"])

        } else if (interval.transform.type === "direction") {

            tcan = triangles(tcan, interval.transform.values["Intensity"])

        } else if (interval.transform.type === "brightness") {
            tcan = brightness(tcan, interval.transform.values["Intensity"])
        } else if (interval.transform.type === "grayscale") {
            tcan = grayscale(tcan, interval.transform.values["Intensity"])
        } else if (interval.transform.type === "blur") {
            tcan = blur(tcan, interval.transform.values["Intensity"])
        } else if (interval.transform.type === "invert") {
            tcan = invert(tcan, interval.transform.values["Intensity"])
        } else if (interval.transform.type === "pixelate") {
            tcan = pixelate(tcan, interval.transform.values["Intensity"])
        }


        ctx.drawImage(tcan, 0,
            0,
            tcan.width,
            tcan.height,
            tx,
            0,
            tw,
            can.height)
    }

    return can
}


function height(canvas, n) {

    let w = canvas.width;
    let h = canvas.height;


    const tcan = document.createElement("canvas");
    tcan.width = w
    tcan.height = h

    let offset = Math.round((h * n))
    const tcon = tcan.getContext("2d")

    tcon.save()
    console.log(offset);
    tcon.drawImage(canvas, 0,
        0,
        w,
        h,
        0,
        (h/2) - (offset/2),
        w,
        offset)

    tcon.restore()
    return tcan
}


function border(canvas, n) {

    let tcon = canvas.getContext('2d');
    let w = canvas.width;
    let h = canvas.height * n;

    tcon.save()
    tcon.fillStyle = "#FF0000";
    tcon.fillRect(0, 0, w, h);
    tcon.fillRect(0, canvas.height - h, w, h);
    tcon.restore()
    return canvas
}

function colored(canvas, color, alpha) {

    let tcon = canvas.getContext('2d');
    let w = canvas.width;
    let h = canvas.height;

    tcon.save()
    tcon.fillStyle = color;
    tcon.globalAlpha = alpha;
    tcon.fillRect(0, 0, w, h);
    tcon.restore()
    return canvas
}


function grayscale(canvas, n) {

    let context = canvas.getContext("2d")

    context.save()
    context.filter = `grayscale(${(n)})`;
    context.drawImage(canvas, 0, 0)
    context.restore()

    return canvas
}


function blur(canvas, n) {

    let context = canvas.getContext("2d")

    context.save()
    context.filter = `blur(${(n)}px)`;
    context.drawImage(canvas, 0, 0)
    context.restore()

    return canvas

}

function pixelate(canvas, n) {
    let w = canvas.width;
    let h = canvas.height;

    const ctx = canvas.getContext("2d");
    let currPx = w * h;
    if (n <= 1) {
        n = n / 20
        n = Math.round((currPx / 2) * n)
    }


    const nW = Math.min(w, parseInt(Math.max(3, Math.sqrt(n))));
    const nH = Math.min(h, parseInt(Math.max(3, Math.sqrt(n))));
    const tcan = document.createElement("canvas");
    tcan.width = nW
    tcan.height = nH
    const tcon = tcan.getContext("2d")

    tcon.drawImage(canvas, 0, 0, nW, nH);

    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
        tcon.canvas,
        0,
        0,
        tcon.canvas.width,
        tcon.canvas.height,
        0,
        0,
        canvas.width,
        canvas.height
    );

    return ctx.canvas;
    // return tcon.canvas
}

function brightness(canvas, n) {

    let context = canvas.getContext("2d")

    context.save()
    context.filter = `brightness(${(n)})`;
    context.drawImage(canvas, 0, 0)
    context.restore()

    return canvas

}


function invert(canvas, n) {

    let context = canvas.getContext("2d")

    context.save()
    context.filter = `invert(${(n)})`;
    context.drawImage(canvas, 0, 0)
    context.restore()

    return canvas

}

function opacity(canvas, alpha) {
    let can = document.createElement('canvas');

    can.width = canvas.width;
    can.height = canvas.height;
    let tcon = can.getContext('2d');


    tcon.globalAlpha = alpha
    tcon.drawImage(canvas, 0, 0)
    tcon.globalAlpha = 1
    return can
}


function triangles(canvas, val) {
    const toothHeight = 140 * val
    const toothWidth = 180 * val


    console.log("klalala");
    let can = document.createElement('canvas');

    can.width = canvas.width;
    can.height = canvas.height;

    let x = 0
    let y = 0

    const width = canvas.width;
    const height = canvas.height;

    let ctx = can.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(0, 0);

    // top
    let teeth = Math.floor(can.width / toothWidth);

    for (let i = 0; i < teeth; i++) {
        let px = x + i * toothWidth;
        ctx.lineTo(px + toothWidth, toothHeight);
        ctx.lineTo(px + toothWidth, y);
    }
    x = can.width
    y = can.height - toothHeight
    ctx.lineTo(x, 0);
    ctx.lineTo(x, y);
    // bot
    for (let i = 0; i < teeth; i++) {
        let px = x - i * toothWidth;
        ctx.lineTo(px - toothWidth, y + toothHeight);
        ctx.lineTo(px - toothWidth, y);
    }


    ctx.lineTo(0, y);
    ctx.lineTo(0, 0);

    ctx.closePath();

    ctx.clip();
    ctx.drawImage(canvas, 0, 0)
    // document.getElementById("debugger").appendChild(can)
    return can
}


function jagged(canvas) {
    const toothHeight = 20
    const toothWidth = 20

    let can = document.createElement('canvas');

    can.width = canvas.width;
    can.height = canvas.height;

    let x = 0
    let y = 0

    const width = canvas.width;
    const height = canvas.height;

    let ctx = can.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(0, 0);

    // top
    let teeth = Math.floor(can.width / toothWidth);

    for (let i = 0; i < teeth; i++) {
        let px = x + i * toothWidth;
        ctx.lineTo(px + toothWidth / 2, y + toothHeight);
        ctx.lineTo(px + toothWidth, y);
    }
    x = can.width
    y = can.height - toothHeight
    ctx.lineTo(x, 0);
    ctx.lineTo(x, y);
    // bot
    for (let i = 0; i < teeth; i++) {
        let px = x - i * toothWidth;
        ctx.lineTo(px - toothWidth / 2, y + toothHeight);
        ctx.lineTo(px - toothWidth, y);
    }


    ctx.lineTo(0, y);
    ctx.lineTo(0, 0);

    ctx.closePath();

    ctx.clip();
    ctx.drawImage(canvas, 0, 0)
    // document.getElementById("debugger").appendChild(can)
    return can
}


function orderIntervals(intervals) {
    return [...intervals].sort((a, b) => a[0] - b[0]);
}

function processIntervals(intervals) {
    if (!intervals.length) return [[0, 1]];

    const sorted = orderIntervals(intervals);
    const merged = [];
    for (const [start, end] of sorted) {
        if (!merged.length || merged[merged.length - 1][1] < start) {
            merged.push([start, end]);
        } else {
            merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end);
        }
    }

    const result = [];
    let prev = 0;

    for (const [start, end] of merged) {
        if (start > prev) {
            result.push([prev, start]);
        }
        prev = Math.max(prev, end);
    }

    if (prev < 1) {
        result.push([prev, 1]);
    }

    return [merged, result];
}


function initBrush(row) {

    let svg = d3.select("#stripeBrush");

    let nb = Object.keys(stripes).length

    currInterRow = row

    megaIntervals[currInterRow].data = []
    megaIntervals[currInterRow].type = "interval";

    svg.style("height", (109 * nb) + "px");
    svg.style("display", "inline-block");
    let svgW = +svg.style("width").replace("px", "");


    const svgSt = [svgLeft, svgTop]
    const svgEnd = [svgW - svgRight, (109 * nb) - svgBottom]

    svg.selectAll("g").remove();


    svg.append("g")
        .attr("class", "brush")
        .call(d3.brushX().extent([svgSt, svgEnd]).on("end", stripeBrushed))

}

function delBrush() {
    let svg = d3.select("#stripeBrush");
    svg.style("display", "none");
}

function stripeBrushed(e) {
    // console.log(e.selection);
    const select = e.selection

    console.log(select);


    let svg = d3.select("#stripeBrush");
    let svgW = +svg.style("width").replace("px", "")


    svgW = svgW - svgLeft - svgRight

    console.log(svgW);


    megaIntervals[currInterRow].data.push([select[0] / svgW, select[1] / svgW])


    document.getElementById('intervalList').innerHTML = ''
    drawAllIntervals()
}

function toogleJagged(element, row) {
    brushFlip = !brushFlip

    if (brushFlip) {
        element.classList.toggle("selectedBrush")
        initBrush(row)
    } else {
        element.classList.toggle("selectedBrush")
        delBrush()
    }
}

function testDrawInter() {

    let svg = d3.select("#testCaret")
    drawIntervalRow(svg, intervals)
}


function makeInterRow(container, row) {

    let tdiv = document.createElement("div");
    tdiv.setAttribute("row", row)
    tdiv.setAttribute("class", "interRow")
    let settingsDiv = document.createElement("div");
    settingsDiv.setAttribute("class", "interSettings")

    settingsDiv.innerHTML = `
        <div style="display: flex;float: right;margin-right:7px">
            <img row="${row}" onclick="resetInterval(${row})" class="intervalBtn" src="/assets/images/pictos/cross.png">
            <img row="${row}" onclick="loadTransformModal(${row})" class="intervalBtn" src="/assets/images/pictos/edit.png">
            <img row="${row}" onclick="toogleJagged(this,${row})" class="intervalBtn" src="/assets/images/pictos/rect.png">
<!--            <img row="${nInterRow}" onclick="sliceWithData(${row})" class="intervalBtn" src="/assets/images/pictos/data.png">-->
        
        </div>`


    let svg = d3.create("svg")
    svg.attr("class", "interSvg")
    svg.attr("row", row)

    tdiv.appendChild(settingsDiv);
    tdiv.appendChild(svg.node());
    container.appendChild(tdiv);

    drawIntervalRow(svg, megaIntervals[row].data, row)


}

function addIntervalSvg() {
    let container = document.getElementById("intervalList")

    let tdiv = document.createElement("div");
    tdiv.setAttribute("row", nInterRow)
    tdiv.setAttribute("class", "interRow")
    let settingsDiv = document.createElement("div");
    settingsDiv.setAttribute("class", "interSettings")

    settingsDiv.innerHTML = `
        <div style="display: flex;float: right;margin-right:7px">
            <img row="${nInterRow}" onclick="resetInterval(${nInterRow})" class="intervalBtn" src="/assets/images/pictos/cross.png">
            <img row="${nInterRow}" onclick="loadTransformModal(${nInterRow})" class="intervalBtn" src="/assets/images/pictos/edit.png">
            <img row="${nInterRow}" onclick="toogleJagged(this,${nInterRow})" class="intervalBtn" src="/assets/images/pictos/rect.png">
<!--            <img row="${nInterRow}" onclick="sliceWithData(${nInterRow})" class="intervalBtn" src="/assets/images/pictos/data.png">-->
        
        </div>
    `
    // let svg = document.createElement("svg");

    let svg = d3.create("svg")

    svg.attr("class", "interSvg")

    megaIntervals[nInterRow] = {
        type: "interval",
        data: [],
        transform: {
            type: "spike",
            values: {"intensity": 0}
        }

    }

    tdiv.appendChild(settingsDiv);
    tdiv.appendChild(svg.node());
    container.appendChild(tdiv);

    drawIntervalRow(svg, [], nInterRow)

    nInterRow++
}


function drawAllIntervals() {

    let container = document.getElementById("intervalList")
    container.innerHTML = ""
    for (const [key, value] of Object.entries(megaIntervals)) {
        makeInterRow(container, key)

    }

}


function drawIntervalRow(svg, intervals, row) {

    let lines = svg.append("g").attr("class", "stripeCarets");

    let rect = svg.node().getBoundingClientRect()
    const margin = 2

    let h = (rect.height * 0.8) - (margin * 2)
    let w = rect.width - (margin * 2)

    lines.append("line")
        .attr("x1", margin)
        .attr("y1", margin)
        .attr("x2", margin)
        .attr("y2", rect.height - margin)

    lines.append("line")
        .attr("x1", rect.width - margin)
        .attr("y1", margin)
        .attr("x2", rect.width - margin)
        .attr("y2", rect.height - margin)


    lines.append("line")
        .attr("x1", margin)
        .attr("y1", rect.height / 2)
        .attr("x2", rect.width - margin)
        .attr("y2", rect.height / 2)

    let inters = svg.append("g").attr("class", "stripeRects");


    for (const interval of intervals) {

        let tx = interval[0]
        let tw = interval[1]
        inters.append("rect")
            .attr("x", w * tx)
            .attr("y", rect.height / 2 - h / 2)
            .attr("width", (tw * w) - (w * tx))
            .attr("height", h)
    }
}


function sliceWithData() {

}


function makeData(path) {

    derivedData.turns = getTurns(path)
    derivedData.cumulDist = getCumulativeDistances(path)
    derivedData.index = path.map((d, i) => i)
    derivedData.distances = getSegmentDistances(path)

}


function getSegmentDistances(points) {
    const distances = [];

    for (let i = 1; i < points.length; i++) {
        const [x1, y1] = points[i - 1];
        const [x2, y2] = points[i];

        const dx = x2 - x1;
        const dy = y2 - y1;

        distances.push(Math.hypot(dx, dy));
    }

    return distances;
}

function getCumulativeDistances(points) {
    if (points.length === 0) return [];

    const cumdist = [0];
    let total = 0;

    for (let i = 1; i < points.length; i++) {
        const [x1, y1] = points[i - 1];
        const [x2, y2] = points[i];

        const d = Math.hypot(x2 - x1, y2 - y1);
        total += d;

        cumdist.push(total);
    }

    return cumdist;
}

function getTurns(points) {
    if (points.length < 3) return [];

    const turns = [0];

    for (let i = 1; i < points.length - 1; i++) {
        const [x0, y0] = points[i - 1];
        const [x1, y1] = points[i];
        const [x2, y2] = points[i + 1];

        const v1x = x1 - x0;
        const v1y = y1 - y0;
        const v2x = x2 - x1;
        const v2y = y2 - y1;


        const a1 = Math.atan2(v1y, v1x);
        const a2 = Math.atan2(v2y, v2x);

        let turn = a2 - a1;

        while (turn > Math.PI) turn -= 2 * Math.PI;
        while (turn < -Math.PI) turn += 2 * Math.PI;

        turns.push(turn);
    }

    return turns;
}
