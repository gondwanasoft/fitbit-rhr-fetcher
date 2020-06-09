<?php
$key = '[obfuscatedKey]';    // TODO 4 obfuscate for git
// TODO 4 obfuscate filename for git

if (!array_key_exists($key, $_POST)) {
  http_response_code(400);
  echo 'invalid data';
  exit;
}

$request = json_decode($_POST[$key], TRUE);
$fileId = $_POST['userId'];
$filename = $fileId . '.csv';
file_put_contents('feverFiles/' . $filename, $request);

$response = array();
$response['ok'] = true;
$response['file'] = $filename;

echo json_encode($response);