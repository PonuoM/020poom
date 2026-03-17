<?php
/**
 * Stock Inventory API — สต๊อคคงเหลือ (Full Lifecycle)
 * Shows ALL items with computed stock_status and current_warehouse.
 *
 * Status flow:
 *   รับแล้ว → รอตรวจ → ปรับสภาพ → รอขออนุมัติ → รอโอน → โอนแล้ว
 */

require_once __DIR__ . '/../config.php';
cors();
$pdo = db_connect();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {

  $search = isset($_GET['search']) ? trim($_GET['search']) : '';
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
      ri.created_at AS item_created,
      rr.receipt_number,
      rr.return_date,
      rr.branch_name,
      rr.return_type,
      rec.id AS recon_id,
      rec.target_warehouse,
      rec.status AS recon_status,
      COALESCE(rec.transferred, 0) AS transferred,
      rec.transferred_date,
      rec.cause_text,
      (SELECT COUNT(*) FROM inspections ins WHERE ins.item_id = ri.id) AS has_inspection,
      ab.status AS batch_status,
      ab.id AS batch_id
    FROM return_items ri
    JOIN return_receipts rr ON ri.receipt_id = rr.id
    LEFT JOIN reconditioning rec ON rec.item_id = ri.id
    LEFT JOIN approval_items ai ON ai.item_id = ri.id
    LEFT JOIN approval_batches ab ON ab.id = ai.batch_id
    ORDER BY rr.return_date DESC, ri.id DESC
  ";

  $stmt = $pdo->prepare($sql);
  $stmt->execute();
  $items = $stmt->fetchAll();

  // Compute stock_status and current_warehouse for each item
  foreach ($items as &$row) {
    $transferred = (int)$row['transferred'];
    $targetWh    = $row['target_warehouse'] ?? '';
    $itemStatus  = $row['item_status'];
    $hasInsp     = (int)$row['has_inspection'];
    $batchStatus = $row['batch_status'] ?? '';
    $hasRecon    = !empty($row['recon_id']);

    // Determine stock_status
    if ($transferred === 1) {
      $row['stock_status'] = 'transferred';     // โอนแล้ว
      $row['current_warehouse'] = $targetWh ?: '020';
    } elseif ($hasRecon && !empty($targetWh)) {
      // Has target warehouse set
      if ($batchStatus === 'approved') {
        $row['stock_status'] = 'wait_transfer';  // รอโอน (approved)
      } elseif ($targetWh === '001') {
        // 001 doesn't need approval
        $row['stock_status'] = 'wait_transfer';   // รอโอน (no approval needed)
      } else {
        $row['stock_status'] = 'wait_approval';   // รอขออนุมัติ
      }
      $row['current_warehouse'] = '020';
    } elseif ($hasRecon) {
      // Has recon but no target warehouse
      $row['stock_status'] = 'reconditioning';    // ปรับสภาพ
      $row['current_warehouse'] = '020';
    } elseif ($hasInsp > 0 || $itemStatus === 'inspecting') {
      $row['stock_status'] = 'wait_inspect';      // รอตรวจ (has inspection)
      $row['current_warehouse'] = '020';
    } else {
      $row['stock_status'] = 'received';           // รับแล้ว
      $row['current_warehouse'] = '020';
    }
  }
  unset($row);

  // Apply status filter AFTER computing stock_status
  if ($status !== '') {
    $items = array_values(array_filter($items, function($r) use ($status) {
      return $r['stock_status'] === $status;
    }));
  }

  // Apply search filter
  if ($search !== '') {
    $searchLower = mb_strtolower($search);
    $items = array_values(array_filter($items, function($r) use ($searchLower) {
      return str_contains(mb_strtolower($r['good_code'] ?? ''), $searchLower)
          || str_contains(mb_strtolower($r['good_name'] ?? ''), $searchLower)
          || str_contains(mb_strtolower($r['receipt_number'] ?? ''), $searchLower)
          || str_contains(mb_strtolower($r['serial_number'] ?? ''), $searchLower);
    }));
  }

  // Summary
  $totalItems = count($items);
  $totalQty = 0;
  $byStatus = [];
  foreach ($items as $row) {
    $totalQty += (int)$row['quantity'];
    $st = $row['stock_status'];
    if (!isset($byStatus[$st])) $byStatus[$st] = 0;
    $byStatus[$st]++;
  }

  json_response([
    'items'   => $items,
    'summary' => [
      'total_items' => $totalItems,
      'total_qty'   => $totalQty,
      'by_status'   => $byStatus,
    ]
  ]);
}

json_response(['error' => 'METHOD_NOT_ALLOWED'], 405);
