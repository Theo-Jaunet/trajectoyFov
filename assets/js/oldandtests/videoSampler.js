let globalFrameCount = 0
async function extractFramesFromVideo(videoUrl, s = 1) {
    return new Promise(async (resolve) => {

        // fully download it first (no buffering):
        // let videoBlob = await fetch(videoUrl).then(r => r.blob());
        // let videoObjectUrl = videoUrl
        let video = videoUrl
        video.muted = true;
        video.setAttribute("preload", true);
        video.setAttribute("width", 200);
        video.setAttribute("height", 200);

/*        let seekResolve;
        video.addEventListener('seeked', async function () {
            if (seekResolve) seekResolve();
        });*/

        video.addEventListener('loadeddata', async function () {

            console.log("loaded");
            let canvas = document.createElement('canvas');
            let context = canvas.getContext('2d');
            let [w, h] = [video.videoWidth, video.videoHeight]
            canvas.width = w;
            canvas.height = h;

            let frames = [];
            let interval = s;
            let currentTime = 0;
            let duration = video.duration;

/*            while (currentTime < duration) {
                video.fastSeek(currentTime);
                await new Promise(r => seekResolve = r);


                context.drawImage(video, 0, 0, w, h);

                frames.push(cloneCanvas(canvas));

                currentTime += interval;
                console.log("here");
            }*/
            // resolve(frames);
            video.addEventListener("seeked", onSeeked);

            function onSeeked() {
                context.drawImage(video, 0, 0, w, h);
                frames.push(cloneCanvas(canvas));
                console.log(currentTime);
                currentTime += interval;

                if (currentTime < duration) {
                    video.currentTime = currentTime;
                } else {
                    video.removeEventListener("seeked", onSeeked);
                    resolve(frames);
                }
            }



        });

        video.currentTime = 1;
    });
}





async function extractFrames(arrayBuffer) {
    const mp4box = MP4Box.createFile();
    mp4box.appendBuffer(arrayBuffer) ;

    let trackInfo;
    let decoder;
    let paramSets
    let gavcC
    let lengthSize
    let gtrak




    mp4box.onReady = async info => {


        trackInfo = info.videoTracks[0];
        mp4box.setExtractionOptions(trackInfo.id, null, {nbSamples: Infinity});




        const trak = mp4box.moov.traks
            .find(t => t.tkhd.track_id === info.videoTracks[0].id);


        gtrak = trackInfo
        const avcC = trak.mdia.minf.stbl.stsd.entries[0].avcC;

        console.log(avcC);
        paramSets = buildAnnexBParameterSets(avcC);
        gavcC= avcC

        lengthSize = avcC.lengthSizeMinusOne + 1;
        const description = serializeAvcC(avcC);
        // const avcC = trackInfo.avcC;
        console.log(trackInfo.codec);
        console.log(info);
        console.log(avcC);
        console.log(avcC.lengthSizeMinusOne);
        decoder = new VideoDecoder({
            output: handleFrame,
            error: e => console.error(e)
        });

        decoder.configure({
            // codec: 'avc1.4D401E',
            codec: trackInfo.codec,
            codedWidth: trackInfo.video.width,
            codedHeight: trackInfo.video.height,
            // description
            // description: trackInfo.avcDecoderConfigRecord
        });

/*        const support = await VideoDecoder.isConfigSupported({
            codec: trackInfo.codec,

            codedWidth: trackInfo.video.width,
            codedHeight: trackInfo.video.height,
            description: trackInfo.avcDecoderConfigRecord

        });*/

        mp4box.start();
    };

    let started = false;
    mp4box.onSamples = (id, user, samples) => {
        for (const sample of samples) {
            console.log(lengthSize);
            if (!started && !sample.is_sync) continue;

            let data = avcToAnnexB(sample.data, lengthSize);

            if (!started) {
                data = concatUint8([paramSets, data]);
                started = true;
            }

            const timestamp =
                (sample.dts / gtrak.timescale) * 1_000_000;

            const duration =
                (sample.duration / gtrak.timescale) * 1_000_000;

            decoder.decode(new EncodedVideoChunk({
                type: sample.is_sync ? "key" : "delta",
                timestamp,
                duration,
                data
            }));
        }
    };

/*
    mp4box.onSamples = (id, user, samples) => {
        let sentConfig = false

        for (const sample of samples) {

            if (!sample.is_sync && !sentConfig) {
                // Skip until first keyframe
                continue;
            }

            let data = avcToAnnexB(sample.data, lengthSize);

            if (sample.is_sync && !sentConfig) {
                data = concatUint8([paramSets, data]);
                sentConfig = true;
            }


            const chunk = new EncodedVideoChunk({
                type: sample.is_sync ? "key" : "delta",
                timestamp: sample.cts,
                duration: sample.duration,
                data
            });
            decoder.decode(chunk);
        }
    };
*/

    mp4box.appendBuffer(arrayBuffer);
    mp4box.flush();
}

