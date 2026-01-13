async function getThem(n) {

    let frames = []

    const tcan = document.getElementById("main")
    const tcon = tcan.getContext("2d")
    tcon.font = " 24px serif";



    for (let i = 1; i < n; i++) {
        let name = `thumb${String(i).padStart(4, '0')}.png`
        // frames.push(fetchImage(`assets/tempSamples/${name}`))
        tcon.fillStyle = "white"
        tcon.fillRect(420,220,200,400)
        tcon.fillStyle = "black"
        tcon.fillText(`${i} / ${n}`, 420,300)
        // frames.push(loadImg(`assets/tempSamples/${name}`))
        const im = await addImageProcess(`assets/tempSamples/${name}`)

        let can = document.createElement('canvas');
        let cont = can.getContext('2d');
        can.width = im.naturalWidth
        can.height = im.naturalHeight
        cont.drawImage(im, 0, 0)
        frames.push(can)
    }

    return frames
}


function loadImg(src) {

    let im = new Image();

    let can = document.createElement('canvas');
    im.onload = function () {


        let cont = can.getContext('2d');


        can.width = im.naturalWidth
        can.height = im.naturalHeight

        cont.drawImage(im, 0, 0)


    };

    im.src = src
    return can;
}


function addImageProcess(src) {
    return new Promise((resolve, reject) => {
        let img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}
