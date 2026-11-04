CREATE TABLE host_room_types (
    room_type_id INT AUTO_INCREMENT PRIMARY KEY,
    studio_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    capacity INT UNSIGNED NULL,
    area DECIMAL(8,2) NULL,
    amenities JSON NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_host_room_type_status CHECK (status IN ('active','inactive')),
    CONSTRAINT chk_host_room_type_capacity CHECK (capacity IS NULL OR capacity > 0),
    CONSTRAINT chk_host_room_type_area CHECK (area IS NULL OR area > 0),
    CONSTRAINT uq_host_room_type_name UNIQUE (studio_id, name),
    CONSTRAINT fk_host_room_type_studio FOREIGN KEY (studio_id) REFERENCES studios(studio_id) ON DELETE CASCADE,
    INDEX idx_host_room_types_studio (studio_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE rooms ADD COLUMN room_type_id INT NULL;
ALTER TABLE rooms ADD CONSTRAINT fk_rooms_host_type FOREIGN KEY (room_type_id) REFERENCES host_room_types(room_type_id) ON DELETE SET NULL;

CREATE TABLE host_legal_profiles (
    host_id INT PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL,
    legal_name VARCHAR(180) NOT NULL,
    tax_id VARCHAR(30) NULL,
    legal_address VARCHAR(255) NOT NULL,
    representative_name VARCHAR(150) NULL,
    representative_title VARCHAR(100) NULL,
    contact_email VARCHAR(150) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'incomplete',
    decision_reason TEXT NULL,
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_host_legal_entity CHECK (entity_type IN ('individual','company')),
    CONSTRAINT chk_host_legal_status CHECK (status IN ('incomplete','submitted','verified','rejected')),
    CONSTRAINT fk_host_legal_user FOREIGN KEY (host_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_host_legal_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_host_legal_tax_id (tax_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE host_contracts (
    contract_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    host_id INT NOT NULL,
    studio_id INT NOT NULL,
    contract_code VARCHAR(80) NOT NULL UNIQUE,
    title VARCHAR(180) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    effective_from DATE NULL,
    effective_to DATE NULL,
    document_storage_key CHAR(64) NULL,
    document_name VARCHAR(255) NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_host_contract_status CHECK (status IN ('draft','pending','active','expired','terminated')),
    CONSTRAINT chk_host_contract_dates CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),
    CONSTRAINT fk_host_contract_host FOREIGN KEY (host_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_host_contract_studio FOREIGN KEY (studio_id) REFERENCES studios(studio_id) ON DELETE RESTRICT,
    CONSTRAINT fk_host_contract_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_host_contracts_host (host_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE contract_document_access_grants (
    grant_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contract_id BIGINT UNSIGNED NOT NULL,
    host_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contract_access_contract FOREIGN KEY (contract_id) REFERENCES host_contracts(contract_id) ON DELETE CASCADE,
    CONSTRAINT fk_contract_access_host FOREIGN KEY (host_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_contract_access_host (host_id, contract_id, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE refund_exception_actions (
    action_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    refund_kind VARCHAR(20) NOT NULL,
    refund_id BIGINT UNSIGNED NOT NULL,
    action VARCHAR(30) NOT NULL,
    previous_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,
    evidence_reference VARCHAR(255) NULL,
    reason TEXT NULL,
    admin_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_refund_action_kind CHECK (refund_kind IN ('booking','service_order')),
    CONSTRAINT chk_refund_action_type CHECK (action IN ('confirm_succeeded','mark_failed')),
    CONSTRAINT fk_refund_action_admin FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    INDEX idx_refund_actions_refund (refund_kind, refund_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
