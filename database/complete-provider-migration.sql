-- Complete remaining Provider-ID migration
-- Run this if provider_registrations table doesn't exist

USE wph_training_db;

-- Create provider_registrations table for temporary registration data
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

-- Create view for pending registrations with details
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

-- Create view for all Provider-ID users
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

-- Add comment to track migration
INSERT INTO login_logs (username, status, ip_address, user_agent) 
VALUES ('SYSTEM', 'success', '127.0.0.1', 'Provider-ID Migration - Completed remaining tables and views');
