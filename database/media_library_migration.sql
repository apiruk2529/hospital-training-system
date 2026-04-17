-- Media Library Migration Script
-- คลังจัดเก็บสื่อข้อมูลสุขภาพ
-- Created: 2025-12-02

USE wph_training_db;

-- สร้างตารางแผนก (Departments)
CREATE TABLE IF NOT EXISTS departments (
    department_id INT PRIMARY KEY AUTO_INCREMENT,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_department_name (department_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- สร้างตารางสื่อ (Media)
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

-- Insert ข้อมูลแผนกทั้งหมด (All Departments)
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

-- สร้าง View สำหรับดูข้อมูลสื่อพร้อมรายละเอียด
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
