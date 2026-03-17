<?php
require_once __DIR__ . '/../config.php';
cors();
$currentUser = require_auth();

$pdo = db_connect();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $action = $_GET['action'] ?? '';

  // ── Check if warehouse requires approval ──
  if ($action === 'check_approval') {
    $warehouseCode = $_GET['warehouse_code'] ?? '';
    if (!$warehouseCode) {
      json_response(['error' => 'MISSING_PARAMS', 'message' => 'warehouse_code ต้องระบุ'], 400);
    }

    $stmt = $pdo->prepare("SELECT id, code, name, priority, is_active FROM warehouses WHERE code = ?");
    $stmt->execute([$warehouseCode]);
    $warehouse = $stmt->fetch();

    if (!$warehouse) {
      json_response(['needs_approval' => true, 'reason' => 'UNKNOWN_WAREHOUSE', 'warehouse' => null]);
    }

    $threshold = 3;
    $needsApproval = (int)$warehouse['priority'] > $threshold;

    json_response([
      'needs_approval' => $needsApproval,
      'warehouse' => $warehouse,
      'threshold' => $threshold,
      'reason' => $needsApproval
        ? "คลัง '{$warehouse['name']}' (ลำดับ {$warehouse['priority']}) ต้องขออนุมัติ (เกินลำดับ {$threshold})"
        : "คลัง '{$warehouse['name']}' (ลำดับ {$warehouse['priority']}) ไม่ต้องขออนุมัติ"
    ]);
  }

  // ── Auto-generate document number: A{พ.ศ.}{4-digit running} ──
  if ($action === 'next_number') {
    $buddhistYear = date('Y') + 543;
    $prefix = 'A' . $buddhistYear;
    $stmt = $pdo->prepare("SELECT batch_number FROM approval_batches WHERE batch_number LIKE ? ORDER BY batch_number DESC LIMIT 1");
    $stmt->execute([$prefix . '%']);
    $last = $stmt->fetchColumn();
    if ($last) {
      $lastNum = (int)substr($last, strlen($prefix));
      $next = $lastNum + 1;
    } else {
      $next = 1;
    }
    $nextNumber = $prefix . str_pad($next, 4, '0', STR_PAD_LEFT);
    json_response(['next_number' => $nextNumber]);
  }

  // ── Get warehouses that have pending items (not yet in any approval) ──
  if ($action === 'warehouses') {
    $stmt = $pdo->query("
      SELECT w.id, w.code, w.name, w.priority, COUNT(r.id) as pending_count
      FROM warehouses w
      INNER JOIN reconditioning r ON r.target_warehouse = w.code
        AND r.id NOT IN (SELECT recon_id FROM approval_items WHERE recon_id IS NOT NULL)
        AND r.target_warehouse IS NOT NULL
      WHERE w.is_active = 1 AND w.priority > 3
      GROUP BY w.id, w.code, w.name, w.priority
      HAVING pending_count > 0
      ORDER BY w.priority ASC
    ");
    json_response(['warehouses' => $stmt->fetchAll()]);
  }

  // ── Receipt list: receipts that have items going to approval-eligible warehouses ──
  if ($action === 'receipt_list') {
    $warehouseFilter = $_GET['warehouse'] ?? '';
    $sql = "
      SELECT DISTINCT rr.id, rr.receipt_number, rr.branch_name, rr.return_type,
             GROUP_CONCAT(r.id) as recon_ids
      FROM reconditioning r
      JOIN return_items ri ON r.item_id = ri.id
      JOIN return_receipts rr ON ri.receipt_id = rr.id
      LEFT JOIN warehouses w ON r.target_warehouse = w.code
      WHERE r.target_warehouse IS NOT NULL
        AND w.priority > 3
        AND r.id NOT IN (SELECT recon_id FROM approval_items WHERE recon_id IS NOT NULL)
    ";
    $params = [];
    if ($warehouseFilter) {
      $sql .= " AND r.target_warehouse = ?";
      $params[] = $warehouseFilter;
    }
    $sql .= " GROUP BY rr.id, rr.receipt_number, rr.branch_name, rr.return_type ORDER BY rr.receipt_number ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    json_response(['receipts' => $stmt->fetchAll()]);
  }

  // ── Receipt items: items from a specific receipt eligible for approval ──
  if ($action === 'receipt_items' && isset($_GET['receipt_id'])) {
    $receiptId = (int)$_GET['receipt_id'];
    $warehouseFilter = $_GET['warehouse'] ?? '';
    $sql = "
      SELECT r.id as recon_id, r.item_id, r.target_warehouse, r.cause_text,
             r.recon_doc_number, r.status as recon_status,
             ri.good_code, ri.good_name, ri.serial_number, ri.quantity, ri.class,
             w.name as warehouse_name, w.priority as warehouse_priority,
             rd.doc_number, rd.id as doc_id
      FROM reconditioning r
      JOIN return_items ri ON r.item_id = ri.id
      JOIN return_receipts rr ON ri.receipt_id = rr.id
      LEFT JOIN warehouses w ON r.target_warehouse = w.code
      LEFT JOIN recon_documents rd ON r.recon_doc_id = rd.id
      WHERE ri.receipt_id = ?
        AND r.target_warehouse IS NOT NULL
        AND w.priority > 3
        AND r.id NOT IN (SELECT recon_id FROM approval_items WHERE recon_id IS NOT NULL)
    ";
    $params = [$receiptId];
    if ($warehouseFilter) {
      $sql .= " AND r.target_warehouse = ?";
      $params[] = $warehouseFilter;
    }
    $sql .= " ORDER BY ri.good_code ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    json_response(['items' => $stmt->fetchAll()]);
  }

  // ── Pending items: recon items assigned to warehouse priority > 3, not yet in any approval ──
  if (isset($_GET['pending_items'])) {
    $stmt = $pdo->query("
      SELECT r.id as recon_id, r.item_id, r.target_warehouse, r.cause_text, r.inspector_name, r.parts_info,
             r.recon_doc_number, r.status as recon_status,
             ri.good_code, ri.good_name, ri.serial_number, ri.class,
             rr.receipt_number, rr.branch_name, rr.return_type,
             w.name as warehouse_name, w.priority as warehouse_priority,
             rd.doc_number, rd.id as doc_id
      FROM reconditioning r
      JOIN return_items ri ON r.item_id = ri.id
      JOIN return_receipts rr ON ri.receipt_id = rr.id
      LEFT JOIN warehouses w ON r.target_warehouse = w.code
      LEFT JOIN recon_documents rd ON r.recon_doc_id = rd.id
      WHERE r.target_warehouse IS NOT NULL
        AND w.priority > 3
        AND r.id NOT IN (SELECT recon_id FROM approval_items WHERE recon_id IS NOT NULL)
      ORDER BY r.created_at DESC
    ");
    $items = $stmt->fetchAll();
    json_response(['items' => $items]);
  }

  // ── Batch detail ──
  if (isset($_GET['batch_detail'])) {
    $batchId = (int)$_GET['batch_detail'];
    
    $stmt = $pdo->prepare("SELECT * FROM approval_batches WHERE id = ?");
    $stmt->execute([$batchId]);
    $batch = $stmt->fetch();
    if (!$batch) json_response(['error' => 'NOT_FOUND'], 404);

    $stmt = $pdo->prepare("
      SELECT ai.id as approval_item_id, ai.recon_id, ai.sales_reason, ai.team_reason,
             r.item_id, r.target_warehouse, r.cause_text, r.inspector_name, r.parts_info,
             r.recon_doc_number, r.status as recon_status,
             ri.good_code, ri.good_name, ri.serial_number, ri.class,
             rr.receipt_number, rr.branch_name, rr.return_type,
             w.name as warehouse_name
      FROM approval_items ai
      JOIN reconditioning r ON ai.recon_id = r.id
      JOIN return_items ri ON r.item_id = ri.id
      JOIN return_receipts rr ON ri.receipt_id = rr.id
      LEFT JOIN warehouses w ON r.target_warehouse = w.code
      WHERE ai.batch_id = ?
      ORDER BY ai.id ASC
    ");
    $stmt->execute([$batchId]);
    $items = $stmt->fetchAll();

    json_response(['batch' => $batch, 'items' => $items]);
  }
  // ── Round detail: all items for a specific warehouse + round ──
  if ($action === 'round_detail') {
    $warehouseCode = $_GET['warehouse'] ?? '';
    $roundNumber = isset($_GET['round']) ? (int)$_GET['round'] : 0;
    if (!$warehouseCode || !$roundNumber) {
      json_response(['error' => 'MISSING_PARAMS', 'message' => 'ต้องระบุ warehouse และ round'], 400);
    }

    // Get all batches in this round+warehouse
    $stmt = $pdo->prepare("SELECT * FROM approval_batches WHERE batch_type = ? AND submission_round = ? ORDER BY id ASC");
    $stmt->execute([$warehouseCode, $roundNumber]);
    $batches = $stmt->fetchAll();

    if (empty($batches)) {
      json_response(['error' => 'NOT_FOUND', 'message' => 'ไม่พบข้อมูลครั้งที่ ' . $roundNumber], 404);
    }

    $batchIds = array_column($batches, 'id');
    $placeholders = implode(',', array_fill(0, count($batchIds), '?'));

    $stmt = $pdo->prepare("
      SELECT ai.id as approval_item_id, ai.recon_id, ai.batch_id, ai.sales_reason, ai.team_reason,
             r.item_id, r.target_warehouse, r.cause_text, r.inspector_name, r.parts_info,
             r.recon_doc_number, r.status as recon_status,
             ri.good_code, ri.good_name, ri.serial_number, ri.class, ri.quantity,
             rr.receipt_number, rr.branch_name, rr.return_type,
             w.name as warehouse_name,
             ab.batch_number
      FROM approval_items ai
      JOIN reconditioning r ON ai.recon_id = r.id
      JOIN return_items ri ON r.item_id = ri.id
      JOIN return_receipts rr ON ri.receipt_id = rr.id
      LEFT JOIN warehouses w ON r.target_warehouse = w.code
      JOIN approval_batches ab ON ai.batch_id = ab.id
      WHERE ai.batch_id IN ($placeholders)
      ORDER BY rr.receipt_number ASC, ri.good_code ASC
    ");
    $stmt->execute($batchIds);
    $items = $stmt->fetchAll();

    // Summary
    $totalItems = count($items);
    $allStatus = array_unique(array_column($batches, 'status'));

    // Get real warehouse name
    $stmtW = $pdo->prepare("SELECT name FROM warehouses WHERE code = ? LIMIT 1");
    $stmtW->execute([$warehouseCode]);
    $realWName = $stmtW->fetchColumn() ?: $warehouseCode;

    json_response([
      'batches' => $batches,
      'items' => $items,
      'round' => $roundNumber,
      'warehouse' => $warehouseCode,
      'warehouse_name' => $realWName,
      'total_items' => $totalItems,
      'overall_status' => count($allStatus) === 1 ? $allStatus[0] : 'mixed'
    ]);
  }

  // ── List batches with item counts ──
  $stmt = $pdo->query("
    SELECT ab.*, COUNT(ai.id) as item_count, w.name as warehouse_name
    FROM approval_batches ab
    LEFT JOIN approval_items ai ON ai.batch_id = ab.id
    LEFT JOIN warehouses w ON ab.batch_type = w.code
    GROUP BY ab.id
    ORDER BY ab.batch_type ASC, ab.batch_date ASC, ab.id ASC
  ");
  $batches = $stmt->fetchAll();

  json_response(['batches' => $batches]);
}

if ($method === 'POST') {
  $data = json_input();
  $action = $_GET['action'] ?? '';

  // ── Assign batches to a submission round ──
  if ($action === 'assign_round') {
    $batchIds = $data['batch_ids'] ?? [];
    $roundNumber = isset($data['round_number']) ? (int)$data['round_number'] : null;
    $warehouseCode = $data['warehouse_code'] ?? null;
    if (empty($batchIds)) {
      json_response(['error' => 'MISSING_PARAMS', 'message' => 'ต้องระบุ batch_ids'], 400);
    }
    // Auto-generate round number per warehouse if not provided
    if (!$roundNumber) {
      if ($warehouseCode) {
        $stmt = $pdo->prepare("SELECT COALESCE(MAX(submission_round), 0) + 1 FROM approval_batches WHERE batch_type = ?");
        $stmt->execute([$warehouseCode]);
      } else {
        $stmt = $pdo->query("SELECT COALESCE(MAX(submission_round), 0) + 1 FROM approval_batches");
      }
      $roundNumber = (int)$stmt->fetchColumn();
    }
    // Validate: check round doesn't already exist for this warehouse
    if ($warehouseCode) {
      $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM approval_batches WHERE batch_type = ? AND submission_round = ?");
      $stmtCheck->execute([$warehouseCode, $roundNumber]);
      if ((int)$stmtCheck->fetchColumn() > 0) {
        json_response(['error' => 'DUPLICATE_ROUND', 'message' => "ครั้งที่ {$roundNumber} สำหรับคลัง {$warehouseCode} ถูกใช้แล้ว"], 400);
      }
    }
    $placeholders = implode(',', array_fill(0, count($batchIds), '?'));
    $stmt = $pdo->prepare("UPDATE approval_batches SET submission_round = ? WHERE id IN ($placeholders)");
    $params = array_merge([$roundNumber], array_map('intval', $batchIds));
    $stmt->execute($params);
    json_response(['success' => true, 'round_number' => $roundNumber, 'updated' => $stmt->rowCount()]);
  }

  // ── Remove round assignment ──
  if ($action === 'unassign_round') {
    $batchIds = $data['batch_ids'] ?? [];
    if (empty($batchIds)) {
      json_response(['error' => 'MISSING_PARAMS'], 400);
    }
    $placeholders = implode(',', array_fill(0, count($batchIds), '?'));
    $stmt = $pdo->prepare("UPDATE approval_batches SET submission_round = NULL WHERE id IN ($placeholders)");
    $stmt->execute(array_map('intval', $batchIds));
    json_response(['success' => true, 'updated' => $stmt->rowCount()]);
  }

  // ── Approve entire round (all batches in warehouse+round) ──
  if ($action === 'approve_round') {
    $warehouseCode = $data['warehouse_code'] ?? '';
    $roundNumber = isset($data['round_number']) ? (int)$data['round_number'] : 0;
    if (!$warehouseCode || !$roundNumber) {
      json_response(['error' => 'MISSING_PARAMS', 'message' => 'ต้องระบุ warehouse_code และ round_number'], 400);
    }
    $stmt = $pdo->prepare("UPDATE approval_batches SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE batch_type = ? AND submission_round = ?");
    $stmt->execute([$currentUser['name'] ?? 'ผู้ดูแลระบบ', $warehouseCode, $roundNumber]);
    json_response(['success' => true, 'updated' => $stmt->rowCount(), 'approved_by' => $currentUser['name'] ?? 'ผู้ดูแลระบบ']);
  }

  // ── Reject entire round ──
  if ($action === 'reject_round') {
    $warehouseCode = $data['warehouse_code'] ?? '';
    $roundNumber = isset($data['round_number']) ? (int)$data['round_number'] : 0;
    $reason = $data['reason'] ?? '';
    if (!$warehouseCode || !$roundNumber) {
      json_response(['error' => 'MISSING_PARAMS', 'message' => 'ต้องระบุ warehouse_code และ round_number'], 400);
    }
    $stmt = $pdo->prepare("UPDATE approval_batches SET status = 'rejected', approved_by = ?, approved_at = NOW() WHERE batch_type = ? AND submission_round = ?");
    $stmt->execute([$currentUser['name'] ?? 'ผู้ดูแลระบบ', $warehouseCode, $roundNumber]);
    json_response(['success' => true, 'updated' => $stmt->rowCount()]);
  }

  // ── Add items to existing batch ──
  if ($action === 'add_items') {
    $batchId = (int)($data['batch_id'] ?? 0);
    $reconIds = $data['recon_ids'] ?? [];
    if (!$batchId || empty($reconIds)) {
      json_response(['error' => 'MISSING_PARAMS', 'message' => 'ต้องระบุ batch_id และ recon_ids'], 400);
    }

    // Get batch warehouse to validate
    $stmtBatch = $pdo->prepare("SELECT batch_type FROM approval_batches WHERE id = ?");
    $stmtBatch->execute([$batchId]);
    $batchWarehouse = $stmtBatch->fetchColumn();

    // Validate warehouse match
    if ($batchWarehouse) {
      $placeholders = implode(',', array_fill(0, count($reconIds), '?'));
      $stmtCheck = $pdo->prepare("SELECT r.id, r.target_warehouse FROM reconditioning r WHERE r.id IN ($placeholders) AND r.target_warehouse != ?");
      $checkParams = array_map('intval', $reconIds);
      $checkParams[] = $batchWarehouse;
      $stmtCheck->execute($checkParams);
      $mismatched = $stmtCheck->fetchAll();
      if (!empty($mismatched)) {
        $whList = implode(', ', array_column($mismatched, 'target_warehouse'));
        json_response(['error' => 'WAREHOUSE_MISMATCH', 'message' => "รายการคลังไม่ตรงกับหัวเอกสาร ({$batchWarehouse}) พบ: {$whList}"], 400);
      }
    }

    $stmtRecon = $pdo->prepare("SELECT item_id FROM reconditioning WHERE id = ?");
    $stmt = $pdo->prepare("INSERT INTO approval_items (batch_id, item_id, recon_id) VALUES (?, ?, ?)");
    $added = 0;
    foreach ($reconIds as $rid) {
      try {
        $stmtRecon->execute([(int)$rid]);
        $reconRow = $stmtRecon->fetch();
        $itemId = $reconRow ? (int)$reconRow['item_id'] : 0;
        $stmt->execute([$batchId, $itemId, (int)$rid]);
        $added++;
      } catch (Throwable $e) { /* skip duplicates */ }
    }

    json_response(['success' => true, 'added' => $added, 'message' => "เพิ่ม {$added} รายการสำเร็จ"]);
  }

  // ── Create new batch ──
  if (empty($data['batch_number']) || empty($data['batch_type'])) {
    json_response(['error' => 'VALIDATION', 'message' => 'กรุณากรอกข้อมูลให้ครบ'], 400);
  }

  try {
    $stmt = $pdo->prepare("
      INSERT INTO approval_batches (batch_number, batch_type, batch_date, status, notes)
      VALUES (?, ?, ?, 'pending', ?)
    ");
    $stmt->execute([
      $data['batch_number'],
      $data['batch_type'],
      $data['batch_date'] ?? date('Y-m-d'),
      $data['notes'] ?? null
    ]);

    $batchId = $pdo->lastInsertId();

    // Auto-add recon items if provided
    $reasons = $data['reasons'] ?? []; // {recon_id: "reason text"}
    if (!empty($data['recon_ids']) && is_array($data['recon_ids'])) {
      // Validate warehouse match for all recon items
      $batchWarehouse = $data['batch_type'] ?? '';
      if ($batchWarehouse && count($data['recon_ids']) > 0) {
        $placeholders = implode(',', array_fill(0, count($data['recon_ids']), '?'));
        $stmtCheck = $pdo->prepare("SELECT r.id, r.target_warehouse FROM reconditioning r WHERE r.id IN ($placeholders) AND r.target_warehouse != ?");
        $checkParams = array_map('intval', $data['recon_ids']);
        $checkParams[] = $batchWarehouse;
        $stmtCheck->execute($checkParams);
        $mismatched = $stmtCheck->fetchAll();
        if (!empty($mismatched)) {
          $whList = implode(', ', array_column($mismatched, 'target_warehouse'));
          // Rollback by deleting the batch we just created
          $pdo->prepare("DELETE FROM approval_batches WHERE id = ?")->execute([$batchId]);
          json_response(['error' => 'WAREHOUSE_MISMATCH', 'message' => "รายการคลังไม่ตรงกับหัวเอกสาร ({$batchWarehouse}) พบ: {$whList}"], 400);
        }
      }

      $stmtRecon = $pdo->prepare("SELECT item_id FROM reconditioning WHERE id = ?");
      $stmtInsert = $pdo->prepare("INSERT INTO approval_items (batch_id, item_id, recon_id, sales_reason) VALUES (?, ?, ?, ?)");
      foreach ($data['recon_ids'] as $reconId) {
        $stmtRecon->execute([(int)$reconId]);
        $reconRow = $stmtRecon->fetch();
        $itemId = $reconRow ? (int)$reconRow['item_id'] : 0;
        $reason = $reasons[(string)$reconId] ?? $reasons[(int)$reconId] ?? null;
        $stmtInsert->execute([$batchId, $itemId, (int)$reconId, $reason]);
      }
    }

    log_edit($pdo, 'approval_batches', $batchId, 'status', '', 'pending');

    json_response(['success' => true, 'id' => $batchId, 'message' => 'สร้างชุดขออนุมัติสำเร็จ'], 201);
  } catch (Throwable $e) {
    json_response(['error' => 'DB_ERROR', 'message' => $e->getMessage()], 500);
  }
}

if ($method === 'PUT') {
  $data = json_input();
  $action = $_GET['action'] ?? '';

  // ── Update individual item reason ──
  if ($action === 'update_reason') {
    $approvalItemId = (int)($data['approval_item_id'] ?? 0);
    $reason = $data['reason'] ?? '';
    if (!$approvalItemId) json_response(['error' => 'MISSING_ID'], 400);
    $stmt = $pdo->prepare("UPDATE approval_items SET sales_reason = ? WHERE id = ?");
    $stmt->execute([$reason, $approvalItemId]);
    json_response(['success' => true, 'message' => 'อัปเดตหมายเหตุสำเร็จ']);
  }

  $batchId = (int)($data['id'] ?? 0);
  if (!$batchId) json_response(['error' => 'MISSING_ID'], 400);

  $stmtOld = $pdo->prepare("SELECT * FROM approval_batches WHERE id = ?");
  $stmtOld->execute([$batchId]);
  $oldRow = $stmtOld->fetch();
  if (!$oldRow) json_response(['error' => 'NOT_FOUND'], 404);

  $updates = [];
  $params = [];

  if (isset($data['status'])) {
    $updates[] = "status = ?";
    $params[] = $data['status'];

    if ($data['status'] === 'approved') {
      $updates[] = "approved_by = ?";
      $updates[] = "approved_date = CURDATE()";
      $params[] = $currentUser['display_name'];
    }
  }
  if (isset($data['notes'])) {
    $updates[] = "notes = ?";
    $params[] = $data['notes'];
  }

  if (!empty($updates)) {
    $params[] = $batchId;
    $pdo->prepare("UPDATE approval_batches SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
  }

  log_edits($pdo, 'approval_batches', $batchId, $oldRow, $data, ['status', 'notes']);

  json_response(['success' => true, 'message' => 'อัปเดตสำเร็จ']);
}

if ($method === 'DELETE') {
  $data = json_input();
  $action = $_GET['action'] ?? '';

  // ── Delete entire batch (items freed for reuse) ──
  if ($action === 'delete_batch') {
    $batchId = (int)($data['batch_id'] ?? 0);
    if (!$batchId) json_response(['error' => 'MISSING_ID'], 400);

    // Delete all items first (CASCADE should handle this, but be explicit)
    $pdo->prepare("DELETE FROM approval_items WHERE batch_id = ?")->execute([$batchId]);
    $pdo->prepare("DELETE FROM approval_batches WHERE id = ?")->execute([$batchId]);

    json_response(['success' => true, 'message' => 'ลบเอกสารสำเร็จ']);
  }

  // ── Delete single item ──
  $approvalItemId = (int)($data['approval_item_id'] ?? 0);
  if (!$approvalItemId) json_response(['error' => 'MISSING_ID'], 400);

  $stmt = $pdo->prepare("DELETE FROM approval_items WHERE id = ?");
  $stmt->execute([$approvalItemId]);

  json_response(['success' => true, 'message' => 'ลบรายการสำเร็จ']);
}

json_response(['error' => 'Method not allowed'], 405);
