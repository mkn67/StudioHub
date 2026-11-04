ALTER TABLE project_members
    ADD COLUMN can_manage_tracks TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN can_manage_sessions TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN can_manage_files TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN can_download_files TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE project_bookings
    ADD COLUMN service_order_id BIGINT UNSIGNED NULL AFTER booking_id,
    ADD CONSTRAINT fk_project_booking_service_order FOREIGN KEY (service_order_id) REFERENCES service_orders(order_id) ON DELETE RESTRICT,
    ADD INDEX idx_project_booking_service_order (service_order_id);

CREATE TABLE project_files (
    file_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    uploaded_by INT NOT NULL,
    storage_key CHAR(64) NOT NULL UNIQUE,
    original_name VARCHAR(255) NOT NULL,
    media_type VARCHAR(100) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,
    sha256 CHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_project_file_status CHECK (status IN ('active','deleted')),
    CONSTRAINT fk_project_file_project FOREIGN KEY (project_id) REFERENCES production_projects(project_id) ON DELETE RESTRICT,
    CONSTRAINT fk_project_file_uploader FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    INDEX idx_project_files_project (project_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_revisions (
    revision_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    track_id BIGINT UNSIGNED NOT NULL,
    service_order_id BIGINT UNSIGNED NOT NULL,
    requested_by INT NOT NULL,
    revision_number INT UNSIGNED NOT NULL,
    request_note TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'requested',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_project_revision_status CHECK (status IN ('requested','in_progress','completed','cancelled')),
    CONSTRAINT fk_project_revision_project FOREIGN KEY (project_id) REFERENCES production_projects(project_id) ON DELETE RESTRICT,
    CONSTRAINT fk_project_revision_track FOREIGN KEY (track_id) REFERENCES project_tracks(track_id) ON DELETE RESTRICT,
    CONSTRAINT fk_project_revision_order FOREIGN KEY (service_order_id) REFERENCES service_orders(order_id) ON DELETE RESTRICT,
    CONSTRAINT fk_project_revision_user FOREIGN KEY (requested_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    INDEX idx_project_revisions_track (track_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE service_order_entitlements (
    entitlement_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    entitlement_type VARCHAR(20) NOT NULL,
    included_quantity INT UNSIGNED NOT NULL,
    consumed_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT uq_order_entitlement UNIQUE (order_id, entitlement_type),
    CONSTRAINT chk_entitlement_type CHECK (entitlement_type IN ('sessions','minutes','revisions')),
    CONSTRAINT chk_entitlement_usage CHECK (consumed_quantity <= included_quantity),
    CONSTRAINT fk_entitlement_order FOREIGN KEY (order_id) REFERENCES service_orders(order_id) ON DELETE RESTRICT,
    INDEX idx_entitlements_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
