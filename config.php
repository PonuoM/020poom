<?php
session_start();
date_default_timezone_set("Asia/Bangkok");
ini_set('memory_limit', '256M');
ini_set('max_execution_time', '60');

// Database configuration
$DB_HOST = "localhost";
$DB_PORT = "3306";
$DB_NAME = "jobpoom_recondition";
$DB_USER = "root";
$DB_PASS = "12345678";

function db_connect(): PDO
{
  global $DB_HOST, $DB_PORT, $DB_NAME, $DB_USER, $DB_PASS;

  $dsn = "mysql:host={$DB_HOST};port={$DB_PORT};dbname={$DB_NAME};charset=utf8mb4";
  $opts = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, time_zone = '+07:00'",
  ];

  try {
    return new PDO($dsn, $DB_USER, $DB_PASS, $opts);
  } catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'DB_ERROR', 'message' => $e->getMessage()]);
    exit();
  }
}

function json_input(): array
{
  $raw = file_get_contents("php://input");
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function json_response($data, int $status = 200): void
{
  http_response_code($status);
  header("Content-Type: application/json; charset=utf-8");
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit();
}

function cors(): void
{
  header("Access-Control-Allow-Origin: *");
  header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
  header("Access-Control-Allow-Headers: Content-Type");
  if (isset($_SERVER["REQUEST_METHOD"]) && $_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit();
  }
}

function require_auth(): array
{
  if (empty($_SESSION['user_id'])) {
    json_response(['error' => 'UNAUTHORIZED', 'message' => 'กรุณาเข้าสู่ระบบ'], 401);
  }
  return [
    'id' => $_SESSION['user_id'],
    'username' => $_SESSION['username'] ?? '',
    'display_name' => $_SESSION['display_name'] ?? '',
    'role' => $_SESSION['role'] ?? 'user',
  ];
}

function get_current_user_id(): ?int
{
  return $_SESSION['user_id'] ?? null;
}

/**
 * Log a field edit to edit_logs table.
 * Only logs if old !== new.
 */
function log_edit(PDO $db, string $table, int $recordId, string $field, $oldVal, $newVal): void
{
  $oldStr = $oldVal === null ? '' : (string)$oldVal;
  $newStr = $newVal === null ? '' : (string)$newVal;
  if ($oldStr === $newStr) return; // No actual change

  $userId = get_current_user_id();
  $stmt = $db->prepare("
    INSERT INTO edit_logs (table_name, record_id, field_name, old_value, new_value, user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  ");
  $stmt->execute([$table, $recordId, $field, $oldStr, $newStr, $userId]);
}

/**
 * Log multiple field changes at once.
 * $oldRow = associative array of old values
 * $newData = associative array of new values
 * Only fields present in $newData are compared.
 */
function log_edits(PDO $db, string $table, int $recordId, array $oldRow, array $newData, array $fieldsToTrack): void
{
  foreach ($fieldsToTrack as $field) {
    if (!array_key_exists($field, $newData)) continue;
    $oldVal = $oldRow[$field] ?? null;
    $newVal = $newData[$field] ?? null;
    log_edit($db, $table, $recordId, $field, $oldVal, $newVal);
  }
}
