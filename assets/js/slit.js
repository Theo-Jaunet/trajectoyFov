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

    if (stripes[selectedStripe].fov) {
        let tcan = document.createElement("canvas")

        let tcont = tcan.getContext("2d")
        // inverted for referencial shenanigans
        tcan.width = sampleHeight
        tcan.height = sampleWidth

        tcont.translate(tcan.width / 2, tcan.height / 2);
        tcont.rotate(90 * Math.PI / 180);

        // const cont = document.getElementById("tempDisplay")

        for (let i = 0; i < frames.length; i++) {
            tcont.drawImage(frames[i], x, y, w, h, -sampleWidth / 2, -sampleHeight / 2, sampleWidth, sampleHeight)
            ctx.drawImage(tcan, sampleWidth * i, 0, sampleWidth, sampleHeight)

        }
    } else {
        for (let i = 0; i < frames.length; i++) {
            ctx.drawImage(frames[i], x, y, w, h, sampleWidth * i, 0, sampleWidth, can.height)
        }
    }

    if (stroke.length > 0) {
        makeMapping(stroke.map(d => {
            return {x: d[0], y: d[1]}
        }), can)
    }
}