

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
            const sink = new Mediabunny.VideoSampleSink(videoTrack);
            can.width=videoTrack.displayWidth
            can.height=videoTrack.displayHeight;

            // Loop over all frames in the first 30s of video
            let count =0
            for await (const sample of sink.samplesAtTimestamps([...Array(parseInt(duration)).keys()])) {
                sample.draw(ctx, 0, 0);

                frames.push(cloneCanvas(can));

                sample.close()
                console.log("sample: ",++count,"out of ",duration)
            }
        }
    }
return frames
}