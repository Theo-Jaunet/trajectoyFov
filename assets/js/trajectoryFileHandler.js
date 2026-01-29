let dataRecords


function dataDispatcher(file) {

    let ext = file.name.split('.');
    ext = ext[ext.length - 1];

    if (ext === 'gpx') {
        const reader = new FileReader();

        reader.onload = async function (e) {
            dataRecords = gpx2records(e.target.result)
            let pts = gpx2Trace(dataRecords);

        }

        reader.readAsText(file);

    }
}

function universalPloter(coords,map=[]) {

}

function gpxtogeojson(gpx) {
   let fileXML = new DOMParser().parseFromString(gpx, "text/xml")
    let geojson = toGeoJSON.gpx(fileXML);

    return geojson;
}

function gpx2records(gpxText) {
    //THIS FUNCTION IS BIASED -> WE EXPECT THAT THE LINESTRING IS ALWAYS FIRST
    let tdat = gpxtogeojson(gpxText);
    let times = tdat.features[0].properties.coordTimes;
    let points = tdat.features[0].geometry.coordinates;

    let res = [];

    for (let i = 0; i < points.length; i++) {
        let elem = {
            timestamp: (times ? times[i] : null),
            latitude: points[i][1], // COORDS ARE INVERTED IN GEOJSON 'CAUSE ?????
            longitude: points[i][0]
        };

        if (points[i][2]) elem["elevation"] = points[i][2];

        res.push(elem);
    }

    return res;
}

function gpx2Trace(records) {

    const margin = 10
    let can = document.getElementById("main")
    let cont = can.getContext('2d');

    const projection = d3.geoMercator()
        .fitExtent([[margin, margin], [can.width - margin, can.height - margin]], {
            type: "FeatureCollection",
            features: records.map(d => ({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [d.longitude, d.latitude]
                }
            }))
        });
    stroke = []
    for (let i = 0; i < records.length; i++) {

        stroke.push(projection([records[i].longitude, records[i].latitude]))

    }


    draw(cont, stroke);
}



function coordinates2Trace(pts, map = undefined) {

}

