docReady(setup)

let vidUrl = ""
let gframes = []

let dev = true

async function setup() {

    iniStripe()
    initDraw()
    if (dev) {
        const tcan = document.getElementById("main")
        const tcon = tcan.getContext("2d")
        tcon.font = "bold 48px serif";
        tcon.fillText("Loading Images...", 260,200)
        gframes = await getThem(471)
        // singleSlit(gframes)
        slitSquare(gframes)
    }
    document.getElementById("videoInput").onchange = async e => {


        // /* perhaps old stuff
        // console.log("dqsdsqdqs");
        vidUrl = URL.createObjectURL(e.target.files[0])
        console.time("encoding")
        let frames = await mediaFramesTest(e.target.files[0])

        /*      let tcont =  document.getElementById("tempDisplay")

              for (let i = 0; i < t.length; i++) {
                  tcont.appendChild(t[i])
              }*/
        console.timeEnd("encoding")

        /*      const vid = document.createElement("video");
              vid.src = vidUrl;
              const r = await extractFramesFromVideo(vid).then(r => r)
              // gframes = r
              singleSlit(gframes)*/
        gframes = frames
        singleSlit(gframes)
        ;


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