function TrajSteps(stroke) {
    let tscale = d3.scaleLinear([0, stroke.length], [0.2, 1])
    return stroke.map((d, i) => tscale(i))
}

function snake(stroke) {

    let res = []
    let n = Math.floor(stroke.length * 0.25)
    let it = 0
    let step = 1 / n

    for (let i = 0; i < stroke.length; i++) {
        if (it > n) {
            it = 0
        }
        // res.push(Math.max(0.2,(i%n)/n))
        res.push(Math.max(0.3, it * step))
        ++it
    }
    return res
}