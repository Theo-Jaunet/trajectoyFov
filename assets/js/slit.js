function singleSlit(frames) {

    let can = document.getElementById("stripe")
    const ctx = can.getContext("2d")

    let sampleSize = 40
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


function slitSquare(frames) {

    let can = document.getElementById("stripe")
    const ctx = can.getContext("2d")

    let x = Math.floor(frames[0].width * 0.33)
    let w = 20
    let h = 50
    let y = frames[0].height - h


    let sampleWidth = 40
    let sampleHeight = 150

    const canMaxW = 6000
    if (frames.length * sampleWidth > canMaxW) {
        sampleWidth = Math.floor(canMaxW / frames.length)
    }

    can.width = frames.length * sampleWidth


    let tcan = document.createElement("canvas")

    let tcont = tcan.getContext("2d")
    // inverted for referencial shenanigans
    tcan.width = sampleHeight
    tcan.height = sampleWidth

    tcont.translate(tcan.width / 2, tcan.height / 2);
    tcont.rotate(90 * Math.PI / 180);

    // const cont = document.getElementById("tempDisplay")

    for (let i = 0; i < frames.length; i++) {


        // ctx.drawImage(frames[i], x, y, w, h, sampleSize * i, 0, sampleSize, can.height) --> save sq without FOV
        tcont.drawImage(frames[i], x, y, w, h, -sampleWidth/2, -sampleHeight/2, sampleWidth, sampleHeight)

        ctx.drawImage(tcan, sampleWidth * i, 0, sampleWidth, sampleHeight)

    }

}