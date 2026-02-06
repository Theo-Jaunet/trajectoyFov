let initSvg = true
let loadingBar
let totalFramesThreshold = 150

async function mediaFramesTest(file) {
    const input = new Mediabunny.Input({
        formats: Mediabunny.ALL_FORMATS,
        source: new Mediabunny.BlobSource(file),
    });
    let frames = []
    const duration = await input.computeDuration()
    let can = document.createElement("canvas");
    let ctx = can.getContext("2d");

    const videoTrack = await input.getPrimaryVideoTrack();
    if (videoTrack) {
        const decodable = await videoTrack.canDecode();
        if (decodable) {
            initSvg = true
            const stats = await videoTrack.computePacketStats(100);
            const frameRate = Math.round(stats.averagePacketRate);
            console.log(frameRate);
            const sink = new Mediabunny.VideoSampleSink(videoTrack);

            can.width = videoTrack.displayWidth
            can.height = videoTrack.displayHeight;

            let count = 0


            const svg = d3.select("#videoOverlay")
            let fps = 0.2
            let timestamps = [...Array(parseInt(duration)).keys()]
            if (duration > totalFramesThreshold) {

                fps = Math.floor(duration / totalFramesThreshold)
                timestamps = intervaler(timestamps.map((d, i) => i), fps)
            } else {
                let target = totalFramesThreshold
                let estimatedFrames = frameRate * duration
                fps = (target * frameRate) / estimatedFrames
                let step = 1 / fps
                let cumul = 0
                timestamps = []
                for (let i = 0; i < target; i++) {
                    timestamps.push(cumul)
                    cumul += step
                }
            }
            console.log(timestamps);

            /*else if (duration < totalFramesThreshold) {
                let tfps = Math.floor( totalFramesThreshold/duration)
                timestamps = []
                const step = 1 / tfps
                let total = 0
                for (let i = 0; i < duration * tfps; i++) {
                    timestamps.push(total)
                    total += step
                }
                console.log( timestamps);
            }*/

            // let allFrames = intervaler(timestamps.map((d, i) => i), fps)

            for await (const sample of sink.samplesAtTimestamps(timestamps)) {
                sample.draw(ctx, 0, 0);

                frames.push(cloneCanvas(can));

                sample.close()
                loadingSvg(svg, {width: vidSize.width, height: vidSize.height}, ++count, timestamps.length)

            }
            clearLoading()
        }
    }
    return frames
}


function loadingSvg(svg, rect, n, total) {

    //todo: use Frames SIze to set svg size


    const barH = 10
    const barW = rect.width * 0.7
    const x = (rect.width - barW) / 2;
    const y = (rect.height - barH / 2) / 2;

    if (initSvg) {

        initSvg = false


        let bg = svg.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", rect.width)
            .attr("height", rect.height)
            .style("fill", "rgba(163,159,159,0.68)")

        let t = svg.append("text")
            .attr("x", x)
            .attr("y", y - barH * 2)
            .text("Extracting frames...")


        let trect = svg.append("rect")
            .attr("x", x)
            .attr("y", y)
            .attr("width", barW)
            .attr("height", barH)
            .style("fill", "#555")

        loadingBar = svg.append("rect")
            .attr("x", x + 1)
            .attr("y", y + 1)
            .attr("width", (barW - 2) * (n / total))
            .attr("height", barH - 2)
            .style("fill", "#538ed1")
    }

    loadingBar.attr("width", (barW - 2) * (n / total))


}

function clearLoading() {
    const svg = d3.select("#videoOverlay")

    svg.selectAll("*").remove()

    document.getElementById("mainVideo").controls = true
    initSvg = true
    svg.style("display", "none")
}