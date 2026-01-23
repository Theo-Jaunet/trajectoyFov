let nStripe = 0
let selectedStripe = null

const stripes = {}
let slitEdit = false

function makeClientStripe() {

    let container = document.getElementById('stripeList');

    let row = document.createElement("div")
    let options = document.createElement("div");
    let tcan = document.createElement("canvas");

    row.setAttribute("class", "stripeRow")
    options.setAttribute("class", "slitInfo")
    tcan.setAttribute("class", "stripeCan")
    tcan.setAttribute("row", nStripe)

    options.innerHTML = `
    <div class ="stripeTypes">
        <p>Sample Type:</p>
        <img class="rectSlit" row="${nStripe}" src="assets/images/pictos/rect.png"/>
        <img class="lineSlit" row="${nStripe}" src="assets/images/pictos/poly.png"/>
        <div>Fov<input type="checkbox" class="fovRadio" row="${nStripe}"> </div>
    </div>
    <div class ="stripeFps">
        <p >Sample Fps: </p>
        <span>1 frame every <input type="number" min="1" max="10" step="1" value="1"/>second </span>
        
    </div>
    <button class="stripeRun wrongButton">Run</button>
    `
    row.appendChild(options)
    row.appendChild(tcan)
    container.appendChild(row)
    slitEvents(row)
    stripes[nStripe] = {}
    ++nStripe

    tcan.onclick = async e => {

        let rect = tcan.getBoundingClientRect()
        console.log(rect.width,"canSize");
        console.log(e.offsetX,"offsetX");
        const ratio = e.offsetX / rect.width
        console.log(ratio,"ratio");
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
            makeSlit(stripes[n])
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

        slitLine(gframes,...stripes[selectedStripe].points,selectedStripe)
    }
}


function dragstarted() {
    d3.select(this).attr("stroke", "black");
}

function dragged(event) {
    const elem = d3.select(this)
    elem.raise().attr("cx", event.x).attr("cy",  event.y);

    let id = +elem.attr("id").slice(- 1) -1

    stripes[selectedStripe].points[id] = {x: event.x/vidSize.width, y: event.y/vidSize.height};

    d3.select("#slitLine")
        .attr("x1", vidSize.width * stripes[selectedStripe].points[0].x)
        .attr("y1", vidSize.height * stripes[selectedStripe].points[0].y)
        .attr("x2", vidSize.width * stripes[selectedStripe].points[1].x)
        .attr("y2", vidSize.height * stripes[selectedStripe].points[1].y)

}

function dragended() {
    d3.select(this).attr("stroke", null);


    slitLine(gframes,...stripes[selectedStripe].points,selectedStripe)
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