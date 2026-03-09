const svgLeft = 5
const svgRight = 8
const svgTop = 4
const svgBottom = 6

let intervals = []

let brushFlip = false;

function stripeTransform(canvas, intervals, effect) {

    let [merged, anti] = processIntervals(intervals);
    let can = document.createElement('canvas');

    can.width = canvas.width;
    can.height = canvas.height;

    console.log(merged);
    console.log(anti);
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

        tcon.drawImage(canvas, tx,
            0,
            tw,
            can.height,
            0,
            0,
            tw,
            can.height)


        tcan = jagged(tcan)

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


function initBrush() {

    let svg = d3.select("#stripeBrush");

    let nb = Object.keys(stripes).length

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


    intervals.push([select[0] / svgW, select[1] / svgW])
}

function toogleJagged(element) {
    brushFlip = !brushFlip

    if (brushFlip) {
        element.classList.toggle("selectedBrush")
        initBrush()
    } else {
        element.classList.toggle("selectedBrush")
        delBrush()
    }
}