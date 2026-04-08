let nblab = 0

let waypoints = {}

let trow
let telem


function addWaypoint(waypoint) {


}


function makeNewLabel(id = undefined, wp = undefined) {
    let waypoint = document.createElement("div")
    let container = document.getElementById("waypoints")

    let tid = (id === undefined ? nblab : id)

    waypoint.classList.add("waypoint")
    waypoint.setAttribute("id", "waypoint" + nblab)

    let img = "assets/images/pictos/plus.png"
    let name = "Type a name.."

    if (wp) {
        img = wp.image
        name = wp.name
    }

    let trange = Math.random()

    let temFrame = Math.floor(gframes.length * trange)

    img = gframes[temFrame]

    let timg = img.toDataURL()


    waypoint.innerHTML = `<div class="waypointProfile">
                            <div row="${tid}" onclick="updateWaypointImg(this,${tid})" class="waypointImg" style="background-image: url('${timg}')">
                        </div>
                        <div class="waypointData"> 
                        <input type="text" oninput="updateName(this,${tid})" row="${tid}" value="${name}" class="waypointTitle" />
                         <input type="range" min="0" max="1" step="0.01" oninput="updateRange(this,${tid})" row="${tid}" value="${trange}" class="waypointRange" />
                        </div>
     
              <img onclick="deleteWaypoint(${tid})" row="${tid}" class="deleteWaypoint" src="assets/images/pictos/cross.png" row="${tid}" style="">
</div>`

    if (id === undefined) {
        waypoints[nblab] = {
            name: "PlaceHolder",
            range: trange,
            image:img,
            useImg: true,
        }
        nblab++
    }


    container.append(waypoint);
    resetCan()

}


function fillWaypoints() {

    let hasEle = false


    if (dataRecords.length > 0) {
        if (dataRecords[0].elevation) {
            hasEle = true
        }
    }


}


function deleteWaypoint(row) {

    let waypoint = document.getElementById("waypoint" + row)
    waypoint.parentNode.removeChild(waypoint)
    delete waypoints[row]
}

function updateName(elem, row) {
    let name = elem.value
    waypoints[row].name = name;
    resetCan()

}

function updateRange(elem, row) {
    let range = elem.value
    waypoints[row].range = range;
    let temFrame = Math.min(gframes.length-1, Math.floor(gframes.length * range))

    let img = gframes[temFrame]
    waypoints[row].image = img
    resetCan()
}


function updateWaypointImg(elem, row) {
    let input = document.getElementById("waypointFile")
    trow = row
    telem = elem
    input.click()
}

function loadWaypointImage(file) {
    const reader = new FileReader();

    reader.onload = async function (e) {

        let tim = await addImageProcess(e.target.result)
        waypoints[trow].image = tim
        waypoints[trow].useImg = true

        telem.style.backgroundImage = `url('${tim.src}')`

        trow = undefined
        telem = undefined

    }
    reader.readAsDataURL(file);
}


function drawWaypoints() {
    let traj = [...stroke]
    if (mapFlag)
        traj = [...mapStroke]
    if (traj.length > 2) {
        let off = 200
        let seg = makeSegments(traj)

        let canvas = document.getElementById('main')
        if (mapFlag)
            canvas = mapCan
        let ctx = canvas.getContext('2d');
        ctx.font = "bold 24px helvetica";
        for (const [key, value] of Object.entries(waypoints)) {
            let width, height = 40
            if (!value.useImg) {
                let t = estimateLabelSize(ctx, value.name);
                width = t[0]
                height = t[1]
            }
            width += 8
            height += 4
            const data = getLabelPlacement(seg, value.range, width, height, off)
            if (value.useImg) {
                drawImageLabel(ctx, data, value)
            } else {
                drawTextLabel(ctx, data, value)
            }

        }
    }
}


function drawImageLabel(ctx, data, waypoint) {
    let w = 65
    let h = 65

    ctx.beginPath();
    ctx.moveTo(data.link[0][0], data.link[0][1]);
    ctx.lineTo(data.link[1][0], data.link[1][1]);
    ctx.stroke();

    ctx.save()

    ctx.beginPath();
    ctx.arc(data.label[0], data.label[1], w / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.clip();
    ctx.drawImage(waypoint.image, data.label[0] - w / 2, data.label[1] - h / 2, w, h);

    ctx.restore()

    ctx.fillText(waypoint.name, data.label[0]+w/2, data.label[1]);
}

function drawTextLabel(ctx, data, waypoint) {

    const label = data.label
    const link = data.link
    ctx.beginPath();
    ctx.moveTo(link[0][0], link[0][1]);
    ctx.lineTo(link[1][0], link[1][1]);
    ctx.stroke();
    ctx.fillText(waypoint.name, label[0], label[1]);
}

function makeSegments(traj) {
    const lengths = [];
    let total = 0;

    for (let i = 0; i < traj.length - 1; i++) {
        const dx = traj[i + 1][0] - traj[i][0];
        const dy = traj[i + 1][1] - traj[i][1];
        const len = Math.hypot(dx, dy);

        lengths.push(len);
        total += len;
    }

    return [
        traj,
        lengths,
        total
    ];
}

function getLabelPlacement(traj, percentage, labelWidth, labelHeight, offset = 20) {
    const [points, lengths, totalLength] = traj;

    const target = percentage * totalLength;

    let acc = 0;
    let seg = 0;

    for (let i = 0; i < lengths.length; i++) {
        if (acc + lengths[i] >= target) {
            seg = i;
            break;
        }
        acc += lengths[i];
    }

    const p0 = points[seg];
    const p1 = points[seg + 1];
    const segLen = lengths[seg];

    const t = segLen === 0 ? 0 : (target - acc) / segLen;

    const x = p0[0] + t * (p1[0] - p0[0]);
    const y = p0[1] + t * (p1[1] - p0[1]);

    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];

    const angle = Math.atan2(dy, dx);

    // normalized normal
    let nx = -dy;
    let ny = dx;
    const nlen = Math.hypot(nx, ny) || 1;
    nx /= nlen;
    ny /= nlen;

    // test both sides
    const candidates = [
        [nx, ny],
        [-nx, -ny]
    ];

    let best = null;
    let bestScore = -Infinity;

    for (const [sx, sy] of candidates) {

        const lx = x + sx * offset;
        const ly = y + sy * offset;

        const box = {
            left: lx - labelWidth / 2,
            right: lx + labelWidth / 2,
            top: ly - labelHeight / 2,
            bottom: ly + labelHeight / 2
        };

        // simple score: distance from trajectory anchor
        const dist = Math.hypot(lx - x, ly - y);

        // bonus if box does not intersect anchor
        const overlaps =
            x >= box.left &&
            x <= box.right &&
            y >= box.top &&
            y <= box.bottom;

        const score = overlaps ? -dist : dist;

        if (score > bestScore) {
            bestScore = score;
            best = {lx, ly};
        }
    }

    return {
        anchor: [x, y],
        label: [best.lx, best.ly],
        angle: angle,
        link: [
            [x, y],
            [best.lx, best.ly]
        ]
    };
}

function estimateLabelSize(ctx, text) {
    const metrics = ctx.measureText(text);

    const width = metrics.width;

    const height =
        (metrics.actualBoundingBoxAscent || 0) +
        (metrics.actualBoundingBoxDescent || 0);

    return [width, height];
}