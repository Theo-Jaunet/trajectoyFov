docReady(setup)

let vidUrl = ""
let gframes = []
let dev = false
let vidSize = {width: 800, height: 600};
let keymap = {}
let cv


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
    initDraw()
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

    document.getElementById("mainVideo").addEventListener("loadedmetadata", function (e) {

        let svg = document.getElementById("videoOverlay")

        let coords = vid.getBoundingClientRect()
        console.log(coords);
        vid.controls = false

        svg.style.width = coords.width + "px";
        svg.style.height = coords.height + "px";

        vidSize = {width: coords.width, height: coords.height};

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
        let can = d3.select(`.stripeCan[row='${selectedStripe}'`).node()

        makeMapping(stroke.map(d => {
            return {x: d[0], y: d[1]}
        }), can)

    }

    document.getElementById("trajectoryFile").onchange = async e => {

        dataDispatcher(e.target.files[0], e)
    }


    // makeClientStripe()
    loadPreset()
    document.getElementById("moreStripe").onclick = async e => {
        makeClientStripe()
    }
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
        console.log(coords);
        vid.controls = false

        svg.style.width = coords.width + "px";
        svg.style.height = coords.height + "px";
        vidSize = {width: coords.width, height: coords.height};

    } catch (error) {
        console.error(error.message);
    }
}


function testSack() {

    let can = document.getElementById("testStack")
    let ctx = can.getContext("2d");

    let refW = gframes[0].width
    let refH = gframes[0].height


    can.width = refW
    can.height = refH
    let hstep = 2
    let vstep = 1

    for (let i = 0; i < gframes.length; i++) {

        if (refH > vstep * i * 2 || refW > hstep * i * 2) {
            ctx.drawImage(gframes[i],
                50,
                50,
                refW - 110,
                refH - 120,
                i * hstep,
                vstep * i,
                Math.max(refW - (hstep * i * 2), 3),
                Math.max(refH - (i * 2 * vstep), 3))
        } else {
            console.log(i);
        }
    }

    // ctx.drawImage(gframes[20], i, i,refW-i*2,refH-i)

}
