<?php
require_once __DIR__ . '/../config.php';
cors();

$pdo = db_connect();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  // ── Exact code lookup (for live preview) ──
  if (!empty($_GET['code'])) {
    $stmt = $pdo->prepare("SELECT good_code, good_name, class FROM products WHERE good_code = ? LIMIT 1");
    $stmt->execute([trim($_GET['code'])]);
    $prod = $stmt->fetch();
    if ($prod) {
      json_response($prod);
    } else {
      json_response(['error' => 'NOT_FOUND', 'message' => 'ไม่พบสินค้า'], 404);
    }
  }

  $search = $_GET['q'] ?? '';

  if ($search) {
    $stmt = $pdo->prepare("
      SELECT * FROM products
      WHERE good_code LIKE ? OR good_name LIKE ?
      ORDER BY good_code
    ");
    $like = "%{$search}%";
    $stmt->execute([$like, $like]);
  } else {
    $stmt = $pdo->query("SELECT * FROM products ORDER BY good_code");
  }

  json_response(['products' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
  $data = json_input();

  // ── Bulk Import ──
  if (!empty($data['bulk']) && is_array($data['bulk'])) {
    $stmt = $pdo->prepare("
      INSERT INTO products (good_code, good_name, product_type, class)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        good_name = VALUES(good_name),
        product_type = VALUES(product_type),
        class = IF(VALUES(class) IS NOT NULL AND VALUES(class) != '', VALUES(class), class)
    ");

    $imported = 0;
    $skipped = 0;
    $classUpdated = 0;
    $errors = [];

    foreach ($data['bulk'] as $item) {
      $code = trim($item['good_code'] ?? '');
      $name = trim($item['good_name'] ?? '');
      if (!$code) { $skipped++; continue; }

      $class = !empty($item['class']) ? strtoupper(trim($item['class'])) : null;

      try {
        $stmt->execute([$code, $name, $item['product_type'] ?? null, $class]);
        $imported++;
        if ($class) $classUpdated++;
      } catch (Throwable $e) {
        $errors[] = $code . ': ' . $e->getMessage();
        $skipped++;
      }
    }

    json_response([
      'success' => true,
      'imported' => $imported,
      'skipped' => $skipped,
      'classUpdated' => $classUpdated,
      'errors' => $errors,
      'message' => "นำเข้า {$imported} รายการ" . ($classUpdated > 0 ? " (อัปเดตคลาส {$classUpdated})" : '') . ($skipped > 0 ? " (ข้าม {$skipped})" : '')
    ], 201);
  }

  // ── Single product ──
  if (empty($data['good_code']) || empty($data['good_name'])) {
    json_response(['error' => 'VALIDATION', 'message' => 'กรุณากรอกรหัสและชื่อสินค้า'], 400);
  }

  try {
    $stmt = $pdo->prepare("
      INSERT INTO products (good_code, good_name, product_type, class, base_price)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE good_name = VALUES(good_name), product_type = VALUES(product_type), class = VALUES(class), base_price = VALUES(base_price)
    ");
    $stmt->execute([
      $data['good_code'],
      $data['good_name'],
      $data['product_type'] ?? null,
      $data['class'] ?? null,
      $data['base_price'] ?? 0
    ]);

    json_response(['success' => true, 'message' => 'บันทึกสินค้าสำเร็จ'], 201);
  } catch (Throwable $e) {
    json_response(['error' => 'DB_ERROR', 'message' => $e->getMessage()], 500);
  }
}

json_response(['error' => 'Method not allowed'], 405);
