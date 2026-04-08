const transformsExamples = ["assets/suppFiles/transform/1.png",
    "assets/suppFiles/transform/2.png",
    "assets/suppFiles/transform/3.png",
    "assets/suppFiles/transform/4.png",
    "assets/suppFiles/transform/5.png",
    "assets/suppFiles/transform/6.png",
    "assets/suppFiles/transform/7.png",
    "assets/suppFiles/transform/8.png"
    ]

let savedTransform = 0

const eclExamples = ["supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png",
    "supp/transforms/test.png"]

let savedEcl = 0

const activityExamplesFrame = ["assets/suppFiles/activities/frame/1.png",
    "assets/suppFiles/activities/frame/2.png",
    "assets/suppFiles/activities/frame/3.png"]

const activityExamplesProj = ["assets/suppFiles/activities/projection/1.png",
    "assets/suppFiles/activities/projection/2.png",
    "assets/suppFiles/activities/projection/3.png"]


let savedActivity = 0

docReady(function () {

    let tcon = document.getElementById("transfromList");
    let target = document.getElementById("transformPreview");
    fillExamples(tcon, transformsExamples, target, "transform",transformsExamples)


    let tcon3 = document.getElementById("activityList");
    let target3 = document.getElementById("activityPreview");
    fillExamples(tcon3, activityExamplesFrame, target3, "activity",activityExamplesProj);


    let tcon2 = document.getElementById("eclList");
    let target2 = document.getElementById("eclPreview");
    fillExamples(tcon2, eclExamples, target2, "ecl",eclExamples);

})


function fillExamples(container, list, target, type,proj) {


    for (let i = 0; i < list.length; i++) {
        let tel = makeSinge(list[i], i)
        if (i === 0) {
            tel.classList.add("selectedIm")
            target.innerHTML = `<img src="${proj[i]}"/>`
        }
        tel.classList.add(type)
        tel.onmouseover = function () {
            target.innerHTML = `<img src="${proj[i]}"/>`
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