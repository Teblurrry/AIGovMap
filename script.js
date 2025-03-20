// map initializing
var map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

//data fetching and processing
Promise.all([
    fetch('data/agora/authorities.csv').then(res => res.text()),
    fetch('data/agora/collections.csv').then(res => res.text()),
    fetch('data/agora/documents.csv').then(res => res.text()),
    fetch('data/agora/segments.csv').then(res => res.text())
]).then(([authorities, collections, documents, segments]) => {
    let authoritiesData = parseAuthorities(authorities);
    let documentData = parseDocuments(documents);
    let segmentData = parseSegments(segments);

    plotDataOnMap(authoritiesData);
    createBarChart(authoritiesData);
    // let allData = [...parseCSV(authorities), ...parseCSV(collections), ...parseCSV(documents), ...parseCSV(segments)];
    // plotDataOnMap(allData);
});

//process each data file
// function parseCSV(data) {
//     let rows = data.split("\n").slice(1); //headers removing
//     return rows.map(row => {
//         let columns = row.split(",")

//         let country = columns[1].trim();
//         let position = columns[3].trim();
//         let policyText = columns[4].trim();
//         let agoraID = columns[6].trim();
//         // let [country, year, policy, score] = row.split(",");
//         return {country, position, policyText, agoraID};
//     });
// }

function parseAuthorities(data) {
    let rows = data.split("\n").slice(1); //headers removing
    return rows.map(row => {
        let columns = row.split(",");
        return {
            name: columns[0]?.trim(),
            jurisdiction: columns[1]?.trim(),
            parent: columns[2]?.trim()
        };
    }).filter(d => d.jurisdiction); //ignoring empty rows
}

function parseDocuments(data) {
    let rows = data.split("\n").slice(1);
    return rows.map(row => {
        let columns = row.split(",");
        return {
            id: columns[0]?.trim(),
            title: columns[1]?.trim(),
            source: columns[2] ? columns[2].trim() : "unknown"
        };
    });
}

function parseSegments(data) {
    let rows = data.split("\n").slice(1);
    return rows.map(row => {
        let columns = row.split(",");
        return {
            documentId: columns[0]?.trim(),
            segementText: columns[1]?.trim()
        };
    });
}

//mapping jurisdictions to Coordinates 
const countryCoordinates = {
    "US": [37.8, -96.8],
    "China": [35.8, 104.2],
    "EU": [51.5, 10.5],
    "UK": [55.4, -3.4],
    "Canada": [56.1, -106.3],
    "Australia": [-25.3, 133.8]
};

//ploting data on map
function plotDataOnMap(authorities, documents, segments) {
    authorities.forEach(auth => {
        let coords = countryCoordinates[auth.jurisdiction] || [0,0];

        L.circleMarker(coords, {
            color: "blue",
            radius: 8
        }).bindPopup(`<b>${auth.name}</b><br>Jurisdiction: ${auth.jurisdiction}<br>Parent Authority: ${auth.parent || "None"}`).addTo(map);
    });

    documents.forEach(doc => {
        let coords = countryCoordinates[doc.source] || [0,0];

        L.circleMarker(coords, {
            color: "green",
            radius: 6
        }).bindPopup(`<b>${doc.title}</b><br>Source: ${doc.source}`).addTo(map);
    });

    segments.forEach(seg => {
        let doc = documents.find(d => d.id === seg.documentId);
        if (!doc) return;

        let coords = countryCoordinates[doc.source] || [0,0]; //if missing then is 0,0

        L.circleMarker(coords, {
            color: "purple",
            radius: 5
        }).bindPopup(`<b>Segment</b><br>${seg.segementText.substring(0, 100)}...`).addTo(map);
    });
    // data.forEach(({country, position, policyText, agoraID}) => {
    //     // let color = score > 7 ? "green" : score > 4 ? "orange" : "red";
    //     let color = agoraID % 2 === 0 ? "blue" : "purple";

    //     L.circleMarker([getLat(country), getLon(country)], {
    //         color: color,
    //         radius: 10
    //     }).bindPopup(`<b>${country}</b><br>Segment: ${position}<br>Policy: ${policyText}<br>ID: ${agoraID}`)
    //     .addTo(map);
    // });
}

// function getLat(country) {
//     let coords ={"USA": 37.8, "China": 35.8, "EU": 51.5};
//     return coords[country] || 0;
// }

// function getLon(country) {
//     let coords = {"USA": -96.9, "China": 104.2, "EU": 10.5};
//     return coords[country] || 0;
// }

function createBarChart(authorities) {
    //aggregate counts per jurisdiction
    let counts = {};
    authorities.forEach(auth => {
        counts[auth.jurisdiction] = (counts[auth.jurisdiction] || 0) + 1;
    });

    //array format converting 
    let data = Object.entries(counts).map(([country, count]) => ({country, count}));

    //setting chart dimensions
    const width = 600, height = 400;
    const margin = {top:30, right: 20, bottom: 50, left:60};

    //svg creating
    const svg = d3.select("#chart").append("svg").attr("width", width).attr("height", height);

    //scales
    const xScale = d3.scaleBand().domain(data.map(d => d.country)).range([margin.left, width - margin.right]).padding(0.2);
    const yScale = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).nice().range([height - margin.bottom, margin.top]);

    //axes
    svg.append("g").attr("transform", `translate(0, ${height - margin.bottom})`).call(d3.axisBottom(xScale)).selectAll("text").attr("transform", "rotate(-30)").style("text-anchor", "end");
    svg.append("g").attr("transform", `translate(${margin.left}, 0)`).call(d3.axisLeft(yScale));

    //bars
    svg.selectAll("rect").data(data).enter().append("rect").attr("x", d => xScale(d.country)).attr("y", d => yScale(d.count)).attr("width", xScale.bandwidth()).attr("height", d => height - margin.bottom - yScale(d.count)).attr("fill", "steelblue");

    //labels
    svg.selectAll(".bar-label").data(data).enter().append("text").attr("x", d => xScale(d.country + xScale.bandwidth() / 2)).attr("y", d=> yScale(d.count) - 5).attr("text-anchor", "middle").text(d=>d.count).style("fill", "black");}
