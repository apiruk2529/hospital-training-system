-- Migration Script for MOPH Provider-ID OAuth Integration
-- โรงพยาบาลวัดเพลง - เพิ่มระบบ Provider-ID

USE wph_training_db;

-- Add Provider-ID fields to users table
ALTER TABLE users
ADD COLUMN cid VARCHAR(13) COMMENT 'Citizen ID from Provider-ID',
ADD COLUMN hospital VARCHAR(200) COMMENT 'Hospital name from Provider-ID',
ADD COLUMN provider_id VARCHAR(100) UNIQUE COMMENT 'Unique Provider-ID identifier',
ADD COLUMN auth_method ENUM('local', 'provider_id') DEFAULT 'local' COMMENT 'Authentication method',
ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved' COMMENT 'Approval status for Provider-ID registrations',
ADD COLUMN approved_by INT COMMENT 'Admin who approved the registration',
ADD COLUMN approved_at TIMESTAMP NULL COMMENT 'Approval timestamp',
ADD COLUMN rejection_reason TEXT COMMENT 'Reason for rejection if applicable',
ADD INDEX idx_provider_id (provider_id),
ADD INDEX idx_cid (cid),
ADD INDEX idx_approval_status (approval_status),
ADD FOREIGN KEY fk_approved_by (approved_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- Create provider_registrations table for temporary registration data
CREATE TABLE provider_registrations (
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

-- Update existing users to have 'local' auth method and 'approved' status
UPDATE users 
SET auth_method = 'local', 
    approval_status = 'approved' 
WHERE auth_method IS NULL;

-- Create view for pending registrations with details
CREATE VIEW v_pending_registrations AS
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

-- Create view for all Provider-ID users
CREATE VIEW v_provider_id_users AS
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

-- Add comment to track migration
INSERT INTO login_logs (username, status, ip_address, user_agent) 
VALUES ('SYSTEM', 'success', '127.0.0.1', 'Provider-ID Migration Script - Database schema updated successfully');
