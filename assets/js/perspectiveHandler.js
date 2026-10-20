// Mashup of https://observablehq.com/@shaunlebron/texture-drawing-for-html-canvas and
// a couple of my own thing like https://observablehq.com/d/b4eae5756b23080d
const seamOverlap = 0.1

function forwardProjectionMatrixForPoints(points) {
    const deltaX1 = points[1].x - points[2].x;
    const deltaX2 = points[3].x - points[2].x;
    const sumX = points[0].x - points[1].x + points[2].x - points[3].x;
    const deltaY1 = points[1].y - points[2].y;
    const deltaY2 = points[3].y - points[2].y;
    const sumY = points[0].y - points[1].y + points[2].y - points[3].y;
    const denominator = new Matrix([deltaX1, deltaX2], [deltaY1, deltaY2]).determinant();
    const g = new Matrix([sumX, deltaX2], [sumY, deltaY2]).determinant() / denominator;
    const h = new Matrix([deltaX1, sumX], [deltaY1, sumY]).determinant() / denominator;
    const a = points[1].x - points[0].x + g * points[1].x;
    const b = points[3].x - points[0].x + h * points[3].x;
    const c = points[0].x;
    const d = points[1].y - points[0].y + g * points[1].y;
    const e = points[3].y - points[0].y + h * points[3].y;
    const f = points[0].y;
    return new Matrix([a, b, c], [d, e, f], [g, h, 1]);
}



function fillQuadTex(ctx, src, dst, opts) {
    opts = opts || {};
    const tiles = opts.tiles || 10;
    const method = opts.method || 'perspective'; // or bilinear

    // See figure: https://github.com/bschwind/Face-Squash
    const lerpQuad = q => {
        const p01 = d3.interpolate(q[0],q[1]);
        const p32 = d3.interpolate(q[3],q[2]);
        return (s,t) => d3.interpolate(p01(s), p32(s))(t);
    };
    const lerpSrc = lerpQuad(src);
    const lerpDst = lerpQuad(dst);

    const projectionSrc = forwardProjectionMatrixForPoints(src);
    const projectionDst = forwardProjectionMatrixForPoints(dst);

    const pad = seamOverlap; // we add padding to remove tile seams

    // return the triangles to fill the cell at the given row/column
    const rowColTris = (r,c,{lerp,projection}) => {
        let p;
        if (lerp) p = (r,c) => lerp(c/tiles, r/tiles);
        if (projection) p = (r, c) => projectPoint({ x: c / tiles, y: r / tiles }, projection);

        return [
            /*
            0-----1
             \    |
               \  |  top
                 \|
                  2
            */
            [
                p(r-pad,c-pad*2), // extra diagonal padding
                p(r-pad,c+1+pad),
                p(r+1+pad*2,c+1+pad) // extra diagonal padding
            ],
            /*
            2
            |\
            |  \   bottom
            |    \
            1-----0
            */
            [
                p(r+1+pad,c+1+pad),
                p(r+1+pad,c-pad),
                p(r-pad,c-pad)
            ]
        ];
    };

    // clip to erase the external padding
    ctx.save();
    ctx.beginPath();
    for (let {x,y} of dst) {
        ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.clip();

    // draw triangles
    for (let r of d3.range(tiles)) {
        for (let c of d3.range(tiles)) {
            let srcTop, srcBot, dstTop, dstBot;
            if (method === "bilinear") {
                [srcTop, srcBot] = rowColTris(r,c,{lerp:lerpSrc});
                [dstTop, dstBot] = rowColTris(r,c,{lerp:lerpDst});
            } else if (method === "perspective") {
                [srcTop, srcBot] = rowColTris(r,c,{projection:projectionSrc});
                [dstTop, dstBot] = rowColTris(r,c,{projection:projectionDst});
            }
            fillTriTex(ctx, srcTop, dstTop);
            fillTriTex(ctx, srcBot, dstBot);
        }
    }
    ctx.restore();
}

function fillTriTex(ctx, src, dst) {
    ctx.beginPath();
    for (let {x,y} of dst) {
        ctx.lineTo(x,y);
    }
    ctx.closePath();
    const [[x0,y0],[x1,y1],[x2,y2]] = dst.map(({x,y}) => [x,y]);
    const [[u0,v0],[u1,v1],[u2,v2]] = src.map(({x,y}) => [x,y]);
    fillTexPath(ctx, x0, y0, x1, y1, x2, y2, u0, v0, u1, v1, u2, v2);
}

// from: https://github.com/mrdoob/three.js/blob/r91/examples/js/renderers/CanvasRenderer.js#L917
// math: http://extremelysatisfactorytotalitarianism.com/blog/?p=2120
function fillTexPath(ctx, x0, y0, x1, y1, x2, y2, u0, v0, u1, v1, u2, v2) {

    var a, b, c, d, e, f, det, idet;

    x1 -= x0; y1 -= y0;
    x2 -= x0; y2 -= y0;

    u1 -= u0; v1 -= v0;
    u2 -= u0; v2 -= v0;

    det = u1 * v2 - u2 * v1;

    if ( det === 0 ) return;

    idet = 1 / det;

    a = ( v2 * x1 - v1 * x2 ) * idet;
    b = ( v2 * y1 - v1 * y2 ) * idet;
    c = ( u1 * x2 - u2 * x1 ) * idet;
    d = ( u1 * y2 - u2 * y1 ) * idet;

    e = x0 - a * u0 - c * v0;
    f = y0 - b * u0 - d * v0;

    ctx.save();
    ctx.transform( a, b, c, d, e, f );
    ctx.fill();
    ctx.restore();
}


function toPerspective(canvas, srcBox, tableSize) {
    // const ctx = canvas.getContext("2d")
    console.log("dasdsadas");
    let dstBox = [
        { x: 0, y: 0 },
        { x: tableSize[1], y: 0 },

        { x: tableSize[1], y: tableSize[0] },
        { x: 0, y: tableSize[0] }
    ];

    const w0 = canvas.width;
    const h0 = canvas.height;

    const w1 = canvas.width;
    const h1 = canvas.height;

    //const dpr = window.devicePixelRatio;
    const dpr = 1;
    const w2 = tableSize[1];
    const h2 = tableSize[0];

    const toScale = (d) => {
        return {
            x: d.x * dpr * (w0 / w1),
            y: d.y * dpr * (h0 / h1)
        };
    };

    const can2 = document.createElement("canvas");
    can2.width = w2;
    can2.height = h2;
    const ctx2 = can2.getContext("2d");
    ctx2.fillStyle = ctx2.createPattern(canvas, "no-repeat");

    fillQuadTex(ctx2, srcBox.map(toScale), dstBox);

    const can3 = document.createElement("canvas");
    can3.width = h2;
    can3.height = w2;
    const ctx3 = can2.getContext("2d");
    // const ctx3 = DOM.context2d(h2, w2, 1);

    ctx3.save();
    ctx3.translate(h2 / 2, w2 / 2);
    // ctx3.rotate(-90 * (Math.PI / 180));
    ctx3.drawImage(ctx2.canvas, (w2 / 2) * -1, (h2 / 2) * -1, w2, h2);

    ctx3.restore();

    return ctx3.canvas;
}

function projectPoint(point, projectionMatrix) {
    const pointMatrix = projectionMatrix.multiply(new Matrix([point.x], [point.y], [1]));
    return {
        x: pointMatrix.get(0, 0) / pointMatrix.get(2, 0),
        y: pointMatrix.get(1, 0) / pointMatrix.get(2, 0),
    };
}
