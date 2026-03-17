<?php
/**
 * Transfers API
 * Consolidates items ready for warehouse transfer:
 *  - Items with approved batches (approval required flow)
 *  - Items directly from reconditioning that don't need approval
 *    (have a target_warehouse set but are NOT in any approval batch)
 *
 * GET  /transfers.php                   → list all transfer-ready items
 * GET  /transfers.php?warehouses=1      → list target warehouses
 * PUT  /transfers.php                   → mark items as transferred
 */

require_once __DIR__ . '/../config.php';
cors();
$pdo = db_connect();

$method = $_SERVER['REQUEST_METHOD'];

// ── GET: List transfer-ready items ──
if ($method === 'GET') {

  // Warehouse list
  if (isset($_GET['warehouses'])) {
    $stmt = $pdo->query("SELECT code, name FROM warehouses ORDER BY code");
    json_response(['warehouses' => $stmt->fetchAll()]);
  }

  $warehouseFilter = isset($_GET['warehouse']) ? $_GET['warehouse'] : '';

  // Source 1: Items in APPROVED batches (through approval flow → approved)
  $sql1 = "
    SELECT
      ai.id AS transfer_id,
      'approval' AS source_type,
      ai.batch_id,
      ab.batch_number,
      rr.receipt_number,
      ri.good_code,
      ri.good_name,
      ri.class,
      ri.serial_number,
      ri.quantity,
      rr.return_type,
      rr.branch_name,
      rec.target_warehouse,
      w.name AS warehouse_name,
      rec.cause_text,
      rec.id AS recon_id,
      rec.recon_doc_id,
      d.doc_number AS recon_doc_number,
      COALESCE(rec.transferred, 0) AS transferred,
      rec.transferred_date,
      ab.approved_date
    FROM approval_items ai
    JOIN approval_batches ab ON ai.batch_id = ab.id
    JOIN reconditioning rec ON ai.recon_id = rec.id
    JOIN return_items ri ON rec.item_id = ri.id
    JOIN return_receipts rr ON ri.receipt_id = rr.id
    LEFT JOIN warehouses w ON rec.target_warehouse = w.code
    LEFT JOIN recon_documents d ON rec.recon_doc_id = d.id
    WHERE ab.status = 'approved'
  ";

  $params1 = [];
  if ($warehouseFilter) {
    $sql1 .= " AND rec.target_warehouse = ?";
    $params1[] = $warehouseFilter;
  }

  $stmt1 = $pdo->prepare($sql1);
  $stmt1->execute($params1);
  $approvedItems = $stmt1->fetchAll();

  // Source 2: Direct items — have target_warehouse set, NOT in any approval batch
  // These are items that can go directly to transfer without approval
  // (e.g. warehouse 001, 102-2, etc. that don't require approval)
  $sql2 = "
    SELECT
      rec.id AS transfer_id,
      'direct' AS source_type,
      NULL AS batch_id,
      NULL AS batch_number,
      rr.receipt_number,
      ri.good_code,
      ri.good_name,
      ri.class,
      ri.serial_number,
      ri.quantity,
      rr.return_type,
      rr.branch_name,
      rec.target_warehouse,
      w.name AS warehouse_name,
      rec.cause_text,
      rec.id AS recon_id,
      rec.recon_doc_id,
      d.doc_number AS recon_doc_number,
      COALESCE(rec.transferred, 0) AS transferred,
      rec.transferred_date,
      NULL AS approved_date
    FROM reconditioning rec
    JOIN return_items ri ON rec.item_id = ri.id
    JOIN return_receipts rr ON ri.receipt_id = rr.id
    LEFT JOIN warehouses w ON rec.target_warehouse = w.code
    LEFT JOIN recon_documents d ON rec.recon_doc_id = d.id
    WHERE rec.target_warehouse IS NOT NULL
      AND rec.target_warehouse != ''
      AND rec.id NOT IN (SELECT recon_id FROM approval_items WHERE recon_id IS NOT NULL)
  ";

  $params2 = [];
  if ($warehouseFilter) {
    $sql2 .= " AND rec.target_warehouse = ?";
    $params2[] = $warehouseFilter;
  }

  $stmt2 = $pdo->prepare($sql2);
  $stmt2->execute($params2);
  $directItems = $stmt2->fetchAll();

  $allItems = array_merge($approvedItems, $directItems);

  // Get warehouse summary counts
  $whSummary = [];
  $pendingCount = 0;
  $transferredCount = 0;
  foreach ($allItems as $item) {
    $wh = $item['target_warehouse'] ? $item['target_warehouse'] : 'unknown';
    if (!isset($whSummary[$wh])) {
      $whSummary[$wh] = ['code' => $wh, 'name' => $item['warehouse_name'] ? $item['warehouse_name'] : $wh, 'total' => 0, 'pending' => 0, 'transferred' => 0];
    }
    $whSummary[$wh]['total']++;
    if ($item['transferred']) {
      $whSummary[$wh]['transferred']++;
      $transferredCount++;
    } else {
      $whSummary[$wh]['pending']++;
      $pendingCount++;
    }
  }

  json_response([
    'items' => $allItems,
    'warehouse_summary' => array_values($whSummary),
    'total' => count($allItems),
    'pending' => $pendingCount,
    'transferred' => $transferredCount
  ]);
}

// ── PUT: Mark items as transferred ──
if ($method === 'PUT') {
  $data = json_input();
  $action = isset($data['action']) ? $data['action'] : 'mark_transferred';

  if ($action === 'mark_transferred') {
    $reconIds = isset($data['recon_ids']) ? $data['recon_ids'] : [];
    if (empty($reconIds)) json_response(['error' => 'MISSING_IDS'], 400);

    $placeholders = implode(',', array_fill(0, count($reconIds), '?'));
    $stmt = $pdo->prepare("UPDATE reconditioning SET transferred = 1, transferred_date = CURDATE(), status = 'completed' WHERE id IN ($placeholders)");
    $stmt->execute($reconIds);

    json_response(['success' => true, 'message' => 'โอนสำเร็จ ' . count($reconIds) . ' รายการ', 'count' => count($reconIds)]);
  }

  if ($action === 'unmark_transferred') {
    $reconIds = isset($data['recon_ids']) ? $data['recon_ids'] : [];
    if (empty($reconIds)) json_response(['error' => 'MISSING_IDS'], 400);

    $placeholders = implode(',', array_fill(0, count($reconIds), '?'));
    $stmt = $pdo->prepare("UPDATE reconditioning SET transferred = 0, transferred_date = NULL, status = 'pending' WHERE id IN ($placeholders)");
    $stmt->execute($reconIds);

    json_response(['success' => true, 'message' => 'ยกเลิกการโอน ' . count($reconIds) . ' รายการ', 'count' => count($reconIds)]);
  }

  json_response(['error' => 'UNKNOWN_ACTION'], 400);
}

json_response(['error' => 'METHOD_NOT_ALLOWED'], 405);
