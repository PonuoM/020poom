<?php
require_once __DIR__ . '/../config.php';
cors();

$pdo = db_connect();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  // Dashboard stats
  $stats = [
    'total_items' => 0,
    'received' => 0,
    'inspecting' => 0,
    'waiting_parts' => 0,
    'reconditioning' => 0,
    'completed' => 0,
    'shipped' => 0
  ];

  $stmt = $pdo->query("SELECT status, COUNT(*) as cnt FROM return_items GROUP BY status");
  while ($row = $stmt->fetch()) {
    $stats[$row['status']] = (int)$row['cnt'];
    $stats['total_items'] += (int)$row['cnt'];
  }

  // Recent items
  $stmt = $pdo->query("
    SELECT ri.*, rr.receipt_number, rr.return_date, rr.branch_name
    FROM return_items ri
    JOIN return_receipts rr ON ri.receipt_id = rr.id
    ORDER BY ri.created_at DESC
    LIMIT 10
  ");
  $recent = $stmt->fetchAll();

  json_response(['stats' => $stats, 'recent' => $recent]);
}

json_response(['error' => 'Method not allowed'], 405);
