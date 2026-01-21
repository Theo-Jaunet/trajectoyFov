docReady(setup)

let vidUrl = ""
let gframes = []
let dev = false
let vidSize = {width: 800, height: 600};
let keymap = {}

async function setup() {

    // iniStripe()
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

    makeClientStripe()
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