let stroke = []
let strokePoint;
let currStroke = []
let mouseDown = 0
let dataset = []

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

function onMouseDown(e) {
    let xy = getMousePos(e);

    strokePoint = [xy.x, xy.y];
    mouseDown = 1;


    stroke = [[...strokePoint]]
    let can = document.getElementById("main")
    let cont = can.getContext('2d');
    cont.clearRect(0, 0, can.width, can.height);

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

        rectMatch(stroke, 40, "stretch")
    }

    currStroke = []

}


function draw(cont,stroke) {

    // cont.lineCap = 'round';
    // cont.lineJoin = 'round';
    cont.clearRect(0,0,9999,9999)
    cont.beginPath();

    cont.lineWidth = 1
    for (let i = 1; i < stroke.length; i++) {


        cont.moveTo(stroke[i-1][0],stroke[i-1][1]);
        cont.lineTo(stroke[i][0],stroke[i][1]);

    }
    cont.stroke()
    cont.closePath();
}
