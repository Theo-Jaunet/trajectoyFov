docReady(setup)

let vidUrl = ""
let gframes = []
let dev = false
let vidSize = {width: 800, height: 600};
let keymap = {}
let cv

let bgImg

let bgTransform = {x: 0, y: 0, scale: 1}

let mapCan
/*let presetStripes= {
    0: {
        type: "rect",
        rect: {x: 0, y: 0,width: 0.8, height: 0.8},
    },
    1: {
        type: "rect",
        rect: {x: 0, y: 0,width: 0.8, height: 0.8},
        fov:true,
        skew:true,
    },
    2: {
        type: "rect",
        rect: {x: 0, y: 0,width: 0.8, height: 0.8},
        flip:true
    }
}*/

let presetStripes = {
    0: {
        type: "rect",
        rect: {
            x: 0.22613713406253977,
            y: 0.09173485117172527,
            width: 0.020366598778004074,
            height: 0.6857555882197442
        }
    },
    "1": {
        "type": "rect",
        "rect": {
            "x": 0.18540393650653164,
            "y": 0.7522257603327268,
            "width": 0.6741344040134531,
            "height": 0.014436959462138669
        },
        "fov": true,
        "skew": false
    },
    "2": {
        "type": "rect",
        "rect": {
            "x": 0.831025102230779,
            "y": 0.04842398655346671,
            "width": 0.002036659877800407,
            "height": 0.7687682015041437
        },
        "flip": true
    }
}

async function setup() {

    // iniStripe()

    await getVidFromUrl("assets/baseVid/trail.mp4")
    iniCan()
    const vid = document.getElementById("mainVideo")
    if (dev) {
        const tcan = document.getElementById("main")
        const tcon = tcan.getContext("2d")
        tcon.font = "bold 48px serif";
        tcon.fillText("Loading Images...", 260, 200)
        gframes = await getThem(471)
        vidSize = {width: gframes[0].width, height: gframes[0].height}

        let svg = document.getElementById("videoOverlay")
        const vid = document.getElementById("mainVideo")
        vid.width = vidSize.width
        vid.height = vidSize.height

        vid.controls = false

        svg.style.width = vidSize.width + "px";
        svg.style.height = vidSize.height + "px";
        // singleSlit(gframes)
        // slitSquare(gframes)
    }

    vid.addEventListener("timeupdate", updateCube)


    document.getElementById("mainVideo").addEventListener("loadedmetadata", function (e) {

        let svg = document.getElementById("videoOverlay")

        let coords = vid.getBoundingClientRect()

        vid.controls = false

        svg.style.width = coords.width + "px";
        svg.style.height = coords.height + "px";

        let stackCan = document.getElementById("testStack")

        stackCan.style.width = coords.width + "px";
        stackCan.style.height = coords.height + "px";

        stackCan.width = coords.width
        stackCan.height = coords.height

        vidSize = {width: coords.width, height: coords.height};
        testCube(10)

        // let tcan = document.getElementById("tcan")
        // tcan.style.width = coords.width + "px";
        // tcan.style.height = coords.width + "px";
    }, false);

    document.getElementById("videoInput").onchange = async e => {


        vidUrl = URL.createObjectURL(e.target.files[0])
        console.log(vidUrl);
        document.getElementById("mainSource").src = vidUrl
        let svg = document.getElementById("videoOverlay")
        svg.style.display = "inline-block"
        vid.load()


        console.time("encoding")
        let frames = await mediaFramesTest(e.target.files[0])

        console.timeEnd("encoding")
        /*      const vid = document.createElement("video");
              vid.src = vidUrl;
              const r = await extractFramesFromVideo(vid).then(r => r)
              // gframes = r
              singleSlit(gframes)*/
        gframes = frames
        testCube(10)
        svg.style.display = "none"


        //Pyramid stuff
        /*        let tcan = document.getElementById("tcan")
                let ctx = tcan.getContext("2d")

                let step = tcan.width/frames.length
                for (let i = 0; i < frames.length; i++) {
                    ctx.drawImage(frames[i], i*step, i*step,  tcan.width-(i*step)*2, tcan.height-(i*step)*2)

                }*/

        // singleSlit(gframes)

        // slitEvents(container)

    }

    document.getElementById("meshHeight").oninput = async e => {

        // console.log(+e.target.value);
        meshHeight = +e.target.value
        // let can = d3.select(`.stripeCan[row='${selectedStripe}'`).node()

        makeMapping(stroke.map(d => {
            return {x: d[0], y: d[1]}
        }))


        // panzoom.pan(10, 10)
        // panzoom.zoom(2, { animate: true })


    }

    document.getElementById("trajectoryFile").onchange = async e => {

        dataDispatcher(e.target.files[0], e)
    }

    document.getElementById("mainBg").onchange = async e => {

        loadBG(e.target.files[0], e)
    }


    document.getElementById("waypointFile").onchange = async e => {

        loadWaypointImage(e.target.files[0], e)
    }


    // makeClientStripe()
    loadPreset()
    document.getElementById("moreStripe").onclick = async e => {
        makeClientStripe()
    }

    document.getElementById("moreLabel").onclick = async e => {
        makeNewLabel()
    }
}


