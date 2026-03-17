<?php
/**
 * Users API — CRUD (admin only)
 */
require_once __DIR__ . '/../config.php';
cors();
$currentUser = require_auth();
$db = db_connect();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
  case 'GET':
    // List all users (admin only)
    if ($currentUser['role'] !== 'admin') {
      json_response(['error' => 'FORBIDDEN', 'message' => 'ไม่มีสิทธิ์'], 403);
    }
    $stmt = $db->query("SELECT id, username, display_name, role, is_active, last_login, created_at FROM users ORDER BY id");
    json_response(['users' => $stmt->fetchAll()]);
    break;

  case 'POST':
    if ($currentUser['role'] !== 'admin') {
      json_response(['error' => 'FORBIDDEN'], 403);
    }
    $input = json_input();
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';
    $display_name = trim($input['display_name'] ?? '');
    $role = $input['role'] ?? 'user';

    if (!$username || !$password || !$display_name) {
      json_response(['error' => 'MISSING_FIELDS', 'message' => 'กรุณากรอกข้อมูลให้ครบ'], 400);
    }

    // Check duplicate
    $check = $db->prepare("SELECT id FROM users WHERE username = ?");
    $check->execute([$username]);
    if ($check->fetch()) {
      json_response(['error' => 'DUPLICATE', 'message' => 'ชื่อผู้ใช้ซ้ำ'], 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare("INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)");
    $stmt->execute([$username, $hash, $display_name, $role]);

    json_response(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
    break;

  case 'PUT':
    if ($currentUser['role'] !== 'admin') {
      json_response(['error' => 'FORBIDDEN'], 403);
    }
    $input = json_input();
    $id = (int)($input['id'] ?? 0);
    if (!$id) json_response(['error' => 'MISSING_ID'], 400);

    $updates = [];
    $params = [];

    if (!empty($input['display_name'])) {
      $updates[] = "display_name = ?";
      $params[] = trim($input['display_name']);
    }
    if (!empty($input['role'])) {
      $updates[] = "role = ?";
      $params[] = $input['role'];
    }
    if (isset($input['is_active'])) {
      $updates[] = "is_active = ?";
      $params[] = (int)$input['is_active'];
    }
    if (!empty($input['password'])) {
      $updates[] = "password_hash = ?";
      $params[] = password_hash($input['password'], PASSWORD_DEFAULT);
    }

    if (empty($updates)) {
      json_response(['error' => 'NOTHING_TO_UPDATE'], 400);
    }

    $params[] = $id;
    $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
    $db->prepare($sql)->execute($params);

    json_response(['success' => true]);
    break;

  default:
    json_response(['error' => 'Method not allowed'], 405);
}
