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
    d3.selectAll("path").style("stroke",this.value);
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
        min: 0.2,
        max: 1,
        step: 0.1,
        value: 1,
        slide: function(e, ui) {
            d3.selectAll("path").style("opacity",ui.value)
        }
    });
});

var latlngDict = {};
function reverse_geocode(latlng){
    
    // save an API call, see if we've already looked this info up
    if (latlng in latlngDict){
        document.getElementById(latlng).cells[0].innerHTML = latlngDict[latlng];
        return // don't run anything else
    }
    else{
        $.ajax({
            url: 'geocode.php',
            type: "GET",
            data: ({'latlng':latlng}),
            complete: function(resp){
                var response = resp.responseText;
                data = JSON.parse(response);
                var API_result = data.results[0].address_components[0].short_name;
                document.getElementById(latlng).cells[0].innerHTML = API_result;
                latlngDict[latlng] = API_result;
            }
        });  
    }
}

// function reverse_geocode_no_php(latlng){

//     // save an API call, see if we've already looked this info up
//     if (latlng in latlngDict){
//         document.getElementById(latlng).cells[0].innerHTML = latlngDict[latlng];
//         console.log("hi")
//         return // don't run anything else
//     }
//     else{
//        const activities_link = "https://maps.googleapis.com/maps/api/geocode/json?&key={}&result_type=neighborhood&latlng=" + latlng;
//         fetch(activities_link)
//         .then(response => response.json())
//         .then((json) => {
//             var API_result = json.results[0].address_components[0].short_name;
//             document.getElementById(latlng).cells[0].innerHTML = API_result;
//             latlngDict[latlng] = API_result;
//         }) 
//     }
// }