function loadBG(file, e) {
    const reader = new FileReader();

    reader.onload = async function (e) {

        // bgImg = loadImg(e.target.result)
        bgImg = await addImageProcess(e.target.result)
        drawBg()

    }
    reader.readAsDataURL(file);
}


function drawBg() {
    let tcan = document.getElementById("main")
    let tcon = tcan.getContext("2d")

    let t = Math.round((bgImg.naturalHeight * tcan.getBoundingClientRect().width) / bgImg.naturalWidth)
    let viewDim = [tcan.getBoundingClientRect().width, t]

    tcon.drawImage(bgImg, 0, 0, viewDim[0], viewDim[1])
}

function testpreload() {


    var video = document.createElement("video");


    var xhr = new XMLHttpRequest();
    xhr.open("GET", vidUrl, true);
    xhr.responseType = "arraybuffer";

    xhr.onload = function (oEvent) {

        var blob = new Blob([oEvent.target.response], {type: "video/yourvideosmimmetype"});

        video.src = URL.createObjectURL(blob);

        //video.play()  if you want it to play on load
    };

    xhr.onprogress = function (oEvent) {

        if (oEvent.lengthComputable) {
            var percentComplete = oEvent.loaded / oEvent.total;
            // do something with this
        }
    }
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            return video
        }
    }

    xhr.send();

    return video
}


onkeyup = function (e) {
    if (e.keyCode in keymap) {
        keymap[e.keyCode] = false;

    }
};


onkeydown = function (e) {
    e = e || event;
    keymap[e.keyCode] = e.type === 'keydown';

    if (keymap[27]) {
        resetSvg()
    }

}

function onOpenCvReady(e) {
    cv = window.cv
    console.log("OpenCV loaded");
    // tracker = createCameraPathTracker();
}

async function getVidFromUrl(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const result = await response;

        let t = await result.blob()

        vidUrl = URL.createObjectURL(t)


        let frames = await mediaFramesTest(t)
        gframes = frames;


        const vid = document.getElementById("mainVideo")
        document.getElementById("mainSource").src = vidUrl
        await vid.load()

        let svg = document.getElementById("videoOverlay")

        let coords = vid.getBoundingClientRect()
        vid.controls = false

        svg.style.width = coords.width + "px";
        svg.style.height = coords.height + "px";
        vidSize = {width: coords.width, height: coords.height};

    } catch (error) {
        console.error(error.message);
    }
}


