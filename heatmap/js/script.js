function demo() {
    d3.csv("data/data.csv", function(error, data) {
        data.forEach(d => {
            d.map = {summary_polyline:d.summary_polyline};
        });
        cleanAndSetUp(); // some UI changes
        drawHeatmap(data);
    });
    document.getElementById("buttonOnDemo").style.display = 'inline-block';
};

function round(num) {    
    return +(Math.round(num + "e+1")  + "e-1");
}

function drawHeatmap(data) {

    // hide some shit, show some shit
    document.getElementById("preview").style.display = "none";
    document.getElementById("map").style.display = 'block';
    document.getElementById("menuContainer").style.display = 'block';

    // read map styles
    mapTilesTerrain = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 28,
        continuousWorld: false,
        noWrap: true
    });
    mapTilesLight = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
        maxZoom: 28,
        continuousWorld: false,
        noWrap: true
    });
    mapTilesDark = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
        maxZoom: 28,
        continuousWorld: false,
        noWrap: true
    });

    var map = L.map('map', {minZoom:3, maxZoom:25, maxBoundsViscosity:1});
    map.setMaxBounds([[-90,-180], [90,180]]);

    // icon allowing users to download screenshots
    L.control.bigImage().addTo(map);

    // filter out activities without GPS
    data = data.filter(d => (d.map && d.map.summary_polyline) || d.coordinates);

    try {
        // setView of map on most recent starting position start_latitude,start_longitude
        map.setView([parseFloat(data[0]['start_latitude']), parseFloat(data[0]['start_longitude'])], 13);
    }
    catch {
        // setView failed for unknown reason. just set view to NYC
        map.setView([40.7128, -74.0060], 13);
    }
        
    var parseDate = d3.timeParse("%Y-%m-%d");

    data.forEach(function(d) {
        d.date = parseDate(d.start_date_local.split("T")[0]);

        d.start_date_local = d.start_date_local.replace("Z","");
        var dateTime = new Date(d.start_date_local);
        var hours = dateTime.getHours();
        var minutes = dateTime.getMinutes();
        d.time = (hours * 60) + minutes; // subtracting 5 * 60 should convert to EST I think

        // create a (wide) start point for each activity so we can group them for the jumper table
        d.start_point = round(parseFloat(d.start_latitude)) + ", " + round(parseFloat(d.start_longitude));

        d.miles = (d.distance / 1609).toFixed(2);
        d.km = (d.distance / 1000).toFixed(2);

        d.summary_polyline = d.map["summary_polyline"];
    });

    // create array of all unique activity types in user's data
    activityTypes = d3.map(data, function(d){return d.type;}).keys();
    document.getElementById("dropdownButton").innerHTML = activityTypes.length + " types";

    // add rows to jumper table
    updateJumperTable();

    // if there's only one type of activity, hide the activity row in filter menu
    if (activityTypes.length == 1) {
        document.getElementById("activitiesRow").style.display = "none";
        document.getElementById("colorByActivityButton").style.display = "none";
    }
    else {
        activityTypes.forEach(function(activity){

            var activityLength = data.filter(d => d.type == activity).length;

            // for show activity filter
            var div = document.getElementById("activityMenu");
            var input = document.createElement("input");
            input.type = "checkbox";
            input.id = activity + "Box";
            input.name = activity + "Name";
            input.value = activity;
            input.checked = true;
            input.classList.add("activityCheckbox");

            var label = document.createElement("label");
            label.for = activity + "Name";
            label.id = activity + "BoxLabel";
            label.innerHTML = activity.replace(/([A-Z])/g, " $1") + " <span class='activityCount'>" + activityLength + "</span>";

            var container = document.createElement("div");
            container.classList.add("checkboxContainer");
            container.appendChild(input);
            container.appendChild(label);

            container.addEventListener("click", function() {
                input.checked ? input.checked = false : input.checked = true;

                if (input.checked) { // if box is checked, add activity from activityTypes
                    activityTypes.push(activity);
                    updateJumperTable(); // update data in jumper table
                } 
                else { // if box is unchecked, remove activity from activityTypes
                    const index = activityTypes.indexOf(activity);
                    if (index > -1) {
                        activityTypes.splice(index, 1);
                        updateJumperTable(); // update data in jumper table
                    }
                }

                if (activityTypes.length == "1") {
                    document.getElementById("dropdownButton").innerHTML = activityTypes[0].replace(/([A-Z])/g, " $1");
                }
                else {
                    document.getElementById("dropdownButton").innerHTML = activityTypes.length + " types";
                }

                // before updating map, get dates
                var dates = $('#dateSlider').slider("option", "values");
                var times = $('#timeSlider').slider("option", "values");

                // call function to update map
                filterActivities(new Date(dates[0] * 1000), new Date(dates[1] * 1000), times[0], times[1]);
            });
            div.appendChild(container);

            // for color-by-activity inputs
            var colorContainer = document.createElement("tr");
            colorContainer.classList.add("colorContainer");
            var colorInput = document.createElement("input");
            colorInput.id = activity + "Color";
            colorInput.type = "color";
            colorInput.value = "#00C2C2";
            colorInput.addEventListener("input", function(){
                var subset = data.filter(function(d){return d.type == activity});
                for (i=0; i<subset.length; i++){
                    paths[subset[i].id]._path.setAttribute("lineColor",this.value);
                    paths[subset[i].id]._path.style.stroke = this.value;
                    paths[subset[i].id].options.color = this.value; // needed for screenshot
                }
            });
            var td1 = document.createElement("td");
            var td2 = document.createElement("td");
            td1.innerHTML = activity.replace(/([A-Z])/g, " $1");
            td2.appendChild(colorInput);
            //colorContainer.appendChild(label.cloneNode(true));
            colorContainer.appendChild(td1);
            colorContainer.appendChild(td2);
            document.getElementById("colorByActivityMenu").appendChild(colorContainer);
        });
    }

    // DRAW THE ACTIVITY LINES ONTO THE MAP
    paths = {}
    for (i=0; i<data.length; i++) {
        
        if (data[i].coordinates) { // file was manually uploaded, so we already have coordinates
            var coordinates = data[i].coordinates;
        } 
        else { // data comes from strava API, so we need coordinates from polyline
            var coordinates = L.Polyline.fromEncoded(data[i].summary_polyline).getLatLngs();
        }

        paths[data[i].id] = L.polyline(
            coordinates,
            {
                color: 'rgb(0,194,194)',
                weight: 2,
                opacity: 1,
                lineJoin: 'round',
                name: data[i].name,
                activity: data[i].type,
                id: data[i].id,
                date: data[i].date,
                startTime: data[i].time
            },
        )
        .on('click', function() { 
            if (Number(this.options.id) > 1000) { // don't activate on demo or manual file upload (assuming no one manually uploads 1k+ files)
                var url = "https://www.strava.com/activities/" + this.options.id;
                window.open(url, '_blank').focus();
            }
        })
        .addTo(map)
        .bindTooltip(data[i].name + "<br>" + data[i].miles + " miles<br>" + data[i].start_date_local.split("T")[0], {sticky: true, className: 'myCSSClass'});
    }

    // set opacity of all lines
    d3.selectAll("path").style("opacity", 0.3);

    ////////////////////////// interactives - data filtering ////////////////////////
    function filterActivities(date1, date2, time1, time2){
        // take date1 and date2 as date objects
        // time1 and time2 are integers. Number of minutes into day. For example, 7:43 = 1183 (9 hours * 60 + 43 minute)

        d3.selectAll("path").style("display","none");

        // if date were given in "YYYY-MM-DD" format, I would need to format it like so:
        // date1 = new Date(date1);
        // date2 = new Date(date2);

        // filter data only to activities between the given dates and start times
        var subset = data.filter(function(d){return (date1<=d.date) & (d.date<=date2) & (time1<=d.time) & (d.time<=time2) & (activityTypes.includes(d.type))});

        // for paths corresponding to those activities, restore stroke opacity
        for (i=0; i<subset.length; i++){
            paths[subset[i].id]._path.style.display = "initial";
        }
    }

    // get min and max dates in epoch time (seconds from something)
    var minDate = d3.min(data, function(d) { return d.date; }).getTime() / 1000;
    var maxDate = d3.max(data, function(d) { return d.date; }).getTime() / 1000;

    // add date slider + function
    $(function(){
        $("#dateSlider").slider({
            range: true,
            min: minDate,
            max: maxDate + 86400,
            step: 86400,
            values: [minDate, maxDate + 86400],
            slide: function(event, ui){
                minEpoch = new Date(ui.values[0] * 1000).setHours(0,0,0,0);
                maxEpoch = new Date(ui.values[1] * 1000).setHours(0,0,0,0);

                // reformat EPOS seconds back into date object - must be of time 00:00:00 to match strava date that I pulled
                var newMinDate = new Date(minEpoch);
                var newMaxDate = new Date(maxEpoch);

                // update Date text label
                if (minEpoch == maxEpoch){
                    $('#dateLabel').text(newMinDate.toDateString().replace(/^\S+\s/,''));
                }
                else if (minEpoch==minDate*1000 & maxEpoch>=maxDate*1000){
                    $('#dateLabel').text("Any Date");
                }
                else{
                    $('#dateLabel').text(newMinDate.toDateString().replace(/^\S+\s/,'') + " - " + newMaxDate.toDateString().replace(/^\S+\s/,''));
                }
                
                // don't forget to include time
                var times = $('#timeSlider').slider("option", "values");

                // call function to update map
                filterActivities(newMinDate, newMaxDate, times[0], times[1]);
            }
        });
    });

    // add time slider + function
    $(function() {
        $("#timeSlider").slider({
            range: true,
            min: 0,
            max: 1439,
            step: 15,
            values: [0, 1439],
            slide: function(e, ui) {
                // transform minute values into HH:SS format
                var period = "am";
                var hours = Math.floor(ui.values[0] / 60);
                var minutes = ui.values[0] - (hours * 60);
                if (hours == 0){hours = "12"}
                else if (hours == 12){ period = "pm"}
                else if (hours > 12){hours = hours - 12; period = "pm"};
                if(minutes.toString().length == 1){minutes = '0' + minutes};
                var startTime = hours+':'+minutes+period;

                var period = "am";
                var hours = Math.floor(ui.values[1] / 60);
                var minutes = ui.values[1] - (hours * 60);
                if (hours == 0){hours = "12"}
                else if (hours == 12){ period = "pm"}
                else if (hours > 12){hours = hours - 12; period = "pm"};
                if(minutes.toString().length == 1){minutes = '0' + minutes};
                var endTime = hours+':'+minutes+period;

                // update Start Time text label
                if (ui.values[0]==0 & ui.values[1]==1425){
                    $('#timeLabel').text("Any time");
                }
                else{
                    $('#timeLabel').text(startTime + " - " + endTime);
                }
                
                // before updating map, get dates
                var dates = $('#dateSlider').slider("option", "values");

                // call function to update map
                filterActivities(new Date(dates[0] * 1000), new Date(dates[1] * 1000), ui.values[0], ui.values[1]);
            }
        });
    });

    ////////////////////////////////////////////////////////////////////////////////

    ////////////////////////// interactives -jump to section ////////////////////////

    // function for adding rows to jumper table
    function updateJumperTable(){

        // only include activities of activityTypes
        var subset = data.filter(function(d){return (activityTypes.includes(d.type))});

        // count # of activities in each major starting locations
        var nest = d3.nest()
            .key(function(d){return d.start_point;})
            .entries(subset)
            .sort(function(a, b){ return d3.ascending(a.values, b.values); })
            .filter(function(a){return a.values.length >= 10})
        
        // if there's only one major starting point, remove the entire menu section altogether
        if (nest.length <= 1) {
            document.getElementById("jumperMenu").style.display = "none";
            return;
        }
        else {
            document.getElementById("jumperMenu").style.display = "block";
        }

        // if this isn't the first time running, the table will already have rows. Remove them.
        $("#jumperTable tr").remove(); 

        // grab jumperTable
        var table = document.getElementById("jumperTable");

        // how to label the counts?
        if (activityTypes.length == 1){
            var label = activityTypes[0].toLowerCase() + "s";
        }
        else {
            var label= "activities";
        };

        // for each of the entries in nest, add a row to table
        for (i=0; i<nest.length; i++) {
            var row = table.insertRow(0); // add new row at 1st position
            row.classList.add("rowButton");
            row.setAttribute("start_latitude", nest[i].values[0].start_latitude);
            row.setAttribute("start_longitude", nest[i].values[0].start_longitude);
            var cell1 = row.insertCell(0); // add new cells
            var cell2 = row.insertCell(1);
            cell1.id = nest[i].key;
            cell1.innerHTML = nest[i].key; // add lat long as text label - this should get overwritten in reverse_geocode(), but is a backup
            reverse_geocode(nest[i].values[0].start_latitude, nest[i].values[0].start_longitude, nest[i].key); // add city name as text label
            
            if (i == nest.length - 1) {
                cell2.innerHTML = nest[i].values.length + " " + label;
            }
            else {
                cell2.innerHTML = nest[i].values.length;
            }
            
            // add function to call when this row is clicked
            row.addEventListener("click", function() {
                var lat = this.getAttribute("start_latitude"); // get coordinates
                var long = this.getAttribute("start_longitude"); // get coordinates
                map.panTo([lat, long], 14); // set map view on these coords
            });
        }
    }

    // hover over any path to highlight it
    d3.selectAll("path").on("mouseover", function() {
        d3.select(this).style('stroke', 'yellow');
        d3.select(this).style('opacity', 1);
        d3.select(this).raise();
    })
    .on("mouseout", function() {
        d3.select(this).style('stroke', this.getAttribute("lineColor") ? this.getAttribute("lineColor") : document.getElementById("lineColor").value);
        d3.select(this).style('opacity', $('#alphaSlider').slider("option", "value"));
    });

    // customization menu item - switch tooltip to show miles vs km
    document.getElementById("imperial").addEventListener("click", function() { 
        document.getElementById("metric").classList.remove('selectedSpan');
        this.classList.add('selectedSpan');
        data.forEach(d => {
            paths[d.id].setTooltipContent(d.name + "<br>" + d.miles + " miles<br>" + d.start_date_local.split("T")[0]);
        });
    });
    document.getElementById("metric").addEventListener("click", function() { 
        document.getElementById("imperial").classList.remove('selectedSpan');
        this.classList.add('selectedSpan');
        data.forEach(d => {
            paths[d.id].setTooltipContent(d.name + "<br>" + d.km + " km<br>" + d.start_date_local.split("T")[0]);
        });
    });


    function updateMap(event) {
        // remove leaflet map tiles
        map.removeLayer(mapTilesDark);
        map.removeLayer(mapTilesLight);
        map.removeLayer(mapTilesTerrain);
        // add appropriate leaflet map tiles
        var clickedTargetId = event.target.id;
        if (clickedTargetId == 'lightMapButton') {
            map.addLayer(mapTilesLight);
        } else if (clickedTargetId == 'darkMapButton') {
            map.addLayer(mapTilesDark);
        } else if (clickedTargetId == 'terrainMapButton') {
            map.addLayer(mapTilesTerrain);
        }
    }

    // customization menu item - click radio buttons to turn map tiles on/off
    document.getElementById("mapOptionsTd").querySelectorAll('span').forEach(input => {
        input.addEventListener("click", function(e) {
            updateMap(e);
            document.getElementById("mapOptionsTd").querySelectorAll('span').forEach(input => input.classList.remove('selectedSpan'));
            input.classList.add('selectedSpan');
        });
    });
    
    document.getElementById("loaderModal").style.display="none";
}

