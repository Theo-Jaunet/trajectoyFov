let tracker;
function drawMotion(path, ctx) {

    for (let i = 1; i < path.length; i++) {


        ctx.beginPath();
        ctx.moveTo(path[i - 1].x, path[i - 1].z);
        ctx.lineTo(path[i].x, path[i].z);
        ctx.stroke();
    }
}




function computePath(frames) {

    let smallFrames = frames.map(d=>resizeCan(d,0.2))
    console.log(smallFrames[0].width);
    let path = []
    for (let i = 1; i < frames.length ; i++) {

        path.push(makeState(smallFrames[i - 1], smallFrames[i]));
        console.log(i);
    }
    let can = document.getElementById("main")
    let ctx = can.getContext("2d");
    console.log(path.length);
    drawMotion(path, ctx);
    console.log("done");
}

function makeState(canvasPrev, canvasCurr) {
    const motion = estimateCameraMotion(canvasPrev, canvasCurr);
    console.log(motion);
    const state = tracker.update(motion);

    return state;
}

function createCameraPathTracker(options = {}) {
    const {
        translationScale = 0.01,
        rotationScale = 0.002,
        smoothing = 0.9
    } = options;

    let position = {x: 0, y: 0, z: 0};
    let rotation = {yaw: 0, pitch: 0};
    let velocity = {x: 0, y: 0, z: 0};

    return {
        update,
        getState
    };

    function update(motion) {
        if (!motion) return getState();

        // integrate rotation
        rotation.yaw += motion.rotation.yaw * rotationScale;
        rotation.pitch += motion.rotation.pitch * rotationScale;

        // forward direction from yaw
        const forward = {
            x: Math.sin(rotation.yaw),
            z: Math.cos(rotation.yaw)
        };

        // sideways direction
        const right = {
            x: Math.cos(rotation.yaw),
            z: -Math.sin(rotation.yaw)
        };

        // motion in camera space
        const localMove = {
            x: motion.translation.dx * translationScale,
            y: -motion.translation.dy * translationScale,
            z: translationScale // assumed forward drift
        };

        // rotate into world space
        const worldMove = {
            x: localMove.x * right.x + localMove.z * forward.x,
            y: localMove.y,
            z: localMove.x * right.z + localMove.z * forward.z
        };

        // smooth velocity
        velocity.x = smoothing * velocity.x + (1 - smoothing) * worldMove.x;
        velocity.y = smoothing * velocity.y + (1 - smoothing) * worldMove.y;
        velocity.z = smoothing * velocity.z + (1 - smoothing) * worldMove.z;

        // integrate position
        position.x += velocity.x;
        position.y += velocity.y;
        position.z += velocity.z;

        return getState();
    }

    function getState() {
        return {
            position: {...position},
            rotation: {...rotation}
        };
    }
}
