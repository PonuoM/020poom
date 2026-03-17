<?php
/**
 * Auth API — Login / Logout / Session Check
 */
require_once __DIR__ . '/../config.php';
cors();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {
  case 'login':
    if ($method !== 'POST') json_response(['error' => 'Method not allowed'], 405);
    $input = json_input();
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';

    if (!$username || !$password) {
      json_response(['error' => 'MISSING_FIELDS', 'message' => 'กรุณากรอก username และ password'], 400);
    }

    $db = db_connect();
    $stmt = $db->prepare("SELECT * FROM users WHERE username = ? AND is_active = 1");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
      json_response(['error' => 'INVALID_CREDENTIALS', 'message' => 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'], 401);
    }

    // Set session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['display_name'] = $user['display_name'];
    $_SESSION['role'] = $user['role'];

    // Update last login
    $db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")->execute([$user['id']]);

    json_response([
      'success' => true,
      'user' => [
        'id' => $user['id'],
        'username' => $user['username'],
        'display_name' => $user['display_name'],
        'role' => $user['role'],
      ]
    ]);
    break;

  case 'logout':
    session_destroy();
    json_response(['success' => true]);
    break;

  case 'me':
    if (empty($_SESSION['user_id'])) {
      json_response(['authenticated' => false], 401);
    }
    json_response([
      'authenticated' => true,
      'user' => [
        'id' => $_SESSION['user_id'],
        'username' => $_SESSION['username'] ?? '',
        'display_name' => $_SESSION['display_name'] ?? '',
        'role' => $_SESSION['role'] ?? 'user',
      ]
    ]);
    break;

  default:
    json_response(['error' => 'Unknown action'], 400);
}
