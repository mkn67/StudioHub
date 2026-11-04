CREATE TABLE email_change_requests (
    request_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    old_email VARCHAR(150) NOT NULL,
    new_email VARCHAR(150) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    consumed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_email_change_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_email_change_user_pending (user_id, consumed_at, expires_at),
    INDEX idx_email_change_new_email (new_email, consumed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE account_notification_preferences (
    user_id INT PRIMARY KEY,
    email_booking_updates TINYINT(1) NOT NULL DEFAULT 1,
    email_product_updates TINYINT(1) NOT NULL DEFAULT 0,
    sms_booking_updates TINYINT(1) NOT NULL DEFAULT 0,
    in_app_updates TINYINT(1) NOT NULL DEFAULT 1,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE identity_verifications (
    verification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    legal_name VARCHAR(150) NOT NULL,
    document_type VARCHAR(30) NOT NULL,
    document_last4 VARCHAR(4) NOT NULL,
    document_storage_key CHAR(64) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_mime VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    decision_reason TEXT NULL,
    reviewed_by INT NULL,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_identity_verification_status CHECK (status IN ('pending','approved','rejected')),
    CONSTRAINT chk_identity_document_type CHECK (document_type IN ('national_id','passport','business_registration')),
    CONSTRAINT fk_identity_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_identity_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_identity_verification_user (user_id, submitted_at),
    INDEX idx_identity_verification_status (status, submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE studio_policies (
    studio_id INT PRIMARY KEY,
    payment_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 15,
    deposit_percent DECIMAL(5,2) NOT NULL DEFAULT 30.00,
    cancel_hours SMALLINT UNSIGNED NOT NULL DEFAULT 24,
    change_hours SMALLINT UNSIGNED NOT NULL DEFAULT 24,
    refund_tiers JSON NULL,
    overtime_per_30m INT UNSIGNED NOT NULL DEFAULT 0,
    open_hour TINYINT UNSIGNED NOT NULL DEFAULT 8,
    close_hour TINYINT UNSIGNED NOT NULL DEFAULT 22,
    updated_by INT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_policy_payment_minutes CHECK (payment_minutes BETWEEN 1 AND 1440),
    CONSTRAINT chk_policy_deposit_percent CHECK (deposit_percent BETWEEN 0 AND 100),
    CONSTRAINT chk_policy_hours CHECK (open_hour < close_hour AND close_hour <= 24),
    CONSTRAINT fk_studio_policy_studio FOREIGN KEY (studio_id) REFERENCES studios(studio_id) ON DELETE CASCADE,
    CONSTRAINT fk_studio_policy_user FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE studios ADD COLUMN cover_url VARCHAR(255) NULL;

CREATE TABLE equipment_images (
    image_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_equipment_image_equipment FOREIGN KEY (equipment_id) REFERENCES equipments(equipment_id) ON DELETE CASCADE,
    INDEX idx_equipment_images_primary (equipment_id, is_primary, image_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE bookings ADD COLUMN policy_snapshot JSON NULL;
