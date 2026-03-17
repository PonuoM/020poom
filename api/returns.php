<?php
require_once __DIR__ . '/../config.php';
cors();
$currentUser = require_auth();

$pdo = db_connect();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  // Single receipt detail
  if (isset($_GET['id'])) {
    $id = (int)$_GET['id'];
    $stmt = $pdo->prepare("SELECT * FROM return_receipts WHERE id = ?");
    $stmt->execute([$id]);
    $receipt = $stmt->fetch();
    if (!$receipt) json_response(['error' => 'NOT_FOUND', 'message' => 'ไม่พบใบรับคืน'], 404);

    $stmt = $pdo->prepare("SELECT * FROM return_items WHERE receipt_id = ? ORDER BY id");
    $stmt->execute([$id]);
    $items = $stmt->fetchAll();

    json_response(['receipt' => $receipt, 'items' => $items]);
  }

  // Filter by item status
  if (isset($_GET['status'])) {
    $statuses = explode(',', $_GET['status']);
    $placeholders = implode(',', array_fill(0, count($statuses), '?'));
    $stmt = $pdo->prepare("
      SELECT ri.*, rr.receipt_number, rr.return_date, rr.branch_name
      FROM return_items ri
      JOIN return_receipts rr ON ri.receipt_id = rr.id
      WHERE ri.status IN ($placeholders)
      ORDER BY ri.created_at DESC
    ");
    $stmt->execute($statuses);
    json_response(['items' => $stmt->fetchAll()]);
  }

  // All items (flat view)
  if (isset($_GET['all_items'])) {
    $stmt = $pdo->query("
      SELECT ri.*, rr.receipt_number, rr.return_date, rr.branch_name, rr.return_type, rr.warehouse,
             rr.id as receipt_id
      FROM return_items ri
      JOIN return_receipts rr ON ri.receipt_id = rr.id
      ORDER BY rr.return_date DESC, rr.id DESC, ri.id ASC
    ");
    json_response(['items' => $stmt->fetchAll()]);
  }

  // List all receipts with item count + filled count + confirmed count
  $stmt = $pdo->query("
    SELECT rr.*, 
      COUNT(ri.id) as item_count,
      SUM(CASE WHEN ri.sales_conditions IS NOT NULL AND ri.sales_conditions != '' THEN 1 ELSE 0 END) as filled_count,
      SUM(CASE WHEN ri.is_confirmed = 1 THEN 1 ELSE 0 END) as confirmed_count
    FROM return_receipts rr
    LEFT JOIN return_items ri ON ri.receipt_id = rr.id
    GROUP BY rr.id
    ORDER BY rr.return_date DESC, rr.id DESC
  ");
  json_response(['items' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
  $data = json_input();

  if (empty($data['receipt_number']) || empty($data['return_date'])) {
    json_response(['error' => 'VALIDATION', 'message' => 'กรุณากรอกเลขที่ใบรับคืนและวันที่'], 400);
  }

  $pdo->beginTransaction();
  try {
    // Insert receipt
    $stmt = $pdo->prepare("
      INSERT INTO return_receipts (receipt_number, return_date, branch_name, return_type, warehouse, document_number, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
      $data['receipt_number'],
      $data['return_date'],
      $data['branch_name'] ?? null,
      $data['return_type'] ?? null,
      $data['warehouse'] ?? null,
      $data['document_number'] ?? null,
      $data['notes'] ?? null
    ]);
    $receiptId = $pdo->lastInsertId();

    // Insert items (with class auto-lookup from products)
    if (!empty($data['items']) && is_array($data['items'])) {
      $stmtItem = $pdo->prepare("
        INSERT INTO return_items (receipt_id, good_code, good_name, class, quantity, status)
        VALUES (?, ?, ?, ?, ?, 'received')
      ");
      $stmtLookup = $pdo->prepare("SELECT class FROM products WHERE good_code = ? LIMIT 1");

      foreach ($data['items'] as $item) {
        $code = $item['good_code'] ?? '';

        // Auto-lookup class from products table
        $class = null;
        if ($code) {
          $stmtLookup->execute([$code]);
          $prod = $stmtLookup->fetch();
          if ($prod && !empty($prod['class'])) {
            $class = $prod['class'];
          }
        }

        $stmtItem->execute([
          $receiptId,
          $code,
          $item['good_name'] ?? '',
          $class,
          (int)($item['quantity'] ?? 1)
        ]);
      }
    }

    $pdo->commit();
    json_response(['success' => true, 'id' => $receiptId, 'message' => 'บันทึกสำเร็จ'], 201);
  } catch (Throwable $e) {
    $pdo->rollBack();
    json_response(['error' => 'DB_ERROR', 'message' => $e->getMessage()], 500);
  }
}

if ($method === 'PATCH') {
  $data = json_input();

  // ── Confirm ALL items of a receipt (from list page checkbox) ──
  if (!empty($data['confirm_all_receipt'])) {
    $receiptId = (int)$data['confirm_all_receipt'];
    // Get all unconfirmed items
    $items = $pdo->prepare("SELECT id FROM return_items WHERE receipt_id = ? AND is_confirmed = 0");
    $items->execute([$receiptId]);
    $ids = $items->fetchAll(PDO::FETCH_COLUMN);

    $stmt = $pdo->prepare("UPDATE return_items SET is_confirmed = 1, confirmed_by = ?, confirmed_at = NOW() WHERE receipt_id = ? AND is_confirmed = 0");
    $stmt->execute([$currentUser['id'], $receiptId]);
    $count = $stmt->rowCount();

    // Also create inspection records for each confirmed item
    $stmtInsp = $pdo->prepare("
      INSERT INTO inspections (item_id, inspector_name, inspection_date, cause_ids, cause_text, extra_notes, result)
      SELECT ?, ?, CURDATE(), '[]', '', '', 'confirmed'
      FROM dual WHERE NOT EXISTS (SELECT 1 FROM inspections WHERE item_id = ?)
    ");
    foreach ($ids as $itemId) {
      log_edit($pdo, 'return_items', (int)$itemId, 'is_confirmed', '0', '1');
      try {
        $stmtInsp->execute([(int)$itemId, $currentUser['display_name'], (int)$itemId]);
      } catch (Throwable $e) { /* skip if already exists */ }
    }

    json_response(['success' => true, 'confirmed' => $count, 'message' => "ยืนยันทั้งหมด {$count} รายการ"]);
  }

  // ── Unconfirm ALL items of a receipt ──
  if (!empty($data['unconfirm_all_receipt'])) {
    $receiptId = (int)$data['unconfirm_all_receipt'];
    $items = $pdo->prepare("SELECT id FROM return_items WHERE receipt_id = ? AND is_confirmed = 1");
    $items->execute([$receiptId]);
    $ids = $items->fetchAll(PDO::FETCH_COLUMN);

    $stmt = $pdo->prepare("UPDATE return_items SET is_confirmed = 0, confirmed_by = NULL, confirmed_at = NULL WHERE receipt_id = ? AND is_confirmed = 1");
    $stmt->execute([$receiptId]);
    $count = $stmt->rowCount();

    foreach ($ids as $itemId) {
      log_edit($pdo, 'return_items', (int)$itemId, 'is_confirmed', '1', '0');
    }

    json_response(['success' => true, 'unconfirmed' => $count, 'message' => "ยกเลิกยืนยัน {$count} รายการ"]);
  }

  // ══════════════════════════════════════════════════════
  // ── Unified save_all: process ALL changes in one call ──
  // ══════════════════════════════════════════════════════
  if (!empty($data['save_all'])) {
    $payload = $data['save_all'];
    $summary = [];

    // 1) Update good_code (and auto-lookup name + class)
    if (!empty($payload['update_items']) && is_array($payload['update_items'])) {
      $stmtGet = $pdo->prepare("SELECT * FROM return_items WHERE id = ?");
      $stmtLookup = $pdo->prepare("SELECT good_name, class FROM products WHERE good_code = ? LIMIT 1");
      $cnt = 0;

      foreach ($payload['update_items'] as $item) {
        $id = (int)($item['id'] ?? 0);
        $newCode = trim($item['good_code'] ?? '');
        if (!$id || !$newCode) continue;

        try {
          $stmtGet->execute([$id]);
          $oldRow = $stmtGet->fetch();
          if (!$oldRow) continue;

          $stmtLookup->execute([$newCode]);
          $prod = $stmtLookup->fetch();

          $newName  = $prod ? $prod['good_name'] : $oldRow['good_name'];
          $newClass = $prod ? ($prod['class'] ?? $oldRow['class']) : $oldRow['class'];

          $pdo->prepare("UPDATE return_items SET good_code = ?, good_name = ?, class = ? WHERE id = ?")
              ->execute([$newCode, $newName, $newClass, $id]);
          $cnt++;

          log_edit($pdo, 'return_items', $id, 'good_code', $oldRow['good_code'], $newCode);
          log_edit($pdo, 'return_items', $id, 'good_name', $oldRow['good_name'], $newName);
          log_edit($pdo, 'return_items', $id, 'class', $oldRow['class'] ?? '', $newClass ?? '');
        } catch (Throwable $e) { /* skip */ }
      }
      if ($cnt) $summary[] = "แก้ไขรหัส {$cnt} รายการ";
    }

    // 2) Update sales_conditions
    if (!empty($payload['update_conditions']) && is_array($payload['update_conditions'])) {
      $stmtGet = $pdo->prepare("SELECT id, sales_conditions FROM return_items WHERE id = ?");
      $stmtUpd = $pdo->prepare("UPDATE return_items SET sales_conditions = ? WHERE id = ?");
      $cnt = 0;

      foreach ($payload['update_conditions'] as $item) {
        $id = (int)($item['id'] ?? 0);
        $conditions = trim($item['sales_conditions'] ?? '');
        if (!$id) continue;

        try {
          $stmtGet->execute([$id]);
          $oldRow = $stmtGet->fetch();
          $oldVal = $oldRow ? ($oldRow['sales_conditions'] ?? '') : '';

          $stmtUpd->execute([$conditions ?: null, $id]);
          $cnt++;
          log_edit($pdo, 'return_items', $id, 'sales_conditions', $oldVal, $conditions);
        } catch (Throwable $e) { /* skip */ }
      }
      if ($cnt) $summary[] = "อัปเดตเงื่อนไข {$cnt} รายการ";
    }

    // 2a) Update serial_numbers
    if (!empty($payload['update_serial_numbers']) && is_array($payload['update_serial_numbers'])) {
      $stmtGet = $pdo->prepare("SELECT id, serial_number FROM return_items WHERE id = ?");
      $stmtUpd = $pdo->prepare("UPDATE return_items SET serial_number = ? WHERE id = ?");
      $cnt = 0;

      foreach ($payload['update_serial_numbers'] as $item) {
        $id = (int)($item['id'] ?? 0);
        $sn = trim($item['serial_number'] ?? '');
        if (!$id) continue;

        try {
          $stmtGet->execute([$id]);
          $oldRow = $stmtGet->fetch();
          $oldVal = $oldRow ? ($oldRow['serial_number'] ?? '') : '';

          $stmtUpd->execute([$sn ?: null, $id]);
          $cnt++;
          log_edit($pdo, 'return_items', $id, 'serial_number', $oldVal, $sn);
        } catch (Throwable $e) { /* skip */ }
      }
      if ($cnt) $summary[] = "อัปเดต SN {$cnt} รายการ";
    }

    // 3) Confirm items
    if (!empty($payload['confirm_items']) && is_array($payload['confirm_items'])) {
      $stmtConfirm = $pdo->prepare("UPDATE return_items SET is_confirmed = 1, confirmed_by = ?, confirmed_at = NOW() WHERE id = ? AND is_confirmed = 0");
      $stmtInsp = $pdo->prepare("
        INSERT INTO inspections (item_id, inspector_name, inspection_date, cause_ids, cause_text, extra_notes, result)
        SELECT ?, ?, CURDATE(), '[]', '', '', 'confirmed'
        FROM dual WHERE NOT EXISTS (SELECT 1 FROM inspections WHERE item_id = ?)
      ");
      $cnt = 0;

      foreach ($payload['confirm_items'] as $itemId) {
        try {
          $stmtConfirm->execute([$currentUser['id'], (int)$itemId]);
          if ($stmtConfirm->rowCount() > 0) {
            $cnt++;
            log_edit($pdo, 'return_items', (int)$itemId, 'is_confirmed', '0', '1');
            try {
              $stmtInsp->execute([(int)$itemId, $currentUser['display_name'], (int)$itemId]);
            } catch (Throwable $e) { /* skip if already exists */ }
          }
        } catch (Throwable $e) { /* skip */ }
      }
      if ($cnt) $summary[] = "ยืนยัน {$cnt} รายการ";
    }

    if (empty($summary)) {
      json_response(['success' => true, 'message' => 'ไม่มีการเปลี่ยนแปลง']);
    }

    json_response([
      'success' => true,
      'message' => implode(' / ', $summary)
    ]);
  }

  // ── Unconfirm items (separate — used by individual badge click) ──
  if (!empty($data['unconfirm_items']) && is_array($data['unconfirm_items'])) {
    $stmt = $pdo->prepare("UPDATE return_items SET is_confirmed = 0, confirmed_by = NULL, confirmed_at = NULL WHERE id = ?");
    $count = 0;

    foreach ($data['unconfirm_items'] as $itemId) {
      try {
        $stmt->execute([(int)$itemId]);
        $count++;
        log_edit($pdo, 'return_items', (int)$itemId, 'is_confirmed', '1', '0');
      } catch (Throwable $e) { /* skip */ }
    }

    json_response([
      'success' => true,
      'unconfirmed' => $count,
      'message' => "ยกเลิกยืนยัน {$count} รายการ"
    ]);
  }
  // ── Split Item (duplicate row for separate SN) ──
  if (!empty($data['split_item'])) {
    $itemId = (int)$data['split_item'];
    $stmt = $pdo->prepare("SELECT * FROM return_items WHERE id = ?");
    $stmt->execute([$itemId]);
    $orig = $stmt->fetch();
    if (!$orig) json_response(['error' => 'NOT_FOUND', 'message' => 'ไม่พบรายการ'], 404);

    // Insert duplicate with quantity=1, no SN
    $stmtInsert = $pdo->prepare("
      INSERT INTO return_items (receipt_id, product_id, good_code, good_name, class, quantity, serial_number, run_name, status, notes, sales_conditions)
      VALUES (?, ?, ?, ?, ?, 1, NULL, ?, ?, ?, ?)
    ");
    $stmtInsert->execute([
      $orig['receipt_id'],
      $orig['product_id'],
      $orig['good_code'],
      $orig['good_name'],
      $orig['class'],
      $orig['run_name'],
      $orig['status'],
      $orig['notes'],
      $orig['sales_conditions']
    ]);
    $newId = $pdo->lastInsertId();

    // If original quantity > 1, reduce it by 1
    if (($orig['quantity'] ?? 1) > 1) {
      $pdo->prepare("UPDATE return_items SET quantity = quantity - 1 WHERE id = ?")->execute([$itemId]);
    }

    json_response(['success' => true, 'new_id' => $newId, 'message' => 'แยกแถวสำเร็จ']);
  }

  json_response(['error' => 'VALIDATION', 'message' => 'ไม่พบข้อมูลที่ต้องอัปเดต'], 400);
}

json_response(['error' => 'Method not allowed'], 405);

