<?php
// Debug script to identify the issue
// SECURITY: lock this down to local environments only.
function isLocalRequest(): bool {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if ($ip === '127.0.0.1' || $ip === '::1') return true;

    // Allow RFC1918 private ranges for LAN-based dev (optional)
    if (preg_match('/^10\./', $ip)) return true;
    if (preg_match('/^192\.168\./', $ip)) return true;
    if (preg_match('/^172\.(1[6-9]|2[0-9]|3[0-1])\./', $ip)) return true;

    return false;
}

if (!isLocalRequest()) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Forbidden";
    exit;
}

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h2>PHP Debug Information</h2>";

echo "<h3>Server Info:</h3>";
echo "PHP Version: " . phpversion() . "<br>";
echo "Server: " . $_SERVER['SERVER_SOFTWARE'] . "<br>";
echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "<br>";
echo "Current Path: " . __DIR__ . "<br>";

echo "<h3>File Permissions:</h3>";
$dataFile = '../data/wages.json';
echo "Data File: $dataFile<br>";
echo "File Exists: " . (file_exists($dataFile) ? 'Yes' : 'No') . "<br>";

if (file_exists($dataFile)) {
    echo "File Readable: " . (is_readable($dataFile) ? 'Yes' : 'No') . "<br>";
    echo "File Writable: " . (is_writable($dataFile) ? 'Yes' : 'No') . "<br>";
    echo "File Size: " . filesize($dataFile) . " bytes<br>";
}

echo "<h3>JSON Test:</h3>";
if (file_exists($dataFile)) {
    $jsonData = file_get_contents($dataFile);
    if ($jsonData !== false) {
        echo "File read successfully<br>";
        $data = json_decode($jsonData, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            echo "JSON is valid<br>";
            echo "Regions count: " . count($data['regions']) . "<br>";
        } else {
            echo "JSON Error: " . json_last_error_msg() . "<br>";
        }
    } else {
        echo "Failed to read file<br>";
    }
}

echo "<h3>Headers Test:</h3>";
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
echo "Headers set successfully<br>";

echo "<h3>Current Working Directory:</h3>";
echo getcwd() . "<br>";

echo "<h3>Directory Listing:</h3>";
$files = scandir('../data');
foreach ($files as $file) {
    if ($file !== '.' && $file !== '..') {
        echo "- $file<br>";
    }
}
?>
