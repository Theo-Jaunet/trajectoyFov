function docReady(fn) {
    // see if DOM is already available
    if (document.readyState === "complete" || document.readyState === "interactive") {
        // call on next available tick
        setTimeout(fn, 1);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}


function getMousePos(e) {
    let o = {};

    if (e.offsetX) {
        o.x = e.offsetX
        o.y = e.offsetY
    } else if (e.layerX) {
        o.x = e.layerX
        o.y = e.layerY
    }
    return o;
}


function get_orr(p1, p2) {
    return (Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI;
}

function euclidian_dist(a, b) {
    let sum = 0;

    for (let n = 0; n < a.length; n++) {
        sum += Math.pow(a[n] - b[n], 2)
    }
    return Math.sqrt(sum)
}

function getTrajFullOrr(pts) {

    const res = []
    res.push(get_orr(pts[0], pts[1]));
    for (let i = 1; i < pts.length; i++) {

        res.push(get_orr(pts[i - 1], pts[i]));
    }

    return res;
}

function getTrajFullDist(pts) {
    const res = []

    for (let i = 0; i < pts.length - 1; i++) {

        res.push(euclidian_dist(pts[i], pts[i + 1]));
    }
    res.push(euclidian_dist(pts[pts.length - 2], pts[pts.length - 1]));

    return res;
}

function cloneCanvas(oldCanvas) {

    //create a new canvas
    let newCanvas = document.createElement('canvas');
    let context = newCanvas.getContext('2d');

    //set dimensions
    newCanvas.width = oldCanvas.width;
    newCanvas.height = oldCanvas.height;

    //apply the old canvas to the new one
    context.drawImage(oldCanvas, 0, 0);

    //return the new canvas
    return newCanvas;
}


function intervaler(array, inter) {
    return array.filter((d, i) => !(i % inter))
}

const concat = (xs, ys) => xs.concat(ys);


function resizeCan(can, ratio) {
    let tcan = document.createElement("canvas");
    let tcont = tcan.getContext("2d")

    tcan.width = can.width * ratio;
    tcan.height = can.height * ratio;

    tcont.drawImage(can, 0, 0, tcan.width, tcan.height);

    return tcan
}