<?php
require_once __DIR__ . '/../config.php';
cors();

$pdo = db_connect();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  // List all categories with their options
  $stmt = $pdo->query("SELECT * FROM cause_categories ORDER BY sort_order");
  $categories = $stmt->fetchAll();

  foreach ($categories as &$cat) {
    $stmt = $pdo->prepare("SELECT * FROM cause_options WHERE category_id = ? AND is_active = 1 ORDER BY sort_order");
    $stmt->execute([$cat['id']]);
    $cat['options'] = $stmt->fetchAll();
  }

  json_response(['categories' => $categories]);
}

json_response(['error' => 'Method not allowed'], 405);
