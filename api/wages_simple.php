<?php
// Simplified API for InfinityFree compatibility
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$dataFile = '../data/wages.json';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Read wage data
        if (!file_exists($dataFile)) {
            echo json_encode(['error' => 'Data file not found']);
            exit;
        }
        
        $content = file_get_contents($dataFile);
        if ($content === false) {
            echo json_encode(['error' => 'Cannot read data file']);
            exit;
        }
        
        $data = json_decode($content, true);
        if ($data === null) {
            echo json_encode(['error' => 'Invalid JSON in data file']);
            exit;
        }
        
        echo json_encode($data);
    }
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Update wage data
        $input = file_get_contents('php://input');
        if ($input === false) {
            echo json_encode(['error' => 'No input data']);
            exit;
        }
        
        $data = json_decode($input, true);
        if ($data === null) {
            echo json_encode(['error' => 'Invalid JSON input']);
            exit;
        }
        
        // Update timestamp
        $data['lastUpdated'] = date('Y-m-d');
        
        // Save back to file
        $jsonOutput = json_encode($data, JSON_PRETTY_PRINT);
        if (file_put_contents($dataFile, $jsonOutput) === false) {
            echo json_encode(['error' => 'Cannot save data file']);
            exit;
        }
        
        echo json_encode(['success' => true, 'message' => 'Data updated']);
    }
    else {
        echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>
