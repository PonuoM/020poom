-- =====================================================
-- ระบบจัดการงานปรับสภาพสินค้า (Reconditioning System)
-- Database: jobpoom_recondition
-- =====================================================

CREATE DATABASE IF NOT EXISTS `jobpoom_recondition` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `jobpoom_recondition`;

-- =====================================================
-- 1. ตารางข้อมูลอ้างอิง (Reference Data)
-- =====================================================

-- สาขา/ลูกค้า
CREATE TABLE IF NOT EXISTS `branches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NULL,
  `name` VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB;

-- สินค้า (Master Product)
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `good_code` VARCHAR(50) NOT NULL,
  `good_name` VARCHAR(255) NOT NULL,
  `good_pack_code` VARCHAR(50) NULL,
  `class` ENUM('A','B','C','D') NULL,
  `base_price` DECIMAL(12,2) NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_good_code` (`good_code`),
  INDEX `idx_class` (`class`)
) ENGINE=InnoDB;

-- หมวดสาเหตุ (Cause Categories)
CREATE TABLE IF NOT EXISTS `cause_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `sort_order` INT DEFAULT 0,
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB;

-- ตัวเลือกสาเหตุ (Cause Options = Building Blocks)
CREATE TABLE IF NOT EXISTS `cause_options` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `sort_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  FOREIGN KEY (`category_id`) REFERENCES `cause_categories`(`id`) ON DELETE CASCADE,
  INDEX `idx_category` (`category_id`)
) ENGINE=InnoDB;

-- =====================================================
-- 2. ตารางหลัก (Core Tables)
-- =====================================================

-- ใบรับคืน (Return Receipts)
CREATE TABLE IF NOT EXISTS `return_receipts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `receipt_number` VARCHAR(50) NOT NULL,
  `return_date` DATE NOT NULL,
  `branch_id` INT NULL,
  `branch_name` VARCHAR(255) NULL,
  `return_type` VARCHAR(100) NULL COMMENT 'ประเภทการรับคืน',
  `warehouse` VARCHAR(100) NULL COMMENT 'คลังที่เก็บ',
  `document_number` VARCHAR(100) NULL COMMENT 'เลขที่เอกสาร',
  `notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_receipt_number` (`receipt_number`),
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL,
  INDEX `idx_return_date` (`return_date`)
) ENGINE=InnoDB;

-- รายการสินค้ารับคืน (Return Items)
CREATE TABLE IF NOT EXISTS `return_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `receipt_id` INT NOT NULL,
  `product_id` INT NULL,
  `good_code` VARCHAR(50) NULL,
  `good_name` VARCHAR(255) NULL,
  `quantity` INT DEFAULT 1,
  `serial_number` VARCHAR(100) NULL,
  `run_name` VARCHAR(100) NULL,
  `status` ENUM('received','inspecting','waiting_parts','reconditioning','completed','shipped') DEFAULT 'received',
  `notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`receipt_id`) REFERENCES `return_receipts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL,
  INDEX `idx_status` (`status`),
  INDEX `idx_receipt` (`receipt_id`)
) ENGINE=InnoDB;

-- ผลตรวจสอบ (Inspections)
CREATE TABLE IF NOT EXISTS `inspections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_id` INT NOT NULL,
  `inspector_name` VARCHAR(100) NULL,
  `inspection_date` DATE NULL,
  `cause_ids` JSON NULL COMMENT 'Array of cause_option IDs selected',
  `cause_text` TEXT NULL COMMENT 'Auto-generated text from selected causes',
  `extra_notes` TEXT NULL COMMENT 'ข้อความเพิ่มเติม',
  `result` ENUM('repairable','show_unit','donate','wait_parts','other') NULL
    COMMENT 'ผลการตรวจ: ปรับได้/ตัวโชว์/บริจาค/รออะไหล่',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`item_id`) REFERENCES `return_items`(`id`) ON DELETE CASCADE,
  INDEX `idx_item` (`item_id`)
) ENGINE=InnoDB;

