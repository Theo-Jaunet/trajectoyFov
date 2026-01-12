let ttt ="aaaa"
docReady(setup)

let vidUrl = ""
let gframes = []

function setup() {

    iniStripe()
    initDraw()

    document.getElementById("videoInput").onchange = async e => {



        // /* perhaps old stuff
        // console.log("dqsdsqdqs");
        vidUrl = URL.createObjectURL(e.target.files[0])
        const vid = document.createElement("video");
        vid.src = vidUrl;
        const r = await extractFramesFromVideo(vid).then(r => r)
        gframes = r
        singleSlit(gframes)

        ;
        //buffer webcodecStuff -> I haven't given up yet
        // const buffer = await e.target.files[0].arrayBuffer();
        // buffer.fileStart = 0;
        // extractFrames(buffer)




         // */
       // let vid =  testpreload()




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