function handleFrame(frame) {
    // Resize canvas once
    globalFrameCount++
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (canvas.width !== frame.displayWidth) {
        canvas.width = frame.displayWidth;
        canvas.height = frame.displayHeight;
    }

    // Draw frame
    ctx.drawImage(frame, 0, 0);

    frame.close();
}


function serializeAvcC(avcC) {
    // Calculate size
    let size =
        7 + // fixed header
        avcC.SPS.reduce((s, sps) => s + 2 + sps.length, 0) +
        avcC.PPS.reduce((s, pps) => s + 2 + pps.length, 0);

    const data = new Uint8Array(size);
    let offset = 0;

    data[offset++] = avcC.configurationVersion;
    data[offset++] = avcC.AVCProfileIndication;
    data[offset++] = avcC.profile_compatibility;
    data[offset++] = avcC.AVCLevelIndication;

    data[offset++] = 0xfc | avcC.lengthSizeMinusOne;

    data[offset++] = 0xe0 | avcC.SPS.length;
    for (const sps of avcC.SPS) {
        data[offset++] = (sps.length >> 8) & 0xff;
        data[offset++] = sps.length & 0xff;
        data.set(sps, offset);
        offset += sps.length;
    }

    data[offset++] = avcC.PPS.length;
    for (const pps of avcC.PPS) {
        data[offset++] = (pps.length >> 8) & 0xff;
        data[offset++] = pps.length & 0xff;
        data.set(pps, offset);
        offset += pps.length;
    }

    return data;
}


function normalizeAvcSample(sampleData, lengthSize) {
    const view = new DataView(sampleData.buffer, sampleData.byteOffset, sampleData.byteLength);
    const out = [];
    let offset = 0;

    while (offset + lengthSize <= view.byteLength) {
        let nalSize = 0;
        for (let i = 0; i < lengthSize; i++) {
            nalSize = (nalSize << 8) | view.getUint8(offset + i);
        }
        offset += lengthSize;

        if (offset + nalSize > view.byteLength) break;

        // Re-emit with SAME length size
        const header = new Uint8Array(lengthSize);
        let tmp = nalSize;
        for (let i = lengthSize - 1; i >= 0; i--) {
            header[i] = tmp & 0xff;
            tmp >>= 8;
        }

        out.push(header, sampleData.subarray(offset, offset + nalSize));
        offset += nalSize;
    }

    return concatUint8(out);
}

function concatUint8(chunks) {
    const size = chunks.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(size);
    let o = 0;
    for (const c of chunks) {
        out.set(c, o);
        o += c.length;
    }
    return out;
}

function buildParameterSetNALs(avcC) {
    const lengthSize = avcC.lengthSizeMinusOne + 1;
    const chunks = [];

    function pushNal(nal) {
        const header = new Uint8Array(lengthSize);
        let size = nal.length;
        for (let i = lengthSize - 1; i >= 0; i--) {
            header[i] = size & 0xff;
            size >>= 8;
        }
        chunks.push(header, nal);
    }

    for (const sps of avcC.SPS) pushNal(sps);
    for (const pps of avcC.PPS) pushNal(pps);

    return concatUint8(chunks);
}


// ANNEX-B STUFF maybe


function avcToAnnexB(sample, lengthSize) {
    const view = new DataView(
        sample.buffer,
        sample.byteOffset,
        sample.byteLength
    );

    const out = [];
    let offset = 0;

    while (offset + lengthSize <= view.byteLength) {
        let nalSize = 0;
        for (let i = 0; i < lengthSize; i++) {
            nalSize = (nalSize << 8) | view.getUint8(offset + i);
        }
        offset += lengthSize;

        if (offset + nalSize > view.byteLength) break;

        // Annex-B start code
        out.push(new Uint8Array([0, 0, 0, 1]));
        out.push(sample.subarray(offset, offset + nalSize));

        offset += nalSize;
    }

    return concatUint8(out);
}

function buildAnnexBParameterSets(avcC) {
    const out = [];
    for (const sps of avcC.SPS) {
        out.push(new Uint8Array([0, 0, 0, 1]), sps);
    }
    for (const pps of avcC.PPS) {
        out.push(new Uint8Array([0, 0, 0, 1]), pps);
    }
    return concatUint8(out);
}