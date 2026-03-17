<?php
/**
 * Settings API — Warehouses, Return Types, Reorder
 */
require_once __DIR__ . '/../config.php';
cors();
$currentUser = require_auth();
$db = db_connect();

$method = $_SERVER['REQUEST_METHOD'];
$type = $_GET['type'] ?? '';

switch ($type) {
  // ── Warehouses ─────────────────────────────
  case 'warehouses':
    if ($method === 'GET') {
      $stmt = $db->query("SELECT * FROM warehouses ORDER BY priority ASC, id ASC");
      json_response(['warehouses' => $stmt->fetchAll()]);
    }
    if ($method === 'POST') {
      $input = json_input();
      $action = $input['action'] ?? 'create';

      if ($action === 'create') {
        $code = trim($input['code'] ?? '');
        $name = trim($input['name'] ?? '');
        if (!$code || !$name) json_response(['error' => 'MISSING_FIELDS'], 400);

        // Get next priority
        $maxP = $db->query("SELECT COALESCE(MAX(priority), 0) + 1 AS next_p FROM warehouses")->fetch();
        $stmt = $db->prepare("INSERT INTO warehouses (code, name, priority) VALUES (?, ?, ?)");
        $stmt->execute([$code, $name, $maxP['next_p']]);
        json_response(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
      }

      if ($action === 'update') {
        $id = (int)($input['id'] ?? 0);
        if (!$id) json_response(['error' => 'MISSING_ID'], 400);

        $updates = [];
        $params = [];
        if (isset($input['code'])) { $updates[] = "code = ?"; $params[] = trim($input['code']); }
        if (isset($input['name'])) { $updates[] = "name = ?"; $params[] = trim($input['name']); }
        if (isset($input['is_active'])) { $updates[] = "is_active = ?"; $params[] = (int)$input['is_active']; }
        if (empty($updates)) json_response(['error' => 'NOTHING_TO_UPDATE'], 400);

        $params[] = $id;
        $db->prepare("UPDATE warehouses SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
        json_response(['success' => true]);
      }

      if ($action === 'delete') {
        $id = (int)($input['id'] ?? 0);
        if (!$id) json_response(['error' => 'MISSING_ID'], 400);
        $db->prepare("DELETE FROM warehouses WHERE id = ?")->execute([$id]);
        json_response(['success' => true]);
      }
    }
    break;

  // ── Return Types ───────────────────────────
  case 'return_types':
    if ($method === 'GET') {
      $stmt = $db->query("
        SELECT rt.*, w.code AS warehouse_code, w.name AS warehouse_name
        FROM return_types rt
        LEFT JOIN warehouses w ON w.id = rt.default_warehouse_id
        ORDER BY rt.priority ASC, rt.id ASC
      ");
      json_response(['return_types' => $stmt->fetchAll()]);
    }
    if ($method === 'POST') {
      $input = json_input();
      $action = $input['action'] ?? 'create';

      if ($action === 'create') {
        $name = trim($input['name'] ?? '');
        $category = $input['category'] ?? 'return';
        $whId = !empty($input['default_warehouse_id']) ? (int)$input['default_warehouse_id'] : null;
        if (!$name) json_response(['error' => 'MISSING_FIELDS'], 400);

        $maxP = $db->query("SELECT COALESCE(MAX(priority), 0) + 1 AS next_p FROM return_types")->fetch();
        $stmt = $db->prepare("INSERT INTO return_types (name, category, default_warehouse_id, priority) VALUES (?, ?, ?, ?)");
        $stmt->execute([$name, $category, $whId, $maxP['next_p']]);
        json_response(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
      }

      if ($action === 'update') {
        $id = (int)($input['id'] ?? 0);
        if (!$id) json_response(['error' => 'MISSING_ID'], 400);

        $updates = [];
        $params = [];
        if (isset($input['name'])) { $updates[] = "name = ?"; $params[] = trim($input['name']); }
        if (isset($input['category'])) { $updates[] = "category = ?"; $params[] = $input['category']; }
        if (array_key_exists('default_warehouse_id', $input)) {
          $updates[] = "default_warehouse_id = ?";
          $params[] = $input['default_warehouse_id'] ? (int)$input['default_warehouse_id'] : null;
        }
        if (isset($input['is_active'])) { $updates[] = "is_active = ?"; $params[] = (int)$input['is_active']; }
        if (empty($updates)) json_response(['error' => 'NOTHING_TO_UPDATE'], 400);

        $params[] = $id;
        $db->prepare("UPDATE return_types SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
        json_response(['success' => true]);
      }

      if ($action === 'delete') {
        $id = (int)($input['id'] ?? 0);
        if (!$id) json_response(['error' => 'MISSING_ID'], 400);
        $db->prepare("DELETE FROM return_types WHERE id = ?")->execute([$id]);
        json_response(['success' => true]);
      }
    }
    break;

  // ── Reorder (drag & drop) ──────────────────
  case 'reorder':
    if ($method !== 'POST') json_response(['error' => 'Method not allowed'], 405);
    $input = json_input();
    $table = $input['table'] ?? '';
    $order = $input['order'] ?? []; // array of IDs in new order

    if (!in_array($table, ['warehouses', 'return_types'])) {
      json_response(['error' => 'INVALID_TABLE'], 400);
    }
    if (!is_array($order) || empty($order)) {
      json_response(['error' => 'EMPTY_ORDER'], 400);
    }

    $stmt = $db->prepare("UPDATE `$table` SET priority = ? WHERE id = ?");
    foreach ($order as $i => $id) {
      $stmt->execute([$i + 1, (int)$id]);
    }
    json_response(['success' => true]);
    break;

  default:
    json_response(['error' => 'Unknown type. Use: warehouses, return_types, reorder'], 400);
}
