<?php
    
    $url = 'https://maps.googleapis.com/maps/api/geocode/json';
    
    $params = array('key' => '', 'result_type' => 'locality', 'latlng' => $_GET['latlng']);

    // create curl resource
    $ch = curl_init();

    //return the transfer as a string
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

    // Follow redirects
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

    // Set maximum redirects
    curl_setopt($ch, CURLOPT_MAXREDIRS, 5);

    // Allow a max of 5 seconds.
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);

    // set url
    $query = http_build_query($params);
    curl_setopt($ch, CURLOPT_URL, "$url?$query");
    
    // $output contains the output string
    $output = curl_exec($ch);

    // close curl resource to free up system resources
    curl_close($ch);

    echo $output;

?>