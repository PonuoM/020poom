<?php
require_once __DIR__ . '/../config.php';
cors();
$currentUser = require_auth();

$pdo = db_connect();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
  $data = json_input();

  if (empty($data['item_id']) || empty($data['result'])) {
    json_response(['error' => 'VALIDATION', 'message' => 'กรุณาระบุรายการสินค้าและผลการตรวจ'], 400);
  }

  $pdo->beginTransaction();
  try {
    $itemId = (int)$data['item_id'];
    $causeIds = $data['cause_ids'] ?? [];

    // Get old status for logging
    $stmtOld = $pdo->prepare("SELECT status FROM return_items WHERE id = ?");
    $stmtOld->execute([$itemId]);
    $oldItem = $stmtOld->fetch();
    $oldStatus = $oldItem['status'] ?? '';

    // Build cause text from selected options
    $causeText = '';
    if (!empty($causeIds) && is_array($causeIds)) {
      $placeholders = implode(',', array_fill(0, count($causeIds), '?'));
      $stmt = $pdo->prepare("SELECT label FROM cause_options WHERE id IN ($placeholders) ORDER BY category_id, sort_order");
      $stmt->execute($causeIds);
      $labels = $stmt->fetchAll(PDO::FETCH_COLUMN);
      $causeText = implode(' ', $labels);
    }

    // Insert inspection
    $stmt = $pdo->prepare("
      INSERT INTO inspections (item_id, inspector_name, inspection_date, cause_ids, cause_text, extra_notes, result)
      VALUES (?, ?, CURDATE(), ?, ?, ?, ?)
    ");
    $stmt->execute([
      $itemId,
      $data['inspector_name'] ?? $currentUser['display_name'],
      json_encode($causeIds),
      $causeText,
      $data['extra_notes'] ?? null,
      $data['result']
    ]);

    // Update item status based on result
    $newStatus = 'inspecting';
    switch ($data['result']) {
      case 'repairable':
        $newStatus = 'reconditioning';
        // Also create reconditioning record
        $stmt = $pdo->prepare("INSERT INTO reconditioning (item_id, status) VALUES (?, 'pending')");
        $stmt->execute([$itemId]);
        break;
      case 'wait_parts':
        $newStatus = 'waiting_parts';
        break;
      case 'show_unit':
      case 'donate':
        $newStatus = 'completed';
        break;
    }

    $stmt = $pdo->prepare("UPDATE return_items SET status = ? WHERE id = ?");
    $stmt->execute([$newStatus, $itemId]);

    // Log status transition
    log_edit($pdo, 'return_items', $itemId, 'status', $oldStatus, $newStatus);

    $pdo->commit();
    json_response(['success' => true, 'message' => 'บันทึกผลตรวจสอบสำเร็จ', 'cause_text' => $causeText], 201);
  } catch (Throwable $e) {
    $pdo->rollBack();
    json_response(['error' => 'DB_ERROR', 'message' => $e->getMessage()], 500);
  }
}

json_response(['error' => 'Method not allowed'], 405);
