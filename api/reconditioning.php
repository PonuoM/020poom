<?php
require_once __DIR__ . '/../config.php';
cors();
$currentUser = require_auth();

$pdo = db_connect();
$method = $_SERVER['REQUEST_METHOD'];

// =============================================
// GET — Multiple query modes
// =============================================
if ($method === 'GET') {

  // Mode 1: Get single document detail + its items
  if (isset($_GET['doc_id'])) {
    $docId = (int)$_GET['doc_id'];
    $doc = $pdo->prepare("SELECT * FROM recon_documents WHERE id = ?");
    $doc->execute([$docId]);
    $document = $doc->fetch();
    if (!$document) {
      json_response(['error' => 'NOT_FOUND'], 404);
    }

    // Get items in this document with product + receipt info
    $items = $pdo->prepare("
      SELECT r.*, ri.good_code, ri.good_name, ri.quantity, ri.class,
             ri.serial_number,
             ri.sales_conditions, ri.notes as item_notes,
             rr.receipt_number, rr.branch_name, rr.return_date, rr.return_type
      FROM reconditioning r
      JOIN return_items ri ON r.item_id = ri.id
      JOIN return_receipts rr ON ri.receipt_id = rr.id
      WHERE r.recon_doc_id = ?
      ORDER BY r.created_at ASC
    ");
    $items->execute([$docId]);
    json_response(['document' => $document, 'items' => $items->fetchAll()]);
  }

  // Mode 2: Get receipt items NOT yet in reconditioning
  if (isset($_GET['receipt_items'])) {
    $receiptId = (int)$_GET['receipt_items'];
    $stmt = $pdo->prepare("
      SELECT ri.id, ri.good_code, ri.good_name, ri.quantity, ri.class,
             ri.serial_number, ri.sales_conditions, ri.notes as item_notes
      FROM return_items ri
      WHERE ri.receipt_id = ?
        AND ri.id NOT IN (SELECT item_id FROM reconditioning)
      ORDER BY ri.id
    ");
    $stmt->execute([$receiptId]);
    json_response(['items' => $stmt->fetchAll()]);
  }

  // Mode 3: Get distinct inspector names for autocomplete
  if (isset($_GET['inspectors'])) {
    $stmt = $pdo->query("
      SELECT DISTINCT inspector_name FROM recon_documents
      WHERE inspector_name IS NOT NULL AND inspector_name != ''
      UNION
      SELECT DISTINCT inspector_name FROM reconditioning
      WHERE inspector_name IS NOT NULL AND inspector_name != ''
      ORDER BY inspector_name
    ");
    $names = array_column($stmt->fetchAll(), 'inspector_name');
    json_response(['inspectors' => $names]);
  }

  // Mode 3b: Get warehouses list
  if (isset($_GET['warehouses'])) {
    $stmt = $pdo->query("SELECT code, name FROM warehouses WHERE is_active = 1 ORDER BY priority ASC");
    json_response(['warehouses' => $stmt->fetchAll()]);
  }

  // Mode 4: Get receipts with remaining items
  if (isset($_GET['available_receipts'])) {
    $stmt = $pdo->query("
      SELECT rr.id, rr.receipt_number, rr.return_date, rr.branch_name, rr.return_type,
             COUNT(ri.id) as remaining_items
      FROM return_receipts rr
      JOIN return_items ri ON ri.receipt_id = rr.id
      WHERE ri.id NOT IN (SELECT item_id FROM reconditioning)
      GROUP BY rr.id
      HAVING remaining_items > 0
      ORDER BY rr.return_date DESC
    ");
    json_response(['receipts' => $stmt->fetchAll()]);
  }

  // Mode 5: Get next auto-generated document number (RTV{BE year}-{5 digits})
  if (isset($_GET['next_doc_number'])) {
    $beYear = date('Y') + 543; // Buddhist Era year
    $prefix = "RTV{$beYear}-";

    $stmt = $pdo->prepare("
      SELECT doc_number FROM recon_documents
      WHERE doc_number LIKE ?
      ORDER BY doc_number DESC
      LIMIT 1
    ");
    $stmt->execute([$prefix . '%']);
    $last = $stmt->fetchColumn();

    if ($last) {
      // Extract the running number part after the dash
      $parts = explode('-', $last);
      $nextNum = intval(end($parts)) + 1;
    } else {
      $nextNum = 1;
    }

    $nextDocNumber = $prefix . str_pad($nextNum, 5, '0', STR_PAD_LEFT);
    json_response(['next_doc_number' => $nextDocNumber]);
  }

  // Mode 7: Master list — all items across all documents
  if (isset($_GET['master_list'])) {
    $stmt = $pdo->query("
      SELECT r.id as recon_id, r.target_warehouse, r.cause_text, r.parts_info,
             r.inspector_name as recon_inspector, r.status as recon_status,
             r.start_date, r.end_date, r.created_at as recon_created,
             COALESCE(r.transferred, 0) as transferred,
             ri.good_code, ri.good_name, ri.quantity, ri.class, ri.serial_number,
             ri.sales_conditions, ri.notes as item_notes,
             rr.receipt_number, rr.branch_name, rr.return_date, rr.return_type,
             d.doc_number, d.created_at as doc_created, d.return_date as doc_return_date,
             d.id as doc_id
      FROM reconditioning r
      JOIN return_items ri ON r.item_id = ri.id
      JOIN return_receipts rr ON ri.receipt_id = rr.id
      JOIN recon_documents d ON r.recon_doc_id = d.id
      ORDER BY d.created_at DESC, r.id ASC
    ");
    json_response(['items' => $stmt->fetchAll()]);
  }

  // Mode 6: Default — list all recon documents
  $stmt = $pdo->query("
    SELECT d.*,
      COUNT(r.id) as item_count,
      SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) as completed_count
    FROM recon_documents d
    LEFT JOIN reconditioning r ON r.recon_doc_id = d.id
    GROUP BY d.id
    ORDER BY d.created_at DESC
  ");
  $docs = $stmt->fetchAll();
  // Calculate dynamic status
  foreach ($docs as &$doc) {
    $total = (int)$doc['item_count'];
    $done  = (int)$doc['completed_count'];
    if ($total === 0) {
      $doc['calc_status'] = 'processing';
    } elseif ($done === 0) {
      $doc['calc_status'] = 'processing';
    } elseif ($done < $total) {
      $doc['calc_status'] = 'partial';
    } else {
      $doc['calc_status'] = 'done';
    }
  }
  unset($doc);
  json_response(['documents' => $docs]);
}

// =============================================
// POST — Create document or add item
// =============================================
if ($method === 'POST') {
  $data = json_input();

  // --- Create a new recon document ---
  if (isset($data['action']) && $data['action'] === 'create_document') {
    $docNumber = trim($data['doc_number'] ?? '');
    $docDate   = trim($data['doc_date'] ?? '');
    $inspector = trim($data['inspector_name'] ?? '');
    $notes = $data['notes'] ?? null;

    if (!$docNumber) {
      json_response(['error' => 'VALIDATION', 'message' => 'กรุณาระบุเลขเอกสาร'], 400);
    }

    // Check duplicate
    $chk = $pdo->prepare("SELECT id FROM recon_documents WHERE doc_number = ?");
    $chk->execute([$docNumber]);
    if ($chk->fetch()) {
      json_response(['error' => 'DUPLICATE', 'message' => 'เลขเอกสารนี้มีอยู่แล้ว'], 409);
    }

    $stmt = $pdo->prepare("
      INSERT INTO recon_documents (doc_number, doc_date, inspector_name, notes, created_by)
      VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$docNumber, $docDate ?: null, $inspector ?: null, $notes, $currentUser['id'] ?? null]);
    $newId = $pdo->lastInsertId();

    json_response(['success' => true, 'id' => $newId, 'message' => 'สร้างเอกสารสำเร็จ']);
  }

  // --- Add item to a document ---
  if (empty($data['action']) || $data['action'] === 'add_item') {
    $docId = (int)($data['recon_doc_id'] ?? 0);
    $itemId = (int)($data['item_id'] ?? 0);
    $targetWarehouse = $data['target_warehouse'] ?? '';
    $causeText = $data['cause_text'] ?? null;
    $inspectorName = $data['inspector_name'] ?? null;

    if (!$docId || !$itemId || !$targetWarehouse) {
      json_response(['error' => 'VALIDATION', 'message' => 'ข้อมูลไม่ครบ'], 400);
    }

    // Require cause for 105/109
    if (in_array($targetWarehouse, ['105', '109']) && empty($causeText)) {
      json_response(['error' => 'VALIDATION', 'message' => 'กรุณาระบุสาเหตุสำหรับคลัง ' . $targetWarehouse], 400);
    }

    // Check not duplicate
    $chk = $pdo->prepare("SELECT id FROM reconditioning WHERE item_id = ?");
    $chk->execute([$itemId]);
    if ($chk->fetch()) {
      json_response(['error' => 'DUPLICATE', 'message' => 'สินค้านี้ถูกเพิ่มแล้ว'], 409);
    }

    $pdo->beginTransaction();
    try {
      $stmt = $pdo->prepare("
        INSERT INTO reconditioning (item_id, recon_doc_id, target_warehouse, cause_text,
                                     inspector_name, source_warehouse, status)
        VALUES (?, ?, ?, ?, ?, '020', 'pending')
      ");
      $stmt->execute([$itemId, $docId, $targetWarehouse, $causeText, $inspectorName]);
      $reconId = $pdo->lastInsertId();

      // Update return_item status
      $pdo->prepare("UPDATE return_items SET status = 'reconditioning' WHERE id = ?")->execute([$itemId]);

      $pdo->commit();
      json_response(['success' => true, 'id' => $reconId]);
    } catch (Throwable $e) {
      $pdo->rollBack();
      json_response(['error' => 'DB_ERROR', 'message' => $e->getMessage()], 500);
    }
  }

  json_response(['error' => 'UNKNOWN_ACTION'], 400);
}

// =============================================
// PUT — Update document or item
// =============================================
if ($method === 'PUT') {
  $data = json_input();

  // Update document
  if (isset($data['update_doc'])) {
    $docId = (int)$data['id'];
    $stmtOld = $pdo->prepare("SELECT * FROM recon_documents WHERE id = ?");
    $stmtOld->execute([$docId]);
    $old = $stmtOld->fetch();
    if (!$old) json_response(['error' => 'NOT_FOUND'], 404);

    $updates = [];
    $params = [];
    foreach (['inspector_name', 'notes', 'status'] as $f) {
      if (isset($data[$f])) { $updates[] = "$f = ?"; $params[] = $data[$f]; }
    }
    if ($updates) {
      $params[] = $docId;
      $pdo->prepare("UPDATE recon_documents SET " . implode(',', $updates) . " WHERE id = ?")->execute($params);
    }
    json_response(['success' => true]);
  }

  // Update reconditioning item
  if (empty($data['id'])) json_response(['error' => 'VALIDATION', 'message' => 'กรุณาระบุ ID'], 400);

  $reconId = (int)$data['id'];
  $stmtOld = $pdo->prepare("SELECT * FROM reconditioning WHERE id = ?");
  $stmtOld->execute([$reconId]);
  $oldRow = $stmtOld->fetch();
  if (!$oldRow) json_response(['error' => 'NOT_FOUND'], 404);

  $pdo->beginTransaction();
  try {
    $updates = [];
    $params = [];

    $newStatus = $data['status'] ?? null;
    if ($newStatus) {
      $updates[] = "status = ?"; $params[] = $newStatus;
      if ($newStatus === 'in_progress') $updates[] = "start_date = CURDATE()";
      if ($newStatus === 'completed') $updates[] = "end_date = CURDATE()";
    }

    foreach (['assigned_to', 'serial_number', 'notes', 'target_warehouse', 'cause_text', 'parts_info', 'inspector_name'] as $f) {
      if (isset($data[$f])) { $updates[] = "$f = ?"; $params[] = $data[$f]; }
    }

    if ($updates) {
      $params[] = $reconId;
      $pdo->prepare("UPDATE reconditioning SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
    }

    if ($newStatus === 'completed') {
      $itemId = (int)$oldRow['item_id'];
      $pdo->prepare("UPDATE return_items SET status = 'completed' WHERE id = ?")->execute([$itemId]);
    }

    $pdo->commit();
    json_response(['success' => true]);
  } catch (Throwable $e) {
    $pdo->rollBack();
    json_response(['error' => 'DB_ERROR', 'message' => $e->getMessage()], 500);
  }
}

// =============================================
// DELETE — Remove item from document
// =============================================
if ($method === 'DELETE') {
  $data = json_input();
  $reconId = (int)($data['id'] ?? 0);
  if (!$reconId) json_response(['error' => 'VALIDATION', 'message' => 'กรุณาระบุ ID'], 400);

  $old = $pdo->prepare("SELECT * FROM reconditioning WHERE id = ?");
  $old->execute([$reconId]);
  $row = $old->fetch();
  if (!$row) json_response(['error' => 'NOT_FOUND'], 404);

  $pdo->beginTransaction();
  try {
    // Restore return_item status
    $pdo->prepare("UPDATE return_items SET status = 'received' WHERE id = ?")->execute([$row['item_id']]);
    // Delete reconditioning record
    $pdo->prepare("DELETE FROM reconditioning WHERE id = ?")->execute([$reconId]);

    $pdo->commit();
    json_response(['success' => true]);
  } catch (Throwable $e) {
    $pdo->rollBack();
    json_response(['error' => 'DB_ERROR', 'message' => $e->getMessage()], 500);
  }
}

json_response(['error' => 'Method not allowed'], 405);
