function singleSlit(frames) {

    let can = document.getElementById("stripe")

    const ctx = can.getContext("2d")

    let w = can.width / frames.length
    // console.log(w);
    let imw = frames[0].width
    let imh = frames[0].height
    // const cont = document.getElementById("tempDisplay")

    for (let i = 0; i < frames.length; i++) {


        ctx.drawImage(frames[i], 0, imh / 2, imw, 5, w * i, 0, w, can.height)
        // ctx.drawImage(frames[i], 0, 0, w, can.height)
    }

}
