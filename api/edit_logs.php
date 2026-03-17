<?php
/**
 * Edit Logs API — Get edit history for a record
 */
require_once __DIR__ . '/../config.php';
cors();
require_auth();
$db = db_connect();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $table = $_GET['table'] ?? '';
  $record_id = (int)($_GET['record_id'] ?? 0);

  if (!$table || !$record_id) {
    json_response(['error' => 'MISSING_PARAMS', 'message' => 'table and record_id required'], 400);
  }

  $stmt = $db->prepare("
    SELECT el.*, u.display_name AS user_name
    FROM edit_logs el
    LEFT JOIN users u ON u.id = el.user_id
    WHERE el.table_name = ? AND el.record_id = ?
    ORDER BY el.created_at DESC
    LIMIT 100
  ");
  $stmt->execute([$table, $record_id]);
  json_response(['logs' => $stmt->fetchAll()]);
}

json_response(['error' => 'Method not allowed'], 405);