// function handleFileSelect(event) {
//     const reader = new FileReader()
//     reader.onload = handleFileLoad;
//     reader.readAsText(event.target.files[0]);
// }

// function handleFileLoad(event) {
//     var xml = $(event.target.result)[2];
//     var trackPoints = d3.select(xml).selectAll('trkpt');
//     var coordinates = [];

// 	trackPoints.each(function() {
// 		var lat = parseFloat(d3.select(this).attr("lat"));
// 		var lon = parseFloat(d3.select(this).attr("lon"));
// 		coordinates.push({lat:lat, lon:lon});
// 	});

//     var gpxInfo = new L.GPX(event.target.result, {async: true}).on('loaded', function(e) {
//         // https://github.com/mpetazzoni/leaflet-gpx
//         var startTime = e.target.get_start_time();
//         var start_date_local = startTime.getFullYear() + '-' + startTime.getMonth() + 1 + '-' + startTime.getDay() + 'T12:00:00';
    
//         data = [];
//         data.push({coordinates:coordinates,
//                     id:1,
//                     start_date_local:start_date_local,
//                     start_latitude:coordinates[0].lat,
//                     start_longitude:coordinates[0].lon,
//                     type:'Run',
//                     distance:e.target.get_distance(),
//                     name:e.target.get_name(),
//                     map:{summary_polyline:''}
//                 });

