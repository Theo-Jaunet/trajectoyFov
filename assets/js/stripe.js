function iniStripe() {

    let can = document.getElementById('stripe');

    const ctx = can.getContext("2d");


    const gradient = ctx.createLinearGradient(0, 0, can.width, 10);

    gradient.addColorStop(0, "blue");
    gradient.addColorStop(0.5, "white");
    gradient.addColorStop(1, "red");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, can.width, can.height/2);

    const gradient2 = ctx.createLinearGradient(0, 0, can.width, 10);

    gradient2.addColorStop(0, "orange");
    gradient2.addColorStop(0.5, "white");
    gradient2.addColorStop(1, "green");

    ctx.fillStyle = gradient2;
    ctx.fillRect(0, can.height/2, can.width, can.height);

    // debugSquares(can)


}


function debugSquares(can) {
    const sqSize = 20
    const cont = can.getContext("2d")
    cont.beginPath()
    for (let i = 0; i <Math.floor(can.width/sqSize) ; i++) {
        // for (let j = 0; j < Math.floor(can.height / sqSize); j++) {
        let j = 0
            cont.rect(i * sqSize, j * sqSize, sqSize, sqSize)
        // }
    }
    cont.stroke()
    cont.closePath()

}

function rectMatch(pts, height, type = 'pointWise') {
    let stripe = document.getElementById('stripe');
    let can = document.getElementById('main');
    const ctx = can.getContext("2d");

    let w = stripe.width / pts.length;
    let orrs = getTrajFullOrr(pts)

    if (type === 'pointWise') {


        for (let i = 0; i < pts.length; i++) {

            const rad = orrs[i] * Math.PI / 180;

            ctx.translate(pts[i][0] + w / 2, pts[i][1] - height / 2);
            ctx.rotate(rad);
            ctx.drawImage(stripe, w * i, 0, w, stripe.height, 0, 0, w, height);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }


    }

    if (type === 'stretch') {
        const dists = getTrajFullDist(pts)
        const total = dists.reduce((acc, curr) => acc + curr)
        let acc = 0

        for (let i = 0; i < pts.length; i++) {

            const rad = orrs[i] * Math.PI / 180;

            const tw = Math.max(dists[i], 1)

            const ratio = (tw / total) * stripe.width
            acc += ratio - 0.5 //TODO: change the minus to fix matching
            ctx.translate(pts[i][0], pts[i][1]);
            ctx.fillRect(-5, -5, 10, 10);
            ctx.rotate(rad);
            ctx.drawImage(stripe, acc, 0, ratio, stripe.height, -tw / 2, -height / 2, tw, height);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }


    }


}