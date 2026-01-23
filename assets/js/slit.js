function singleSlit(frames) {

    let can = document.getElementById("stripe")
    const ctx = can.getContext("2d")

    let sampleSize = 2
    const canMaxW = 7000
    if (frames.length * sampleSize > canMaxW) {
        sampleSize = Math.floor(canMaxW / frames.length)
    }

    can.width = frames.length * sampleSize


    // console.log(w);
    let imw = frames[0].width
    let imh = frames[0].height
    // const cont = document.getElementById("tempDisplay")

    for (let i = 0; i < frames.length; i++) {


        ctx.drawImage(frames[i], imw / 2 - (sampleSize / 2), 0, imw / 2 + (sampleSize / 2), imh, sampleSize * i, 0, sampleSize, can.height)
        // ctx.drawImage(frames[i], 0, 0, w, can.height)
    }

}


function slitLine(frames, pt1, pt2, n) {
    let imw = frames[0].width
    let imh = frames[0].height

    let main = d3.select(`.stripeCan[row='${n}'`).node()
    let mainCtx = main.getContext("2d")


    for (let i = 0; i < frames.length; i++) {

        let pixels = getPixelsOnLine(frames[i].getContext("2d"), pt1.x * imw, pt1.y * imh, pt2.x * imw, pt2.y * imh)

        pixels = pixels.slice(0, pixels.length - 2)

        let can = document.createElement("canvas");
        let ctx = can.getContext("2d");

        can.width = 1;
        can.height = pixels.length;

        let t = pixels.reduce(concat)
        t = Uint8ClampedArray.from(t)

        let tt = new ImageData(t, can.width, can.height);
        ctx.putImageData(tt, 0, 0, 0, 0, can.width, can.height);
        if (stripes[selectedStripe].fov) {
            can = flipForFoV(can)
        }
        mainCtx.drawImage(can, i, 0, 1, main.height);

    }
}

function slitRect(frames, rect, n) {


    let can = d3.select(`.stripeCan[row='${n}'`).node()

    const ctx = can.getContext("2d")
    // ctx.imageSmoothingEnabled= false
    ctx.filter = "blur(3px)";
    let x = Math.floor(frames[0].width * rect.x)
    let w = Math.floor(frames[0].width * rect.width)
    let h = Math.floor(frames[0].height * rect.height)
    let y = Math.floor(frames[0].height * rect.y)


    // console.log(x,y,w,h)

    let sampleWidth = 10
    let sampleHeight = 150

    const canMaxW = 6000
    if (frames.length * sampleWidth > canMaxW) {
        sampleWidth = Math.floor(canMaxW / frames.length)
    }

    can.width = frames.length * sampleWidth
    let trect = can.getBoundingClientRect()

    if (can.width < trect.width) {
        can.style.width = can.width + 'px'
    }
    can.height = sampleHeight

    let tcan = document.createElement("canvas")
    let tcont = tcan.getContext("2d")

    tcan.width = w
    tcan.height = h

    for (let i = 0; i < frames.length; i++) {

        tcont.drawImage(frames[i], x, y, w, h, 0, 0, w, h)

        if (stripes[selectedStripe].fov) {
            let temp = flipForFoV(tcan)
            ctx.drawImage(temp, sampleWidth * i, 0, sampleWidth, can.height)
        } else {
            ctx.drawImage(tcan, sampleWidth * i, 0, sampleWidth, can.height)
        }
    }

    if (stroke.length > 0) {
        makeMapping(stroke.map(d => {
            return {x: d[0], y: d[1]}
        }), can)
    }
}


//Use of  Brensenham line Algo
function getPixelsOnLine(ctx, startX, startY, endX, endY) {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const pixelCols = [];

    const getPixel = (x, y) => {
        if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
            return "rgba(0,0,0,0)";
        }
        let ind = (x + y * imageData.width) * 4;
        return [data[ind++], data[ind++], data[ind++], data[ind++]];
    }

    let x = Math.floor(startX);
    let y = Math.floor(startY);
    const xx = Math.floor(endX);
    const yy = Math.floor(endY);
    const dx = Math.abs(xx - x);
    const sx = x < xx ? 1 : -1;
    const dy = -Math.abs(yy - y);
    const sy = y < yy ? 1 : -1;
    let err = dx + dy;
    let e2;
    let end = false;
    while (!end) {
        pixelCols.push(getPixel(x, y));
        if ((x === xx && y === yy)) {
            end = true;
        } else {
            e2 = 2 * err;
            if (e2 >= dy) {
                err += dy;
                x += sx;
            }
            if (e2 <= dx) {
                err += dx;
                y += sy;
            }
        }
    }
    return pixelCols;
}


function flipForFoV(can) {
    let tcan = document.createElement("canvas")
    let tcont = tcan.getContext("2d")

    // let container = document.getElementById("debugger")

    // inverted for referencial shenanigans
    let w = can.height
    // let h = can.width
    let h = 20
    tcan.width = w
    tcan.height = h

    tcont.translate(w / 2, h / 2);
    tcont.rotate(90 * Math.PI / 180);

    // tcont.drawImage(can, 0, 0, can.width, can.height, -h / 2, -w / 2, h,w)
    tcont.drawImage(can, 0, 0, can.width, can.height, -h / 2, -w / 2, h,w)

    // container.append(tcan)

    return tcan;
}