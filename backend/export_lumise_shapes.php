<?php
// Export shapes from Lumise database
require('/www/wwwroot/lumise.local/php_connector.php');

$connector = new lumise_connector();
$db_config = $connector->config['database'];

$conn = new mysqli($db_config['host'], $db_config['user'], $db_config['pass'], $db_config['name']);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$prefix = $db_config['prefix'];

// Query only name and content (SVG code) from lumise_shapes
$sql = "SELECT name, content FROM {$prefix}shapes WHERE active = 1 ORDER BY `order`, id";
$result = $conn->query($sql);

$shapes = [];

if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $shapes[] = [
            'name' => $row['name'],
            'content' => $row['content']
        ];
    }
}

$conn->close();

// Output as JSON
echo json_encode($shapes, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
