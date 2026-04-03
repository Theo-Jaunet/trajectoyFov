const transformsExamples = ["supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png"]

let savedTransform = 0

const eclExamples = ["supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png"]

let savedEcl = 0

const activityExamples = ["supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png"]

let savedActivity = 0

docReady(function () {

    let tcon = document.getElementById("transfromList");
    let target = document.getElementById("transformPreview");
    fillExamples(tcon, transformsExamples, target, "transform")


    let tcon3 = document.getElementById("activityList");
    let target3 = document.getElementById("activityPreview");
    fillExamples(tcon3, activityExamples, target3, "activity");


    let tcon2 = document.getElementById("eclList");
    let target2 = document.getElementById("eclPreview");
    fillExamples(tcon2, eclExamples, target2, "ecl");

})


function fillExamples(container, list, target, type) {


    for (let i = 0; i < list.length; i++) {
        let tel = makeSinge(list[i], i)
        if (i === 0) {
            tel.classList.add("selectedIm")
            target.innerHTML = `<img src="${list[i]}"/>`
        }
        tel.classList.add(type)
        tel.onmouseover = function () {
            target.innerHTML = `<img src="${list[i]}"/>`
        }

        tel.onmouseout = function () {

            let n = 0
            if (type === "activity") {
                n = savedActivity
            } else if (type === "ecl") {
                n = savedEcl
            } else if (type === "transform") {
                n = savedTransform
            }


            target.innerHTML = `<img src="${list[n]}"/>`
        }


        tel.onclick = function () {
            target.innerHTML = `<img src="${list[i]}"/>`

            if (type === "activity") {
                savedActivity = i
            } else if (type === "ecl") {
                savedEcl = i
            } else if (type === "transform") {
                savedTransform = i
            }
            document.querySelector(".selectedIm." + type).classList.remove("selectedIm")

            tel.classList.add("selectedIm")
        }
        container.appendChild(tel)
    }

}


function makeSinge(url, val) {

    let el = document.createElement("div")
    el.style.backgroundImage = "url('" + url + "')";
    el.setAttribute('type', "example");
    el.setAttribute('value', val);
    // el.onclick = loadEx
    // container.appendChild(el);

    return el
}