<?php
    
    $url = 'https://www.strava.com/oauth/token';
    $data = array('client_id' => '', 'client_secret' => '', 'code' => $_POST['code'], 'grant_type' => 'authorization_code');

    $curl = curl_init($url);
    curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($data));

    $response = json_decode(curl_exec($curl), true);
    curl_close($curl);
    echo $response;

?>