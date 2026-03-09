let stroke = []
let strokePoint;
let currStroke = []
let mouseDown = 0
let dataset = []
let mode = "zoom"

let mapFlag = false

let mapStroke = []

function iniCan() {
    let can = document.getElementById("main")
    let rect = can.getBoundingClientRect();

    // container.style.height = rect.height + "px";
    can.width = rect.width;
    can.height = rect.height;
}


function initDraw() {

    // let container = document.getElementById("markCont")

    let can = document.getElementById("main")
    let rect = can.getBoundingClientRect();

    // container.style.height = rect.height + "px";
    can.width = rect.width;
    can.height = rect.height;

    can.onpointerdown = onMouseDown
    can.onpointermove = onMouseMove
    can.onpointerup = onMouseUp

}


function delDraw() {
    let can = document.getElementById("main")

    can.onpointerdown = null
    can.onpointermove = null
    can.onpointerup = null
}

function onMouseDown(e) {
    let xy = getMousePos(e);

    strokePoint = [xy.x, xy.y];
    mouseDown = 1;


    stroke = [[...strokePoint]]
    let can = document.getElementById("main")
    let cont = can.getContext('2d');
    cont.clearRect(0, 0, can.width, can.height);
    if (bgImg !== undefined) {
        drawBg()
    }

}

function onMouseMove(e) {
    if (mouseDown === 1) {
        let can = document.getElementById("main")
        let cont = can.getContext('2d');
        e.preventDefault()
        let xy = getMousePos(e);
        draw(cont, stroke);
        strokePoint = [xy.x, xy.y];
        currStroke.push([...strokePoint])


        stroke = [...currStroke]

    }
}

function onMouseUp(e) {
    mouseDown = 0
    let can = document.getElementById("main")
    let cont = can.getContext('2d');
    e.preventDefault()
    let xy = getMousePos(e);

    strokePoint = [xy.x, xy.y];
    currStroke.push([...strokePoint])
    stroke = [...currStroke]
    draw(cont, stroke);
    strokePoint = []
    /*    let tdat = {}

        if (dataset.length > 0 && dataset.length > strokes.length) {
            tdat = dataset[strokes.length];
        }

        strokes.push({
                start: currStroke[0],
                end: currStroke[currStroke.length - 1],
                points: [...currStroke],
                data: tdat
            }
        )*/
    if (stroke.length - 1 === 1) {

    } else {
        // makeUpStuff(strokes[strokes.length - 1])


        // updateMainCanvas()
        // fillStrokes()

        // rectMatch(stroke, 40, "stretch")

        // let can = d3.select(`.stripeCan[row='${selectedStripe}'`).node()

        makeMapping(stroke.map(d => {
            return {x: d[0], y: d[1]}
        }))
    }

    currStroke = []

}


function draw(cont, stroke) {

    // cont.lineCap = 'round';
    // cont.lineJoin = 'round';
    cont.clearRect(0, 0, 9999, 9999)
    if (bgImg !== undefined) {
        drawBg()
    }
    cont.beginPath();

    cont.lineWidth = 1
    for (let i = 1; i < stroke.length; i++) {


        cont.moveTo(stroke[i - 1][0], stroke[i - 1][1]);
        cont.lineTo(stroke[i][0], stroke[i][1]);

    }
    cont.stroke()
    cont.closePath();
}


function prepMapping() {
    let can = document.getElementById("main")
    let cont = can.getContext('2d');

    cont.clearRect(0, 0, 9999, 9999)
    if (bgImg !== undefined) {
        drawBg()
    }

    draw(cont, stroke)

}

function resetCan() {
    prepMapping()

    makeMapping(stroke.map(d => {
        return {x: d[0], y: d[1]}
    }))
}


function strokeToggle() {

    if (mode === "zoom") {
        mode = "stroke"
        initDraw()
        if (bgImg !== undefined) {
            drawBg()
        }
        document.getElementById("strokeBtn").classList.add("selectedBrush")


    } else {
        mode = "zoom"
        delDraw()
        document.getElementById("strokeBtn").classList.remove("selectedBrush")
    }
}


function cropToggle() {

}

function mapToggle() {
    mapFlag = !mapFlag

    if (mapFlag) {
        iniMap()
    } else {
        delMap()
    }
}

////////////////////////////////////// MAP stuff ////////////////////////////

function iniMap() {
    const canvas = document.getElementById("main");
    canvas.style.display = "none";

    let container = document.getElementById("map")
    container.style.display = "inline-block";
    container.style.width = canvas.width + "px";
    container.style.height = canvas.height + "px";
    // const map = L.map('map').setView([44.809025517564756, 5.495080290496283], 13);
    const map = L.map('map').setView([dataRecords[0].latitude, dataRecords[0].longitude], 13);

    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenTopoMap contributors'
    }).addTo(map);

    mapCan = cloneCanvas(canvas)

    mapCan.style.position = "absolute";
    mapCan.style.top = 0;
    mapCan.style.left = 0;
    mapCan.pointer_events = "none";


    map.getPanes().overlayPane.appendChild(mapCan);

    function resizeCanvas() {
        const size = map.getSize();
        mapCan.width = size.x;
        mapCan.height = size.y;
    }

    map.on("resize", resizeCanvas);
    resizeCanvas();

    function repositionCanvas() {
        const topLeft = map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(mapCan, topLeft);
    }

    map.on("move", repositionCanvas);
    repositionCanvas();


    let ctx = mapCan.getContext('2d');

    function drawTrack(coords) {
        ctx.clearRect(0, 0, mapCan.width, mapCan.height);
        mapStroke = []
        ctx.beginPath();

        coords.forEach((c, i) => {

            const p = map.latLngToContainerPoint(c);
            mapStroke.push([p.x, p.y]);
            // const p = map.latLngToLayerPoint(c);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });

        ctx.strokeStyle = "red";
        ctx.lineWidth = 3;
        ctx.stroke();
        fakeMapDraw()
    }

    map.on("move zoom", () => drawTrack(dataRecords.map(d => [d.latitude, d.longitude])));
    drawTrack(dataRecords.map(d => [d.latitude, d.longitude]))
}

function delMap() {
    let container = document.getElementById("map")
    container.innerHTML = ""
    container.style.display = "none";

    const canvas = document.getElementById("main");
    canvas.style.display = "inline-block";


}



function fakeMapDraw() {
    makeMapping(mapStroke.map(d => {
        return {x: d[0], y: d[1]}
    }))
}