CREATE TABLE service_packages (
    package_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    studio_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    category VARCHAR(50) NULL,
    pricing_unit VARCHAR(20) NOT NULL,
    base_price DECIMAL(12,2) NOT NULL,
    included_duration_minutes INT UNSIGNED NULL,
    included_sessions INT UNSIGNED NULL,
    included_revisions INT UNSIGNED NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_service_package_unit CHECK (pricing_unit IN ('hour','session','day','song','project')),
    CONSTRAINT chk_service_package_price CHECK (base_price >= 0),
    CONSTRAINT chk_service_package_status CHECK (status IN ('draft','active','inactive')),
    CONSTRAINT fk_service_package_studio FOREIGN KEY (studio_id) REFERENCES studios(studio_id) ON DELETE RESTRICT,
    INDEX idx_service_packages_public (studio_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE service_package_items (
    item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    package_id BIGINT UNSIGNED NOT NULL,
    item_type VARCHAR(30) NOT NULL,
    name VARCHAR(150) NOT NULL,
    quantity INT UNSIGNED NULL,
    duration_minutes INT UNSIGNED NULL,
    details TEXT NULL,
    CONSTRAINT chk_package_item_type CHECK (item_type IN ('service','session','staff','equipment','revision','deliverable')),
    CONSTRAINT fk_package_item_package FOREIGN KEY (package_id) REFERENCES service_packages(package_id) ON DELETE CASCADE,
    INDEX idx_package_items_package (package_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE production_projects (
    project_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    studio_id INT NOT NULL,
    project_code VARCHAR(80) NOT NULL,
    project_type VARCHAR(20) NOT NULL DEFAULT 'other',
    private_name VARCHAR(255) NULL,
    description TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'planned',
    confidentiality_level VARCHAR(20) NOT NULL DEFAULT 'private',
    target_date DATE NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_code UNIQUE (project_code),
    CONSTRAINT chk_project_type CHECK (project_type IN ('single','ep','album','cover','other')),
    CONSTRAINT chk_project_status CHECK (status IN ('planned','active','on_hold','completed','cancelled')),
    CONSTRAINT chk_project_confidentiality CHECK (confidentiality_level IN ('private','restricted')),
    CONSTRAINT fk_project_customer FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_project_studio FOREIGN KEY (studio_id) REFERENCES studios(studio_id) ON DELETE RESTRICT,
    INDEX idx_projects_customer (customer_id, status),
    INDEX idx_projects_studio (studio_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_members (
    project_id BIGINT UNSIGNED NOT NULL,
    user_id INT NOT NULL,
    access_role VARCHAR(30) NOT NULL,
    can_view_confidential TINYINT(1) NOT NULL DEFAULT 0,
    granted_by INT NULL,
    granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME NULL,
    PRIMARY KEY (project_id, user_id),
    CONSTRAINT chk_project_member_role CHECK (access_role IN ('host','staff','collaborator')),
    CONSTRAINT fk_project_member_project FOREIGN KEY (project_id) REFERENCES production_projects(project_id) ON DELETE RESTRICT,
    CONSTRAINT fk_project_member_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_project_member_grantor FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_project_members_user (user_id, revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_tracks (
    track_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    internal_code VARCHAR(80) NOT NULL,
    private_title VARCHAR(255) NULL,
    production_status VARCHAR(30) NOT NULL DEFAULT 'planned',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_track_code UNIQUE (project_id, internal_code),
    CONSTRAINT chk_track_status CHECK (production_status IN ('planned','recording','editing','mixing','mastering','delivered')),
    CONSTRAINT fk_track_project FOREIGN KEY (project_id) REFERENCES production_projects(project_id) ON DELETE RESTRICT,
    INDEX idx_tracks_project (project_id, production_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE booking_services (
    booking_service_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    package_id BIGINT UNSIGNED NULL,
    package_name_snapshot VARCHAR(150) NOT NULL,
    pricing_unit_snapshot VARCHAR(20) NOT NULL,
    unit_price_snapshot DECIMAL(12,2) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    CONSTRAINT chk_booking_service_amount CHECK (unit_price_snapshot >= 0 AND subtotal >= 0 AND quantity > 0),
    CONSTRAINT fk_booking_service_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_service_package FOREIGN KEY (package_id) REFERENCES service_packages(package_id) ON DELETE SET NULL,
    INDEX idx_booking_services_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE service_orders (
    order_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_code VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    studio_id INT NOT NULL,
    package_id BIGINT UNSIGNED NULL,
    project_id BIGINT UNSIGNED NULL,
    package_name_snapshot VARCHAR(150) NOT NULL,
    pricing_unit_snapshot VARCHAR(20) NOT NULL,
    unit_price_snapshot DECIMAL(12,2) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_service_order_amount CHECK (unit_price_snapshot >= 0 AND total_amount >= 0 AND quantity > 0),
    CONSTRAINT chk_service_order_status CHECK (status IN ('pending','paid','cancelled','expired')),
    CONSTRAINT fk_service_order_customer FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_service_order_studio FOREIGN KEY (studio_id) REFERENCES studios(studio_id) ON DELETE RESTRICT,
    CONSTRAINT fk_service_order_package FOREIGN KEY (package_id) REFERENCES service_packages(package_id) ON DELETE SET NULL,
    CONSTRAINT fk_service_order_project FOREIGN KEY (project_id) REFERENCES production_projects(project_id) ON DELETE RESTRICT,
    INDEX idx_service_orders_customer (customer_id, status),
    INDEX idx_service_orders_studio (studio_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE service_order_payments (
    payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'sandbox_qr',
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    transaction_code VARCHAR(100) NOT NULL UNIQUE,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_service_order_payment_amount CHECK (amount >= 0),
    CONSTRAINT chk_service_order_payment_status CHECK (status IN ('pending','success','failed')),
    CONSTRAINT fk_service_order_payment_order FOREIGN KEY (order_id) REFERENCES service_orders(order_id) ON DELETE RESTRICT,
    INDEX idx_service_order_payment_order (order_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_bookings (
    project_id BIGINT UNSIGNED NOT NULL,
    booking_id INT NOT NULL,
    purpose VARCHAR(100) NULL,
    PRIMARY KEY (project_id, booking_id),
    CONSTRAINT uq_project_booking UNIQUE (booking_id),
    CONSTRAINT fk_project_booking_project FOREIGN KEY (project_id) REFERENCES production_projects(project_id) ON DELETE RESTRICT,
    CONSTRAINT fk_project_booking_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE consumable_items (
    item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    studio_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    on_hand DECIMAL(12,3) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_consumable_on_hand CHECK (on_hand >= 0),
    CONSTRAINT chk_consumable_status CHECK (status IN ('active','inactive')),
    CONSTRAINT fk_consumable_studio FOREIGN KEY (studio_id) REFERENCES studios(studio_id) ON DELETE RESTRICT,
    INDEX idx_consumables_studio (studio_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_movements (
    movement_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_id BIGINT UNSIGNED NOT NULL,
    booking_id INT NULL,
    movement_type VARCHAR(20) NOT NULL,
    quantity_delta DECIMAL(12,3) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    actor_user_id INT NULL,
    reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_inventory_idempotency UNIQUE (idempotency_key),
    CONSTRAINT chk_inventory_movement_type CHECK (movement_type IN ('receipt','consume','adjust','reversal')),
    CONSTRAINT chk_inventory_nonzero CHECK (quantity_delta <> 0),
    CONSTRAINT fk_movement_item FOREIGN KEY (item_id) REFERENCES consumable_items(item_id) ON DELETE RESTRICT,
    CONSTRAINT fk_movement_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT,
    CONSTRAINT fk_movement_actor FOREIGN KEY (actor_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_inventory_item_time (item_id, created_at),
    INDEX idx_inventory_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