//         cleanAndSetUp();
//         drawHeatmap(data);
//     });
// }

function pad(n){return n<10 ? '0'+n : n}

function readMultipleFiles(event) {
    const files = event.target.files;
    data = [];
    for (file of files) {
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = (event) => {
            new L.GPX(event.currentTarget.result, {async: true}).on('loaded', function(e) {
                var layers = e.layers._layers; // first provides full coordinates, second is first point, third is end point
                var firstKey = Object.keys(layers)[0]; // key names seem to be random numbers that iterate. Further research needed.
                var coordinates = layers[firstKey]._latlngs;
                // https://github.com/mpetazzoni/leaflet-gpx
                var startTime = e.target.get_start_time();
                var start_date_local = startTime.getFullYear() + '-' + pad(startTime.getMonth() + 1) + '-' + pad(startTime.getDate()) + 'T' + startTime.getHours() + ':' + startTime.getMinutes() + ':00';
                data.push({coordinates:coordinates,
                    id:data.length,
                    start_date_local:start_date_local,
                    start_latitude:coordinates[0].lat,
                    start_longitude:coordinates[0].lng,
                    type:'Run',
                    distance:e.target.get_distance(),
                    name:e.target.get_name(),
                    map:{summary_polyline:''}
                });
                if (data.length >= files.length) { // replace this tech-debt with Promises?
                    cleanAndSetUp();
                    drawHeatmap(data);
                }
            });
        };
    }
}
