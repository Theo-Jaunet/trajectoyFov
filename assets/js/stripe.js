function iniStripe() {

    let can = document.getElementById('stripe');

    const ctx = can.getContext("2d");


    const gradient = ctx.createLinearGradient(0, 0, can.width, 0);

    gradient.addColorStop(0, "blue");
    gradient.addColorStop(0.5, "white");
    gradient.addColorStop(1, "red");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, can.width, can.height);
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


            // ctx.fillRect(pts[i][0]-2,pts[i][1]-30,4,60)
            const rad = orrs[i] * Math.PI / 180;

            const tw = dists[i]

            const ratio = (tw  / total) * stripe.width
            acc += ratio
            ctx.translate(pts[i][0] , pts[i][1] - height / 2);
            ctx.rotate(rad);
            ctx.drawImage(stripe, acc, 0, ratio, stripe.height, 0, 0, tw, height);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }


    }


}