function testSack(n = 0) {

    let ratio = gframes[0].width / gframes[0].height
    let maxW = 500
    let maxH = maxW / ratio

    let minW = 10
    let minH = minW / ratio

    let can = document.getElementById("testStack")
    let ctx = can.getContext("2d");

    let refW = Math.min(gframes[0].width, maxW)
    let refH = Math.min(gframes[0].height, maxH)


    can.width = refW
    can.height = refH
    let hstep = 2
    let vstep = 1

    let nFrames = (refW / hstep) / 2

    if (nFrames + n > gframes.length) {
        nFrames = gframes.length - 1 - n
    }
    // console.log("for ",n, "we have ", nFrames);

    for (let i = 0; i < nFrames; i++) {
        let idx = n + i
        ctx.drawImage(gframes[idx],
            0,
            0,
            gframes[idx].width,
            gframes[idx].height - 50, //to skip overlay on bike
            i * hstep,
            vstep * i,
            Math.max(refW - (hstep * i * 2), minW),
            Math.max(refH - (vstep * i * 2), minH))

        // if (refH > vstep * i * 2 || refW > hstep * i * 2) {
        /*            ctx.drawImage(gframes[i],
                        50,
                        50,
                        refW - 110,
                        refH - 120,
                        i * hstep,
                        vstep * i,
                        Math.max(refW - (hstep * i * 2), 3),
                        Math.max(refH - (i * 2 * vstep), 3))*/
        // } else {
        //     console.log(i);
        // }
    }

    // ctx.drawImage(gframes[20], i, i,refW-i*2,refH-i)

}


function testCube(n) {
    let ratio = gframes[0].width / gframes[0].height
    let maxW = 500
    let maxH = maxW / ratio

    let can = document.getElementById("testStack")
    let ctx = can.getContext("2d");

    let refW = Math.min(gframes[0].width, maxW / 2)
    let refH = Math.min(gframes[0].height, maxH / 2)


    can.width = maxW
    can.height = maxH

    let hstep = (maxW - refW) / gframes.length
    let vstep = (maxH - refH) / gframes.length

    ctx.globalAlpha = 0.9;
    for (let i = gframes.length - 1; i > 0; i--) {
        if (i < n)
            ctx.globalAlpha = 0;
        ctx.drawImage(gframes[i],
            0,
            0,
            gframes[i].width,
            gframes[i].height - 50, //to skip overlay on bike
            i * hstep,
            maxH - (vstep * i) - refH,
            refW,
            refH)
    }
    ctx.globalAlpha = 1;
    ctx.beginPath()
    ctx.moveTo(hstep, maxH - (vstep * 0) - refH)
    ctx.lineTo(hstep + refW, maxH - (vstep * gframes.length) - refH)
    ctx.lineTo((gframes.length * hstep) + refW - hstep, maxH - (vstep * gframes.length) - refH)
    ctx.lineTo(hstep + refW, maxH - (vstep * 0) - refH)
    ctx.lineTo(hstep, maxH - (vstep * 0) - refH)
    ctx.stroke()
    ctx.closePath()

    ctx.beginPath()
    ctx.moveTo(hstep + refW, maxH - (vstep * 0) - refH)
    ctx.lineTo(hstep + refW, maxH)
    ctx.lineTo((gframes.length * hstep) + refW - hstep, maxH - (vstep * gframes.length))
    ctx.lineTo((gframes.length * hstep) + refW - hstep, maxH - (vstep * gframes.length) - refH)

    ctx.stroke()
    ctx.closePath()

    ctx.beginPath()
    ctx.moveTo(hstep, maxH - (vstep * 0) - refH)
    ctx.lineTo(hstep, maxH - vstep)
    ctx.lineTo(hstep + refW, maxH - vstep)


    ctx.stroke()
    ctx.closePath()


}

function updateCube(e) {
    let elem = e.target || e.srcElement

    let ratio = elem.currentTime / elem.duration

    testCube(Math.min(Math.floor(ratio * gframes.length), gframes.length - 1))
}


async function testPyramidAnim() {
    for (let i = 0; i < gframes.length - 1; i++) {
        testSack(i);
        await new Promise(r => setTimeout(r, 15));

    }

}

function fakeVideo() {
    document.getElementById("videoInput").click()
}

function fakeGpx() {
    document.getElementById("trajectoryFile").click()
}

function fakeBg() {
    document.getElementById("mainBg").click()
}