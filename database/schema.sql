-- Database Schema for Wat Phleng Hospital Training System
-- โรงพยาบาลวัดเพลง - ระบบจัดเก็บคลังข้อมูลสุขภาพ

CREATE DATABASE IF NOT EXISTS wph_training_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wph_training_db;

-- ตารางผู้ใช้งาน (Users)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE,
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    position VARCHAR(100),
    department VARCHAR(100),
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Provider-ID fields
    cid VARCHAR(13) COMMENT 'Citizen ID from Provider-ID',
    hospital VARCHAR(200) COMMENT 'Hospital name from Provider-ID',
    provider_id VARCHAR(100) UNIQUE COMMENT 'Unique Provider-ID identifier',
    auth_method ENUM('local', 'provider_id') DEFAULT 'local' COMMENT 'Authentication method',
    approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved' COMMENT 'Approval status for Provider-ID registrations',
    approved_by INT COMMENT 'Admin who approved the registration',
    approved_at TIMESTAMP NULL COMMENT 'Approval timestamp',
    rejection_reason TEXT COMMENT 'Reason for rejection if applicable',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_employee_id (employee_id),
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_provider_id (provider_id),
    INDEX idx_cid (cid),
    INDEX idx_approval_status (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางลงทะเบียน Provider-ID (Provider Registrations)
CREATE TABLE IF NOT EXISTS provider_registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id VARCHAR(100) NOT NULL COMMENT 'Provider-ID from OAuth',
    cid VARCHAR(13) NOT NULL COMMENT 'Citizen ID',
    full_name VARCHAR(100) NOT NULL COMMENT 'Full name from Provider-ID',
    email VARCHAR(100) NOT NULL COMMENT 'Email from Provider-ID',
    position VARCHAR(100) COMMENT 'Position/Title',
    hospital VARCHAR(200) COMMENT 'Hospital name',
    oauth_data TEXT COMMENT 'Complete OAuth response data (JSON format)',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by INT COMMENT 'Admin who processed the registration',
    approved_at TIMESTAMP NULL COMMENT 'Processing timestamp',
    rejection_reason TEXT COMMENT 'Reason for rejection',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_provider_id (provider_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางแผนก (Departments)
CREATE TABLE IF NOT EXISTS departments (
    department_id INT PRIMARY KEY AUTO_INCREMENT,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_department_name (department_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางประเภทกิจกรรม (Activity Types)
CREATE TABLE IF NOT EXISTS activity_types (
    type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    type_name_th VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_type_name (type_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางรูปแบบการจัด (Format Types)
CREATE TABLE IF NOT EXISTS format_types (
    format_id INT AUTO_INCREMENT PRIMARY KEY,
    format_name VARCHAR(50) NOT NULL,
    format_name_th VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_format_name (format_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางข้อมูลการอบรม/การประชุม (Training Records)
CREATE TABLE IF NOT EXISTS training_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type_id INT NOT NULL,
    format_type_id INT NOT NULL,
    organization VARCHAR(200),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    location VARCHAR(200),
    certificate_number VARCHAR(100),
    created_by INT NOT NULL,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (activity_type_id) REFERENCES activity_types(type_id),
    FOREIGN KEY (format_type_id) REFERENCES format_types(format_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id),
    INDEX idx_user_id (user_id),
    INDEX idx_start_date (start_date),
    INDEX idx_activity_type (activity_type_id),
    INDEX idx_format_type (format_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางไฟล์แนบ (Attachments)
CREATE TABLE IF NOT EXISTS attachments (
    attachment_id INT AUTO_INCREMENT PRIMARY KEY,
    record_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    uploaded_by INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (record_id) REFERENCES training_records(record_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id),
    INDEX idx_record_id (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางบันทึกการเข้าสู่ระบบ (Login Logs)
CREATE TABLE IF NOT EXISTS login_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    username VARCHAR(50),
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status ENUM('success', 'failed') DEFAULT 'success',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_login_time (login_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางหมวดหมู่สื่อ (Media Categories)
CREATE TABLE IF NOT EXISTS media_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางประเภทสื่อ (Media Types)
CREATE TABLE IF NOT EXISTS media_types (
    type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_code VARCHAR(50) NOT NULL UNIQUE,
    type_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางสื่อ (Media)
CREATE TABLE IF NOT EXISTS media (
    media_id INT PRIMARY KEY AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type ENUM('image', 'pdf', 'video') NOT NULL,
    file_size INT NOT NULL COMMENT 'File size in bytes',
    mime_type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    department_id INT,
    category VARCHAR(100),
    tags TEXT,
    
    uploaded_by INT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    view_count INT DEFAULT 0,
    download_count INT DEFAULT 0,
    
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
    INDEX idx_file_type (file_type),
    INDEX idx_department (department_id),
    INDEX idx_category (category),
    INDEX idx_upload_date (upload_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางหลักสูตรอบรมออนไลน์ (Courses)
CREATE TABLE IF NOT EXISTS courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image VARCHAR(500),
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางสื่อการเรียนรู้ (Course Materials)
CREATE TABLE IF NOT EXISTS course_materials (
    material_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    type ENUM('video', 'pdf') NOT NULL,
    content_url VARCHAR(500) NOT NULL,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางแบบทดสอบ (Quizzes)
CREATE TABLE IF NOT EXISTS quizzes (
    quiz_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    type ENUM('pre', 'post') NOT NULL,
    passing_score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    UNIQUE KEY unique_course_quiz (course_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางคำถามแบบทดสอบ (Quiz Questions)
CREATE TABLE IF NOT EXISTS quiz_questions (
    question_id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    question_text TEXT NOT NULL,
    order_index INT DEFAULT 0,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางตัวเลือกคำตอบ (Quiz Answers)
CREATE TABLE IF NOT EXISTS quiz_answers (
    answer_id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    answer_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางความคืบหน้าผู้เรียน (User Course Progress)
CREATE TABLE IF NOT EXISTS user_course_progress (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    status ENUM('enrolled', 'in_progress', 'completed') DEFAULT 'enrolled',
    pre_test_score INT,
    post_test_score INT,
    learning_time_minutes DECIMAL(10,2) DEFAULT 0,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_course (user_id, course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Insert ข้อมูลเริ่มต้น (Initial Data)
-- ==========================================

-- แผนกทั้งหมด
INSERT INTO departments (department_name, description) VALUES
('งานการเงิน', 'แผนกการเงินและบัญชี'),
('งานคอมพิวเตอร์ IT', 'แผนกเทคโนโลยีสารสนเทศและคอมพิวเตอร์'),
('งานคลินิก OI', 'คลินิกผู้ป่วยนอก OI'),
('งานซักฟอก', 'งานซักฟอกและแม่บ้าน'),
('งานซ่อมบำรุง', 'งานซ่อมบำรุงและบำรุงรักษา'),
('งานพัสดุกรรม', 'งานจัดซื้อและพัสดุ'),
('งานทำความสะอาด', 'งานทำความสะอาดและสุขาภิบาล'),
('งานธุรการ', 'งานธุรการและสารบรรณ'),
('งานโภชนาการ', 'งานโภชนาการและโรงครัว'),
('งานประกันคุณภาพ', 'งานประกันคุณภาพและพัฒนา'),
('งานผู้ป่วยนอก OPD', 'แผนกผู้ป่วยนอก OPD'),
('งานผู้ป่วยใน IPD', 'แผนกผู้ป่วยใน IPD'),
('งานพิสัย', 'งานพิสัยและบริการ'),
('งานยาและเภสัช', 'แผนกยาและเภสัชกรรม'),
('งานรังสีวิทยา X-ray', 'แผนกรังสีวิทยาและ X-ray'),
('งานสุขาพิบาลชุมชน', 'งานสุขาภิบาลและอนามัยชุมชน'),
('งานอุบัติเหตุฉุกเฉิน ER', 'แผนกอุบัติเหตุและฉุกเฉิน (ER)'),
('งานเทคนิคการแพทย์ Lab', 'แผนกเทคนิคการแพทย์และห้องปฏิบัติการ'),
('งานเคลื่อนกรรม', 'งานเคลื่อนกรรมและบริการเคลื่อนที่'),
('งานเวชระเบียน', 'งานเวชระเบียนและสถิติ'),
('งานแพทย์แผนไทย', 'แผนกการแพทย์แผนไทย'),
('งานไตเทียม', 'งานไตเทียมและบริการไต'),
('แพทย์', 'แพทย์และบุคลากรทางการแพทย์'),
('อื่น ๆ', 'แผนกอื่นๆ ที่ไม่ระบุ')
ON DUPLICATE KEY UPDATE department_name = VALUES(department_name);

-- ประเภทกิจกรรม
INSERT IGNORE INTO activity_types (type_name, type_name_th, description) VALUES
('training', 'การอบรม', 'กิจกรรมการอบรมเพื่อพัฒนาความรู้และทักษะ'),
('seminar', 'การประชุมสัมมนา', 'การประชุมสัมมนาวิชาการ'),
('workshop', 'การประชุมเชิงปฏิบัติการ', 'การประชุมเชิงปฏิบัติการ'),
('conference', 'การประชุมวิชาการ', 'การประชุมวิชาการระดับชาติหรือนานาชาติ'),
('meeting', 'การประชุม', 'การประชุมทั่วไป');

-- รูปแบบการจัด
INSERT IGNORE INTO format_types (format_name, format_name_th) VALUES
('online', 'ออนไลน์'),
('onsite', 'ออนไซต์'),
('hybrid', 'แบบผสม');

-- หมวดหมู่สื่อ
INSERT IGNORE INTO media_categories (category_name) VALUES
('คู่มือการทำงาน'),
('คู่มือการใช้งาน'),
('สื่อการสอน'),
('วิดีโอสอนงาน'),
('วิดีโอสาธิต'),
('วิดีโอสื่อความรู้ผู้รับบริการ'),
('เอกสารวิชาการ'),
('โปสเตอร์'),
('แบบฟอร์ม'),
('ประกาศ'),
('อื่น ๆ');

-- ประเภทสื่อ
INSERT IGNORE INTO media_types (type_code, type_name) VALUES
('image', 'รูปภาพ'),
('pdf', 'PDF'),
('video', 'วิดีโอ');

-- สร้างผู้ใช้งาน Admin เริ่มต้น (password: admin123)
INSERT IGNORE INTO users (employee_id, username, password_hash, full_name, email, position, department, role, auth_method, approval_status) VALUES
('WPH-ADMIN', 'admin', '$2b$10$4/A62l9NYkmFNlXrSwSXsuxwgQMMnhghlUMMykEVoIltPBy0uXyDi', 'ผู้ดูแลระบบ', 'admin@wph.go.th', 'ผู้ดูแลระบบ', 'IT', 'admin', 'local', 'approved');

-- สร้างผู้ใช้งานทดสอบ (password: user123)
INSERT IGNORE INTO users (employee_id, username, password_hash, full_name, email, position, department, role, auth_method, approval_status) VALUES
('WPH-001', 'user001', '$2b$10$Dd/B34KQsmLXeiUHZh5JgOhd7CK5wZXID5bHojqtTcbaF/rF7iFnG', 'ทดสอบ ผู้ใช้งาน', 'user001@wph.go.th', 'พยาบาลวิชาชีพ', 'แผนกผู้ป่วยใน', 'user', 'local', 'approved');

-- ==========================================
-- Views (ตารางเสมือน)
-- ==========================================

-- View สำหรับดูข้อมูลการอบรมพร้อมรายละเอียด
CREATE OR REPLACE VIEW v_training_records_detail AS
SELECT 
    tr.record_id,
    tr.title,
    tr.description,
    tr.start_date,
    tr.end_date,
    tr.hours,
    tr.organization,
    tr.location,
    tr.certificate_number,
    u.employee_id,
    u.full_name,
    u.email,
    u.position,
    u.department,
    at.type_name_th as activity_type,
    ft.format_name_th as format_type,
    tr.created_at,
    tr.updated_at,
    creator.full_name as created_by_name
FROM training_records tr
INNER JOIN users u ON tr.user_id = u.user_id
INNER JOIN activity_types at ON tr.activity_type_id = at.type_id
INNER JOIN format_types ft ON tr.format_type_id = ft.format_id
LEFT JOIN users creator ON tr.created_by = creator.user_id;

-- View สำหรับ Provider-ID Pending Registrations
CREATE OR REPLACE VIEW v_pending_registrations AS
SELECT 
    pr.registration_id,
    pr.provider_id,
    pr.cid,
    pr.full_name,
    pr.email,
    pr.position,
    pr.hospital,
    pr.status,
    pr.created_at,
    pr.rejection_reason,
    approver.full_name as approved_by_name,
    pr.approved_at
FROM provider_registrations pr
LEFT JOIN users approver ON pr.approved_by = approver.user_id
WHERE pr.status = 'pending'
ORDER BY pr.created_at DESC;

-- View สำหรับ Provider-ID Users
CREATE OR REPLACE VIEW v_provider_id_users AS
SELECT 
    u.user_id,
    u.employee_id,
    u.username,
    u.full_name,
    u.email,
    u.cid,
    u.position,
    u.hospital,
    u.provider_id,
    u.approval_status,
    u.is_active,
    approver.full_name as approved_by_name,
    u.approved_at,
    u.created_at
FROM users u
LEFT JOIN users approver ON u.approved_by = approver.user_id
WHERE u.auth_method = 'provider_id'
ORDER BY u.created_at DESC;

-- View สำหรับดูข้อมูลสื่อพร้อมรายละเอียด
CREATE OR REPLACE VIEW v_media_detail AS
SELECT 
    m.media_id,
    m.filename,
    m.original_filename,
    m.file_type,
    m.file_size,
    m.mime_type,
    m.file_path,
    m.title,
    m.description,
    m.category,
    m.tags,
    m.view_count,
    m.download_count,
    m.upload_date,
    m.last_updated,
    d.department_name,
    u.full_name as uploaded_by_name,
    u.username as uploaded_by_username
FROM media m
LEFT JOIN departments d ON m.department_id = d.department_id
LEFT JOIN users u ON m.uploaded_by = u.user_id;
