<?php
/**
 * Reports API — ส่งออกรายงาน
 * Returns ALL items with full detail for report export.
 * Includes inspection, reconditioning, approval details.
 */

require_once __DIR__ . '/../config.php';
cors();
$pdo = db_connect();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {

  $status = isset($_GET['status']) ? trim($_GET['status']) : '';

  $sql = "
    SELECT
      ri.id,
      ri.good_code,
      ri.good_name,
      ri.class,
      ri.serial_number,
      ri.quantity,
      ri.status AS item_status,
      ri.notes AS item_notes,
      ri.sales_conditions,
      ri.is_confirmed,
      ri.created_at AS item_created,
      rr.receipt_number,
      rr.return_date,
      rr.branch_name,
      rr.return_type,
      rr.warehouse AS receipt_warehouse,
      rr.document_number AS receipt_doc_number,
      COALESCE(NULLIF(rec.inspector_name,''), ins.inspector_name) AS inspector_name,
      COALESCE(ins.inspection_date, DATE(ri.confirmed_at), DATE(rec.created_at)) AS inspection_date,
      COALESCE(NULLIF(rec.cause_text,''), ins.cause_text) AS cause_text,
      ins.extra_notes AS inspection_notes,
      ins.result AS inspection_result,
      rec.id AS recon_id,
      rec.assigned_to,
      rec.status AS recon_status,
      rec.serial_number AS recon_serial,
      rec.target_warehouse,
      rec.doc_sent_date,
      rec.notes AS recon_notes,
      COALESCE(rec.transferred, 0) AS transferred,
      rec.transferred_date,
      (SELECT COUNT(*) FROM inspections ins2 WHERE ins2.item_id = ri.id) AS has_inspection,
      ab.id AS batch_id,
      ab.batch_number,
      ab.batch_type,
      ab.status AS batch_status,
      ab.approved_by,
      ab.approved_date,
      ai.sales_reason,
      ai.team_reason,
      rec.recon_doc_number
    FROM return_items ri
    JOIN return_receipts rr ON ri.receipt_id = rr.id
    LEFT JOIN inspections ins ON ins.item_id = ri.id
    LEFT JOIN reconditioning rec ON rec.item_id = ri.id
    LEFT JOIN approval_items ai ON ai.item_id = ri.id
    LEFT JOIN approval_batches ab ON ab.id = ai.batch_id
    ORDER BY rr.return_date DESC, ri.id DESC
  ";

  $stmt = $pdo->prepare($sql);
  $stmt->execute();
  $items = $stmt->fetchAll();

  // Compute stock_status and current_warehouse
  foreach ($items as &$row) {
    $transferred = (int)$row['transferred'];
    $targetWh    = $row['target_warehouse'] ?? '';
    $itemStatus  = $row['item_status'];
    $hasInsp     = (int)$row['has_inspection'];
    $batchStatus = $row['batch_status'] ?? '';
    $hasRecon    = !empty($row['recon_id']);

    if ($transferred === 1) {
      $row['stock_status'] = 'transferred';
      $row['current_warehouse'] = $targetWh ?: '020';
    } elseif ($hasRecon && !empty($targetWh)) {
      if ($batchStatus === 'approved') {
        $row['stock_status'] = 'wait_transfer';
      } elseif ($targetWh === '001') {
        $row['stock_status'] = 'wait_transfer';
      } else {
        $row['stock_status'] = 'wait_approval';
      }
      $row['current_warehouse'] = '020';
    } elseif ($hasRecon) {
      $row['stock_status'] = 'reconditioning';
      $row['current_warehouse'] = '020';
    } elseif ($hasInsp > 0 || $itemStatus === 'inspecting') {
      $row['stock_status'] = 'wait_inspect';
      $row['current_warehouse'] = '020';
    } else {
      $row['stock_status'] = 'received';
      $row['current_warehouse'] = '020';
    }
  }
  unset($row);

  // Filter by status
  if ($status !== '' && $status !== 'all') {
    $items = array_values(array_filter($items, function($r) use ($status) {
      return $r['stock_status'] === $status;
    }));
  }

  // Summary counts
  $byStatus = [];
  foreach ($items as $row) {
    $st = $row['stock_status'];
    if (!isset($byStatus[$st])) $byStatus[$st] = 0;
    $byStatus[$st]++;
  }

  json_response([
    'items'   => $items,
    'total'   => count($items),
    'by_status' => $byStatus,
  ]);
}

json_response(['error' => 'METHOD_NOT_ALLOWED'], 405);
