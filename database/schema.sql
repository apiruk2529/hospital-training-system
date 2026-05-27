-- Database Schema for Wat Phleng Hospital Training System
-- โรงพยาบาลวัดเพลง - ระบบจัดเก็บคลังข้อมูลสุขภาพ

CREATE DATABASE IF NOT EXISTS wph_training_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wph_training_db;

-- ตารางผู้ใช้งาน (Users)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    position VARCHAR(100),
    department VARCHAR(100),
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_id (employee_id),
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางประเภทกิจกรรม (Activity Types)
CREATE TABLE activity_types (
    type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    type_name_th VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_type_name (type_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางรูปแบบการจัด (Format Types)
CREATE TABLE format_types (
    format_id INT AUTO_INCREMENT PRIMARY KEY,
    format_name VARCHAR(50) NOT NULL,
    format_name_th VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_format_name (format_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางข้อมูลการอบรม/การประชุม (Training Records)
CREATE TABLE training_records (
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
CREATE TABLE attachments (
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
CREATE TABLE login_logs (
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

-- ตารางหลักสูตรอบรมออนไลน์ (Courses)
CREATE TABLE courses (
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
CREATE TABLE course_materials (
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
CREATE TABLE quizzes (
    quiz_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    type ENUM('pre', 'post') NOT NULL,
    passing_score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    UNIQUE KEY unique_course_quiz (course_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางคำถามแบบทดสอบ (Quiz Questions)
CREATE TABLE quiz_questions (
    question_id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    question_text TEXT NOT NULL,
    order_index INT DEFAULT 0,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางตัวเลือกคำตอบ (Quiz Answers)
CREATE TABLE quiz_answers (
    answer_id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    answer_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางความคืบหน้าผู้เรียน (User Course Progress)
CREATE TABLE user_course_progress (
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

-- Insert ข้อมูลเริ่มต้น (Initial Data)

-- ประเภทกิจกรรม
INSERT INTO activity_types (type_name, type_name_th, description) VALUES
('training', 'การอบรม', 'กิจกรรมการอบรมเพื่อพัฒนาความรู้และทักษะ'),
('seminar', 'การประชุมสัมมนา', 'การประชุมสัมมนาวิชาการ'),
('workshop', 'การประชุมเชิงปฏิบัติการ', 'การประชุมเชิงปฏิบัติการ'),
('conference', 'การประชุมวิชาการ', 'การประชุมวิชาการระดับชาติหรือนานาชาติ'),
('meeting', 'การประชุม', 'การประชุมทั่วไป');

-- รูปแบบการจัด
INSERT INTO format_types (format_name, format_name_th) VALUES
('online', 'ออนไลน์'),
('onsite', 'ออนไซต์'),
('hybrid', 'แบบผสม');

-- สร้างผู้ใช้งาน Admin เริ่มต้น (password: admin123)
-- Password hash สำหรับ 'admin123' (ใช้ bcrypt)
INSERT INTO users (employee_id, username, password_hash, full_name, email, position, department, role) VALUES
('WPH-ADMIN', 'admin', '$2b$10$rKZvVxwvXGKGHPQvQxvJxOYxJxvXGKGHPQvQxvJxOYxJxvXGKGHPQ', 'ผู้ดูแลระบบ', 'admin@wph.go.th', 'ผู้ดูแลระบบ', 'IT', 'admin');

-- สร้างผู้ใช้งานทดสอบ (password: user123)
INSERT INTO users (employee_id, username, password_hash, full_name, email, position, department, role) VALUES
('WPH-001', 'user001', '$2b$10$rKZvVxwvXGKGHPQvQxvJxOYxJxvXGKGHPQvQxvJxOYxJxvXGKGHPQ', 'ทดสอบ ผู้ใช้งาน', 'user001@wph.go.th', 'พยาบาลวิชาชีพ', 'แผนกผู้ป่วยใน', 'user');

-- View สำหรับดูข้อมูลการอบรมพร้อมรายละเอียด
CREATE VIEW v_training_records_detail AS
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