-- งานปรับสภาพ (Reconditioning)
CREATE TABLE IF NOT EXISTS `reconditioning` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_id` INT NOT NULL,
  `assigned_to` VARCHAR(100) NULL COMMENT 'ผู้รับผิดชอบ',
  `status` ENUM('pending','in_progress','completed','on_hold') DEFAULT 'pending',
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `serial_number` VARCHAR(100) NULL COMMENT 'SN NO.',
  `doc_sent_date` DATE NULL COMMENT 'วันที่ส่งเอกสาร',
  `notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`item_id`) REFERENCES `return_items`(`id`) ON DELETE CASCADE,
  INDEX `idx_status` (`status`),
  INDEX `idx_item` (`item_id`)
) ENGINE=InnoDB;

-- ส่งคืนคลัง (Shipments)
CREATE TABLE IF NOT EXISTS `shipments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_id` INT NOT NULL,
  `shipment_type` ENUM('001','101','102-2','105','109') NOT NULL
    COMMENT '001=ปกติ, 101=เคลียร์แรนท์, 102-2=ตัวโชว์, 105=บริจาค, 109=ส่งป๋า',
  `shipment_date` DATE NULL,
  `document_number` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`item_id`) REFERENCES `return_items`(`id`) ON DELETE CASCADE,
  INDEX `idx_type` (`shipment_type`),
  INDEX `idx_date` (`shipment_date`)
) ENGINE=InnoDB;

-- ชุดขออนุมัติ (Approval Batches)
CREATE TABLE IF NOT EXISTS `approval_batches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `batch_number` VARCHAR(50) NOT NULL,
  `batch_type` ENUM('101','102-2','105') NOT NULL
    COMMENT '101=เคลียร์แรนท์, 102-2=ตัวโชว์, 105=บริจาค',
  `batch_date` DATE NOT NULL,
  `status` ENUM('draft','pending','approved','rejected') DEFAULT 'draft',
  `approved_by` VARCHAR(100) NULL,
  `approved_date` DATE NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_batch` (`batch_number`),
  INDEX `idx_type_date` (`batch_type`, `batch_date`)
) ENGINE=InnoDB;

-- รายการในชุดอนุมัติ (Approval Items)
CREATE TABLE IF NOT EXISTS `approval_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `batch_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `sales_reason` TEXT NULL COMMENT 'เหตุผลฝ่ายขาย',
  `team_reason` TEXT NULL COMMENT 'เหตุผลทีมปรับสภาพ',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`batch_id`) REFERENCES `approval_batches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`item_id`) REFERENCES `return_items`(`id`) ON DELETE CASCADE,
  INDEX `idx_batch` (`batch_id`)
) ENGINE=InnoDB;

-- =====================================================
-- 3. Seed Data — หมวดสาเหตุ + ตัวเลือก (Building Blocks)
-- =====================================================

INSERT INTO `cause_categories` (`id`, `name`, `sort_order`) VALUES
(1, 'สภาพ', 1),
(2, 'อุปกรณ์', 2),
(3, 'ท่อ/เหล็ก', 3),
(4, 'อาการ', 4),
(5, 'ผล', 5);

INSERT INTO `cause_options` (`category_id`, `label`, `sort_order`) VALUES
-- สภาพ
(1, 'สภาพโชว์', 1),
(1, 'สภาพเก่า', 2),
(1, 'มีรอยบุบ', 3),
(1, 'มีคราบดำ', 4),
(1, 'สภาพดี', 5),

-- อุปกรณ์
(2, 'อุปกรณ์ครบ', 1),
(2, 'ขาดราง', 2),
(2, 'ขาดทุกอย่าง', 3),
(2, 'ขาดอุปกรณ์บางส่วน', 4),

-- ท่อ/เหล็ก
(3, 'ท่อเฟล็ก', 1),
(3, 'เหล็กยึด', 2),
(3, 'แขวน', 3),
(3, 'ข้อต่อช่องลม', 4),

-- อาการ
(4, 'ปีกผีเสื้อ', 1),
(4, 'ขาดก๊อก', 2),
(4, 'ชุดท่อ สะดือ ก๊อก', 3),
(4, 'เจาะรูผิด', 4),

-- ผล
(5, 'ส่งต่อ', 1),
(5, 'เข้า001', 2),
(5, 'รอปรับ', 3),
(5, 'ขาดทุกอย่าง', 4),
(5, 'รออะไหล่', 5);
