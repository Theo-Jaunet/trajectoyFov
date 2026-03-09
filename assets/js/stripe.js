let nStripe = 0
let selectedStripe = null

let stripes = {}
let slitEdit = false
const defaultSampleSize = [10, 120]


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

    options.innerHTML = `
    <div class ="stripeTypes">
        <p>Sample Type:</p>
        <img class="rectSlit" row="${trow}" src="assets/images/pictos/rect.png"/>
        <img class="lineSlit" row="${trow}" src="assets/images/pictos/poly.png"/>
        <div>Fov<input type="checkbox" class="fovRadio" row="${trow}"> </div>
        <div>Skew<input type="checkbox" class="skewRadio" row="${trow}"> </div>
        <div>Flip<input type="checkbox" class="flipRadio" row="${trow}"> </div>
    </div>
    <div class ="stripeFps">
        <p> Sample Fps: </p>
        <span>each <input type="number" class="fpsSelect" row="${trow}" min="1"  step="1" value="1"/> frame</span>

    </div>
     <div class ="sampleSize">
       <p> Sample Size: </p>
        <span>w <input class="samplew" row="${trow}" type="number" min="1"  step="1" value="${defaultSampleSize[0]}"/>px </span>
            <span>h<input class="sampleh" row="${trow}" type="number" min="1"  step="1" value="${defaultSampleSize[1]}"/>px </span>
    </div>
    
         <div class ="sampleScale">
       <p> Sample Scale: </p>
        <span>Scale <input class="sampleSc" row="${trow}" type="number" min="0.1" max="2"  step="0.1" value="1"/> </span>
         
    </div>
    
</div>
    `
    let tcross = document.createElement("div");
    tcross.setAttribute("row", trow)
    tcross.innerHTML = `<img row="${trow}" class="delRowImg" src="assets/images/pictos/cross.png"/>`
    row.appendChild(tcross)
    row.appendChild(options)
    row.appendChild(tcan)
    container.appendChild(row)
    slitEvents(row)
    if (n === undefined) {
        stripes[nStripe] = {}
        ++nStripe
    }


    tcan.onclick = async e => {

        let rect = tcan.getBoundingClientRect()
        console.log(rect.width, "canSize");
        console.log(e.offsetX, "offsetX");
        const ratio = e.offsetX / rect.width
        console.log(ratio, "ratio");
        updateVid(ratio)
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
            const n = +el.getAttribute("row")
            selectedStripe = n
            if (!slitEdit) {
                slitEdit = true
                el.classList.add("slitEdit");
                prepSvg("rect", n)
            } else {
                el.classList.remove("slitEdit");
                slitEdit = false
                resetSvg()
            }


        } else if (el.matches(".lineSlit")) {
            const n = +el.getAttribute("row")
            selectedStripe = n
            if (!slitEdit) {
                slitEdit = true
                el.classList.add("slitEdit");
                prepSvg("line", n)
            } else {
                el.classList.remove("slitEdit");
                slitEdit = false
                resetSvg()
            }

        } else if (el.matches(".fovRadio")) {
            const n = +el.getAttribute("row")
            stripes[n].fov = el.checked
            selectedStripe = n
            makeSlit(stripes[n])
        } else if (el.matches(".samplew")) {
            const n = +el.getAttribute("row")
            if (stripes[n].size) {
                stripes[n].size[0] = +el.value
            } else {
                stripes[n].size = [+el.value, defaultSampleSize[1]]
            }
            selectedStripe = n
            makeSlit(stripes[n])
        } else if (el.matches(".sampleh")) {
            console.log("here");
            const n = +el.getAttribute("row")

            if (stripes[n].size) {
                stripes[n].size[1] = +el.value
            } else {
                stripes[n].size = [defaultSampleSize[0], +el.value]
            }
            selectedStripe = n
            makeSlit(stripes[n])
        } else if (el.matches(".fpsSelect")) {
            const n = +el.getAttribute("row")
            stripes[n].fps = +el.value
            selectedStripe = n
            makeSlit(stripes[n])
        } else if (el.matches(".sampleSc")) {
            const n = +el.getAttribute("row")
            stripes[n].scale = +el.value
            selectedStripe = n
            // makeSlit(stripes[n])
        } else if (el.matches(".skewRadio")) {
            const n = +el.getAttribute("row")
            stripes[n].skew = el.checked
            selectedStripe = n
        } else if (el.matches(".flipRadio")) {
            const n = +el.getAttribute("row")
            stripes[n].flip = el.checked
            selectedStripe = n
            makeSlit(stripes[n])
        } else if (el.matches(".delRowImg")) {
            const n = +el.getAttribute("row")
            row.remove()
            delete stripes[n]
        }
    }
}

function makeSlit(strip) {
    const type = strip.type
    if (type === "rect") {
        slitRect(gframes, strip.rect, selectedStripe)
    } else if (type === "line") {

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


function brushed(e) {
    // console.log(e.selection);
    const select = e.selection

    let rect = {
        x: select[0][0] / vidSize.width,
        y: select[0][1] / vidSize.height,
        width: (select[1][0] - select[0][0]) / vidSize.width,
        height: (select[1][1] - select[0][1]) / vidSize.height
    }

    stripes[selectedStripe].rect = rect
    slitRect(gframes, rect, selectedStripe)
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
            tcon.drawImage(can, -60, currH, mW - 60, tth)
            tcon.resetTransform()
        } else if (stripes[key].flip) {
            tcon.drawImage(can, 30, currH, mW + 60, tth)
        } else {
            tcon.drawImage(can, 30, currH, mW + 60, tth)
        }

        currH += tth
    }


    if (intervals.length > 0) {
        ref = stripeTransform(ref, intervals)
    }

    // document.getElementById("debugger").appendChild(ref)

    return ref

}


function loadPreset() {
    stripes = {}

    document.getElementById("stripeList").innerHTML = ''


    for (const [key, value] of Object.entries(presetStripes)) {
        stripes[key] = value
        selectedStripe = key
        makeClientStripe(key)
        makeSlit(value)
    }

    /*    for (let i = 0; i < keys.length; i++) {

            selectedStripe = keys[i]
            console.log(keys[i]);
            makeClientStripe(keys[i])
            makeSlit(stripes[keys[i]])
        }*/
    const keys = Object.keys(stripes)
    nStripe = keys.length
    // mak
}

function resetInterval() {
    intervals = []
    delBrush()
}