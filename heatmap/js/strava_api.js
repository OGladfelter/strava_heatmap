strava_data = [];

///////////////////////////////////// API token setting up ///////////////////////////////////////////////////
// check for URL params
var queryString = window.location.search;

// search local storage for a possible access token
try{
    var token_exists = JSON.parse(localStorage.getItem("strava_data")).access_token != null;
    var expires_at = JSON.parse(localStorage.getItem("strava_data")).expires_at;
}
catch{
    var token_exists = false;
    var expires_at = 0;
}

// 4 possible scenarios: token in local storage, expired token in local storage, no token and no oauth code, no token but oauth code
if (token_exists & (new Date().getTime() / 1000) < expires_at) { // their access token is saved in local storage and hasn't expired yet
    console.log("Token exists");

    cleanAndSetUp(); // some UI changes
    token = JSON.parse(window.localStorage.getItem("strava_data")).access_token;
    getActivities(1);
}
else if (token_exists & (new Date().getTime() / 1000) >= expires_at) { // their access token is saved in local storage but expired
    console.log("Previous authorization detected; access token is expired");
    
    cleanAndSetUp(); // some UI changes
    var refreshToken = JSON.parse(localStorage.getItem("strava_data")).refresh_token;
    reAuthorize(refreshToken);
}
else if (queryString == "" || queryString == "?state=&error=access_denied") { // we don't have a code. They still need to log in and authorize
    // encourage them to log in and authorize
    console.log("No token in local storage, no authorization code");
    document.getElementById("logInModal").style.display = "block";
}
else{ // we have a code because they logged in and authorized. the code can be found in the URL params
    console.log("Authorization code retrieved");

    cleanAndSetUp(); // some UI changes
    var urlParams = new URLSearchParams(queryString);
    var code = urlParams.get('code');
    get_token();
}

////////////////////////////////// the functions /////////////////////////////////////////////////////////////
function get_token(){

    // use code from authorization to get user token
    $.ajax({
        url: 'oauth.php',
        type: "POST",
        dataType:'json', 
        data: ({'code':code}),
        complete: function(resp){
            response = resp.responseText;

            // response came in string with a weird '1' in the last position
            response = response.slice(0,-1);

            // save data to local storage - important for refresh token in the future for reauthorization
            localStorage.setItem("strava_data", response);

            // convert string to json
            response = JSON.parse(response);

            // save token
            token = response.access_token;

            // get 30 activities
            getActivities(1);   
        }
    });

}

function reAuthorize(refreshToken){

    // use code from authorization to get user token
    $.ajax({
        url: 'reoauth.php',
        type: "POST",
        dataType:'json', 
        data: ({'refreshToken':refreshToken}),
        complete: function(resp){
            response = resp.responseText;

            // response came in string with a weird '1' in the last position
            response = JSON.parse(response.slice(0,-1));

            // save token
            token = response.access_token;

            // get 200 activities
            getActivities(1);
        }
    });  
}

function getActivities(pageNum){
    
    // console.log(pageNum);

    const activities_link = `https://www.strava.com/api/v3/activities?per_page=200&access_token=` + token + "&page=" + pageNum;
    fetch(activities_link)
    .then(response => response.json())
    .then((json) => {

        // if this page had 200 activities, then there's likely another page
        if (json.length == 200){
            strava_data = strava_data.concat(json); // save contents from this page, run another call to the next page
            document.getElementById("activityCounter").innerHTML = (200 * pageNum) + ' activities found...';
            getActivities(pageNum + 1); // recursion!!
        }
        else if (json.length < 200){ // we've reached the final page
            strava_data = strava_data.concat(json); // save final page's activities to main data array and move on

            strava_data.forEach(function(d) {
                d.start_latitude = d.start_latlng[0];
                d.start_longitude = d.start_latlng[1];
            });

            drawHeatmap(strava_data);
        }
    })
}