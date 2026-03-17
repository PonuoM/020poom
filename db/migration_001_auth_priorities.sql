-- =====================================================
-- Migration 001: Auth, Warehouses, Return Types, Edit Logs
-- =====================================================

USE `jobpoom_recondition`;

-- =====================================================
-- 1. Users (ผู้ใช้งาน)
-- =====================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `display_name` VARCHAR(100) NOT NULL,
  `role` ENUM('admin','user') DEFAULT 'user',
  `is_active` TINYINT(1) DEFAULT 1,
  `last_login` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB;

-- =====================================================
-- 2. Warehouses (คลังสินค้า)
-- =====================================================
CREATE TABLE IF NOT EXISTS `warehouses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `priority` INT NOT NULL DEFAULT 999 COMMENT 'ลำดับความสำคัญ (1=สูงสุด)',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB;

-- =====================================================
-- 3. Return Types (ประเภทการรับคืน)
-- =====================================================
CREATE TABLE IF NOT EXISTS `return_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `category` ENUM('return','exchange') NOT NULL DEFAULT 'return'
    COMMENT 'return=รับคืน, exchange=เบิกเปลี่ยน',
  `default_warehouse_id` INT NULL
    COMMENT 'คลังตั้งต้นที่ผูกกับประเภทนี้',
  `priority` INT NOT NULL DEFAULT 999
    COMMENT 'ลำดับความสำคัญ (1=สูงสุด)',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_name` (`name`),
  FOREIGN KEY (`default_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- 4. Edit Logs (ประวัติการแก้ไข)
-- =====================================================
CREATE TABLE IF NOT EXISTS `edit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `table_name` VARCHAR(50) NOT NULL,
  `record_id` INT NOT NULL,
  `field_name` VARCHAR(50) NOT NULL,
  `old_value` TEXT NULL,
  `new_value` TEXT NULL,
  `user_id` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_record` (`table_name`, `record_id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB;

-- =====================================================
-- 5. Seed Data
-- =====================================================

-- Default admin user (password: admin123)
INSERT INTO `users` (`username`, `password_hash`, `display_name`, `role`) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ', 'admin')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Warehouses (ลำดับเริ่มต้น — ปรับเปลี่ยนได้ผ่าน Settings)
INSERT INTO `warehouses` (`code`, `name`, `priority`) VALUES
('020',   'คลังรับคืน (เริ่มต้น)',           0),
('001',   'คลังตัวดี',                       1),
('102-2', 'ตัวโชว์',                         2),
('101',   'เคลียแร้น',                       3),
('018-2', 'คลังเคลม',                       4),
('100',   'คลังอะไหล่',                      5),
('023-1', 'คลังอะไหล่1',                     6),
('023-2', 'คลังอะไหล่2',                     7),
('025',   'คลังตัวอย่าง(ทดสอบ)',              8),
('106',   'คลังถอดอะไหล่',                   9),
('105',   'บริจาค',                          10),
('109',   'เศษซาก (ทำลาย)',                  11)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `priority` = VALUES(`priority`);

-- Return Types
-- (ต้อง insert warehouses ก่อน เพื่อใช้ FK)
INSERT INTO `return_types` (`name`, `category`, `default_warehouse_id`, `priority`) VALUES
('รับคืนเครดิต',       'return',   (SELECT id FROM warehouses WHERE code = '001'),   1),
('รับคืนตัวโชว์',      'return',   (SELECT id FROM warehouses WHERE code = '102-2'), 2),
('รับคืนเคลียแร้น',    'return',   (SELECT id FROM warehouses WHERE code = '101'),   3),
('เบิกเปลี่ยนเครดิต',  'exchange', (SELECT id FROM warehouses WHERE code = '001'),   4),
('เบิกเปลี่ยนตัวโชว์', 'exchange', (SELECT id FROM warehouses WHERE code = '102-2'), 5)
ON DUPLICATE KEY UPDATE `category` = VALUES(`category`), `priority` = VALUES(`priority`);
