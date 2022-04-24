// click divs to show / hide menus
document.getElementById("menuHeaderContainer1").addEventListener("click", function() {
    if (document.getElementById("filterMenuTable").style.display == "table"){
        document.getElementById("filterMenuTable").style.display = "none";
        document.getElementById("menuButton1").innerHTML = "+";
    }
    else{
       document.getElementById("filterMenuTable").style.display = "table";
       document.getElementById("menuButton1").innerHTML = "-";
    }
});
document.getElementById("menuHeaderContainer2").addEventListener("click", function() {
    if (document.getElementById("jumperTable").style.display == "table"){
        document.getElementById("jumperTable").style.display = "none";
        document.getElementById("menuButton2").innerHTML = "+";
    }
    else{
       document.getElementById("jumperTable").style.display = "table";
       document.getElementById("menuButton2").innerHTML = "-";
    }
});
document.getElementById("menuHeaderContainer3").addEventListener("click", function() {
    if (document.getElementById("customizeMenuTable").style.display == "table"){
        document.getElementById("customizeMenuTable").style.display = "none";
        document.getElementById("menuButton3").innerHTML = "+";
    }
    else{
       document.getElementById("customizeMenuTable").style.display = "table";
       document.getElementById("menuButton3").innerHTML = "-";
    }
});


// customization menu item - background color
document.getElementById("backgroundColor").addEventListener("input", function() { 
    document.getElementById("map").style.background = this.value;
    document.getElementsByTagName("body")[0].style.backgroundColor = this.value;
});

// customization menu item - line color
document.getElementById("lineColor").addEventListener("input", function() { 
    var allColor = this.value;
    d3.selectAll("path").style("stroke",allColor); // update frontend color
    var lines = d3.selectAll("path");
    lines._groups[0].forEach(function(d){ // update lineColor attribute for proper highlighting and returning to color
        d.setAttribute("lineColor",allColor);
    });
    for (const key of Object.keys(paths)) { // update color attr in options, for screenshot
        paths[key].options.color = allColor; // now this line will show up as this color in the screenshot
    }
    for (i=0; i<$("#colorByActivityMenu input").length; i++){ // set all by activity color pickers to match this color
        $("#colorByActivityMenu input")[i].value = allColor;
    }
});

// customization menu - line thickness
$(function() {
    $("#thicknessSlider").slider({
        range: false,
        min: 0.5,
        max: 3,
        step: 0.5,
        value: 2,
        slide: function(e, ui) {
            d3.selectAll("path").style("stroke-width",ui.value+"px")
        }
    });
});

// customization menu - line opacity
$(function() {
    $("#alphaSlider").slider({
        range: false,
        min: 0.1,
        max: 1,
        step: 0.1,
        value: 0.3,
        slide: function(e, ui) {
            d3.selectAll("path").style("opacity",ui.value);
        }
    });
});

// getting color pickers to work right on macs
function showActivityColorMenu(){
    document.getElementById("colorByActivityMenu").style.display = 'block';
}
document.getElementById("colorByActivityMenu").addEventListener("click", function(event){
    event.stopPropagation(); // prevent menu from closing if they click on the menu
});
document.body.addEventListener("click", function(){
    document.getElementById("colorByActivityMenu").style.display = 'none';
});

document.getElementById("printModal").addEventListener("click", function(){
    document.getElementById("printModal").style.display = 'none';
});
// for some fun flair...
document.getElementById("normalResolutionButton").addEventListener("mouseenter", function(){
    document.getElementById("downloadButton1").classList.toggle('rotated');
});
document.getElementById("highResolutionButton").addEventListener("mouseenter", function(){
    document.getElementById("downloadButton2").classList.toggle('rotated');
});

var latlngDict = {};
function reverse_geocode(lat, lng, row_id){
    
    var latlng = String(lat) + ", " + String(lng);

    // don't duplicatively call API if we already have for this latlng
    if (latlng in latlngDict) {
        document.getElementById(row_id).innerHTML = latlngDict[latlng];
        return;
    }
    else {
        $.ajax({
            url: 'geocode.php',
            type: "GET",
            data: ({'latlng':latlng}),
            complete: function(resp) {
                var response = resp.responseText;
                var data = JSON.parse(response);
                var API_result = data.results[0].address_components[0].short_name;
                latlngDict[latlng] = API_result; // save result to dictionary
                document.getElementById(row_id).innerHTML = latlngDict[latlng];
            }
        });  
    }
}

// use this function for testing
// function reverse_geocode_no_php(lat, lng, row_id){

//     var latlng = String(lat) + ", " + String(lng);

//     // don't recall API if we already have for this latlng
//     if (latlng in latlngDict) {
//         document.getElementById(row_id).innerHTML = latlngDict[latlng];
//         return;
//     }
//     else {
//        const activities_link = "https://maps.googleapis.com/maps/api/geocode/json?&key={}&result_type=locality&latlng=" + latlng; // google api key goes in brackets
//         fetch(activities_link)
//         .then(response => response.json())
//         .then((json) => {
//             var API_result = json.results[0].address_components[0].short_name;
//             latlngDict[latlng] = API_result; // save result to dictionary
//             document.getElementById(row_id).innerHTML = latlngDict[latlng];
//         }) 
//     }
// }

function cleanAndSetUp(){
    // hide some shit, show some shit
    document.getElementById("logInModal").style.display = "none";
    document.getElementById("loaderModal").style.display = "block";
    document.getElementById("video").pause();
}