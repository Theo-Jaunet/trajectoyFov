//THis approach is using sparse optical flow
//follow this guide: https://learnopencv.com/optical-flow-in-opencv/

const nfeatures = 100;
const nORB = 2000



function estimateCameraMotion(canvasPrev, canvasCurr) {
    const prev = cv.imread(canvasPrev);
    const curr = cv.imread(canvasCurr);

    const g1 = new cv.Mat();
    const g2 = new cv.Mat();
    cv.cvtColor(prev, g1, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(curr, g2, cv.COLOR_RGBA2GRAY);

    // Detect features
    const maxCorners = nfeatures;
    const corners = new cv.Mat();
    cv.goodFeaturesToTrack(g1, corners, maxCorners, 0.01, 10);

    if (corners.rows === 0) {
        cleanup();
        return null;
    }

    // Optical flow
    const nextPts = new cv.Mat();
    const status = new cv.Mat();
    const err = new cv.Mat();

    cv.calcOpticalFlowPyrLK(
        g1,
        g2,
        corners,
        nextPts,
        status,
        err
    );

    let dx = 0, dy = 0, count = 0;

    for (let i = 0; i < status.rows; i++) {
        if (status.ucharAt(i, 0) === 1) {
            const x1 = corners.data32F[i * 2];
            const y1 = corners.data32F[i * 2 + 1];
            const x2 = nextPts.data32F[i * 2];
            const y2 = nextPts.data32F[i * 2 + 1];

            dx += x2 - x1;
            dy += y2 - y1;
            count++;
        }
    }

    if (count > 0) {
        dx /= count;
        dy /= count;
    }

    cleanup();

    return {
        translation: {dx, dy},
        rotation: {
            yaw: dx * 0.002,
            pitch: dy * 0.002
        }
    };

    function cleanup() {
        prev.delete();
        curr.delete();
        g1.delete();
        g2.delete();
        corners.delete();
        nextPts.delete();
        status.delete();
        err.delete();
    }

}
