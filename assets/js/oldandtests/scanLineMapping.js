var x = 0;
var y = 0;
var v1 = {x, y};
var v2 = {x, y};
var v3 = {x, y};
var v4 = {x, y};
var tng = {x, y};
var p = {x, y};
var curvePos = {x, y};
var c1, u1, u, b1, a, b, c, d, e, vx, vy;
var bez = {};
bez.p1 = {x: 40, y: 40};
bez.p2 = {x: 360, y: 360};
bez.cp1 = {x: 360, y: 40};
bez.cp2 = {x: 40, y: 360};


function getPosNearBezier(point, resolution, pos) {

    v1.x = bez.p1.x - point.x;
    v1.y = bez.p1.y - point.y;
    v2.x = bez.p2.x - point.x;
    v2.y = bez.p2.y - point.y;
    v3.x = bez.cp1.x - point.x;
    v3.y = bez.cp1.y - point.y;
    if (bez.cp2 !== undefined) {
        v4.x = bez.cp2.x - point.x;
        v4.y = bez.cp2.y - point.y;
    }
    if (resolution === undefined) {
        resolution = 100;
    }
    c1 = 1 / resolution;
    u1 = 1 + c1 / 2;
    var s = 0;
    if (pos !== undefined) {
        s = pos - c1 * 2;
        u1 = pos + c1 * 2;
        c1 = (c1 * 4) / resolution;
    }
    d = Infinity;
    if (bez.cp2 === undefined) {
        for (var i = s; i <= u1; i += c1) {
            a = (1 - i);
            c = i * i;
            b = a * 2 * i;
            a *= a;
            vx = v1.x * a + v3.x * b + v2.x * c;
            vy = v1.y * a + v3.y * b + v2.y * c;
            e = Math.sqrt(vx * vx + vy * vy);
            if (e < d) {
                pos = i;
                d = e;
                curvePos.x = vx;
                curvePos.y = vy;
            }
        }
    } else {
        for (var i = s; i <= u1; i += c1) {
            a = (1 - i);
            c = i * i;
            b = 3 * a * a * i;
            b1 = 3 * c * a;
            a = a * a * a;
            c *= i;
            vx = v1.x * a + v3.x * b + v4.x * b1 + v2.x * c;
            vy = v1.y * a + v3.y * b + v4.y * b1 + v2.y * c;
            e = Math.sqrt(vx * vx + vy * vy);
            if (e < d) {
                pos = i;
                d = e;
                curvePos.x = vx + point.x;
                curvePos.y = vy + point.y;
            }
        }
    }
    return pos;
};

function tangentAt(position) {
    if (bez.cp2 === undefined) {
        a = (1 - position) * 2;
        b = position * 2;
        tng.x = a * (bez.cp1.x - bez.p1.x) + b * (bez.p2.x - bez.cp1.x);
        tng.y = a * (bez.cp1.y - bez.p1.y) + b * (bez.p2.y - bez.cp1.y);
    } else {
        a = (1 - position)
        b = 6 * a * position;        // (6*(1-t)*t)
        a *= 3 * a;                  // 3 * ( 1 - t) ^ 2
        c = 3 * position * position; // 3 * t ^ 2
        tng.x = -bez.p1.x * a + bez.cp1.x * (a - b) + bez.cp2.x * (b - c) + bez.p2.x * c;
        tng.y = -bez.p1.y * a + bez.cp1.y * (a - b) + bez.cp2.y * (b - c) + bez.p2.y * c;
    }
    u = Math.sqrt(tng.x * tng.x + tng.y * tng.y);
    tng.x /= u;
    tng.y /= u;
    return tng;
}

function getRow(y) {
    pixelData = ctx.getImageData(0, y, canvas.width, 1)
    return new Uint32Array(pixelData.data.buffer);
}

function setRow(y, data) {
    return ctx.putImageData(pixelData, 0, y);
}

// scans a single line
function scanLine(y) {
    var pixels = getRow(y);
    for (var x = 0; x < canvas.width; x += 1) {
        p.x = x;
        p.y = y;
        var bp = getPosNearBezier(p, quality);
        if (bp >= 0 && bp <= 1) {
            tng = tangentAt(bp)
            vx = curvePos.x - x;
            vy = curvePos.y - y;
            var dist = Math.sqrt(vx * vx + vy * vy);
            dist *= Math.sign(vx * tng.y - vy * tng.x)
            dist += sHeight / 2
            if (dist >= 0 && dist <= sHeight) {
                var srcIndex = Math.round(bp * sWidth) + Math.round(dist) * sWidth;
                if (sourcePixels[srcIndex] !== 0) {
                    pixels[x] = sourcePixels[srcIndex];
                }
            }
        }
    }
    setRow(y, pixels);
}

var scanY = 0;
function scan() {
    scanLine(scanY);
    scanY += 1;
    if (scanY < canvas.height) {
        setTimeout(scan, 1);
    }
}

ctx.fillStyle = "blue";
ctx.lineWidth = 4;
ctx.beginPath();
ctx.moveTo(bez.p1.x, bez.p1.y);
ctx.bezierCurveTo(bez.cp1.x, bez.cp1.y, bez.cp2.x, bez.cp2.y, bez.p2.x, bez.p2.y);
ctx.stroke();
scan();