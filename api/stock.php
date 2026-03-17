<?php
/**
 * Stock Inventory API — คลัง 020 คงเหลือ
 * Items are "in 020" if they have NOT been transferred (reconditioning.transferred != 1)
 * or if they have no reconditioning record yet.
 *
 * GET /stock.php           → all items in 020
 * GET /stock.php?search=x  → filter by product code/name
 * GET /stock.php?status=x  → filter by return_items.status
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
      ri.status,
      ri.created_at AS item_created,
      rr.receipt_number,
      rr.return_date,
      rr.branch_name,
      rr.return_type,
      rec.id AS recon_id,
      rec.target_warehouse,
      rec.status AS recon_status,
      COALESCE(rec.transferred, 0) AS transferred,
      rec.cause_text
    FROM return_items ri
    JOIN return_receipts rr ON ri.receipt_id = rr.id
    LEFT JOIN reconditioning rec ON rec.item_id = ri.id
    WHERE COALESCE(rec.transferred, 0) = 0
  ";

  $params = [];

  if ($search !== '') {
    $sql .= " AND (ri.good_code LIKE ? OR ri.good_name LIKE ? OR rr.receipt_number LIKE ? OR ri.serial_number LIKE ?)";
    $like = "%{$search}%";
    $params = array_merge($params, [$like, $like, $like, $like]);
  }

  if ($status !== '') {
    $sql .= " AND ri.status = ?";
    $params[] = $status;
  }

  $sql .= " ORDER BY rr.return_date DESC, ri.id DESC";

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $items = $stmt->fetchAll();

  // Summary
  $totalItems = count($items);
  $totalQty = 0;
  $byStatus = [];
  foreach ($items as $row) {
    $totalQty += (int)$row['quantity'];
    $st = $row['status'];
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
