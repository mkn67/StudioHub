-- ==============================================================================
-- Schema: Studio & Equipment Rental Management System
-- Target: MySQL 8.0.16+ (InnoDB, utf8mb4, snake_case)
-- Specifications: Báo cáo đồ án mục 3.2 và Implementation Plan (áp dụng D1-D15)
-- ==============================================================================

-- 1. Bảng roles: Vai trò người dùng trong hệ thống
CREATE TABLE IF NOT EXISTS roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng users: Tài khoản người dùng (Admin, Host, Customer)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    avatar_url VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_status CHECK (status IN ('active', 'locked')),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (role_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng studios: Cơ sở studio do Host làm chủ
CREATE TABLE IF NOT EXISTS studios (
    studio_id INT AUTO_INCREMENT PRIMARY KEY,
    host_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    address VARCHAR(255) NOT NULL,
    district VARCHAR(100) NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'TP. Hồ Chí Minh',
    phone VARCHAR(20) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_studios_status CHECK (status IN ('active', 'inactive')),
    CONSTRAINT fk_studios_host FOREIGN KEY (host_id) REFERENCES users (user_id) ON DELETE RESTRICT,
    INDEX idx_studios_host (host_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng space_types: Danh mục loại hình không gian studio
CREATE TABLE IF NOT EXISTS space_types (
    space_type_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng amenities: Tiện ích phòng studio
CREATE TABLE IF NOT EXISTS amenities (
    amenity_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng rooms: Phòng cho thuê tại studio
CREATE TABLE IF NOT EXISTS rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    studio_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    area DECIMAL(8, 2) NOT NULL,
    ceiling_height DECIMAL(4, 2) NULL,
    capacity INT UNSIGNED NOT NULL,
    soundproof_level VARCHAR(50) NULL,
    power_specs VARCHAR(100) NULL,
    rules TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_rooms_area CHECK (area > 0),
    CONSTRAINT chk_rooms_capacity CHECK (capacity > 0),
    CONSTRAINT chk_rooms_status CHECK (status IN ('active', 'maintenance', 'inactive')),
    CONSTRAINT fk_rooms_studio FOREIGN KEY (studio_id) REFERENCES studios (studio_id) ON DELETE RESTRICT,
    INDEX idx_rooms_studio_status (studio_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng room_space_types: Liên kết phòng và loại hình không gian
CREATE TABLE IF NOT EXISTS room_space_types (
    room_id INT NOT NULL,
    space_type_id INT NOT NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (room_id, space_type_id),
    CONSTRAINT fk_rst_room FOREIGN KEY (room_id) REFERENCES rooms (room_id) ON DELETE CASCADE,
    CONSTRAINT fk_rst_type FOREIGN KEY (space_type_id) REFERENCES space_types (space_type_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Bảng room_amenities: Liên kết phòng và tiện ích
CREATE TABLE IF NOT EXISTS room_amenities (
    room_id INT NOT NULL,
    amenity_id INT NOT NULL,
    PRIMARY KEY (room_id, amenity_id),
    CONSTRAINT fk_ra_room FOREIGN KEY (room_id) REFERENCES rooms (room_id) ON DELETE CASCADE,
    CONSTRAINT fk_ra_amenity FOREIGN KEY (amenity_id) REFERENCES amenities (amenity_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Bảng room_images: Hình ảnh của phòng
CREATE TABLE IF NOT EXISTS room_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_images_room FOREIGN KEY (room_id) REFERENCES rooms (room_id) ON DELETE CASCADE,
    INDEX idx_room_images_sort (room_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Bảng room_rates: Bảng giá cho thuê phòng
CREATE TABLE IF NOT EXISTS room_rates (
    rate_id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    rate_unit VARCHAR(20) NOT NULL,
    unit_minutes INT UNSIGNED NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    minimum_units INT UNSIGNED NOT NULL DEFAULT 1,
    maximum_units INT UNSIGNED NULL,
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_rates_unit CHECK (rate_unit IN ('hour', 'half_day', 'day', 'week', 'month', 'session')),
    CONSTRAINT chk_rates_unit_minutes CHECK (unit_minutes > 0),
    CONSTRAINT chk_rates_price CHECK (unit_price >= 0),
    CONSTRAINT chk_rates_min_units CHECK (minimum_units > 0),
    CONSTRAINT chk_rates_max_units CHECK (maximum_units IS NULL OR maximum_units >= minimum_units),
    CONSTRAINT chk_rates_date_range CHECK (effective_to IS NULL OR effective_to >= effective_from),
    CONSTRAINT chk_rates_status CHECK (status IN ('active', 'inactive')),
    CONSTRAINT fk_rates_room FOREIGN KEY (room_id) REFERENCES rooms (room_id) ON DELETE CASCADE,
    INDEX idx_room_rates_room_status (room_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Bảng equipment_categories: Danh mục thiết bị thuộc studio
CREATE TABLE IF NOT EXISTS equipment_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    studio_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_eq_cat_studio FOREIGN KEY (studio_id) REFERENCES studios (studio_id) ON DELETE CASCADE,
    INDEX idx_eq_cat_studio (studio_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Bảng equipments: Thiết bị và đạo cụ cho thuê
CREATE TABLE IF NOT EXISTS equipments (
    equipment_id INT AUTO_INCREMENT PRIMARY KEY,
    studio_id INT NOT NULL,
    category_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    brand VARCHAR(100) NULL,
    description TEXT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    pricing_unit VARCHAR(20) NOT NULL DEFAULT 'session',
    total_quantity INT UNSIGNED NOT NULL,
    image_url VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_equipments_pricing_unit CHECK (pricing_unit IN ('session', 'hour')),
    CONSTRAINT chk_equipments_price CHECK (unit_price >= 0),
    CONSTRAINT chk_equipments_qty CHECK (total_quantity >= 0),
    CONSTRAINT chk_equipments_status CHECK (status IN ('active', 'maintenance', 'inactive')),
    CONSTRAINT fk_eq_studio FOREIGN KEY (studio_id) REFERENCES studios (studio_id) ON DELETE CASCADE,
    CONSTRAINT fk_eq_category FOREIGN KEY (category_id) REFERENCES equipment_categories (category_id) ON DELETE RESTRICT,
    INDEX idx_equipments_studio_status (studio_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Bảng bookings: Đơn đặt phòng và lịch thuê
CREATE TABLE IF NOT EXISTS bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_code VARCHAR(50) NOT NULL UNIQUE,
    room_id INT NOT NULL,
    customer_id INT NOT NULL,
    rate_id INT NOT NULL,
    booking_type VARCHAR(20) NOT NULL DEFAULT 'short_term',
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    busy_start DATETIME NOT NULL,
    busy_end DATETIME NOT NULL,
    party_size INT UNSIGNED NOT NULL DEFAULT 1,
    rate_unit VARCHAR(20) NOT NULL,
    rental_units DECIMAL(8, 2) NOT NULL,
    room_unit_price DECIMAL(12, 2) NOT NULL,
    room_amount DECIMAL(12, 2) NOT NULL,
    equipment_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,
    deposit_amount DECIMAL(12, 2) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(150) NOT NULL,
    note TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_bookings_type CHECK (booking_type IN ('short_term', 'long_term')),
    CONSTRAINT chk_bookings_time_order CHECK (end_time > start_time),
    CONSTRAINT chk_bookings_busy_order CHECK (busy_end > busy_start),
    CONSTRAINT chk_bookings_party_size CHECK (party_size > 0),
    CONSTRAINT chk_bookings_rental_units CHECK (rental_units > 0),
    CONSTRAINT chk_bookings_total_amount CHECK (total_amount >= 0),
    CONSTRAINT chk_bookings_deposit_amount CHECK (deposit_amount >= 0),
    CONSTRAINT chk_bookings_status CHECK (status IN ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'rejected', 'expired')),
    CONSTRAINT chk_bookings_pending_expires CHECK (status <> 'pending' OR expires_at IS NOT NULL),
    CONSTRAINT chk_bookings_completed_time CHECK (status <> 'completed' OR completed_at IS NOT NULL),
    CONSTRAINT fk_bookings_room FOREIGN KEY (room_id) REFERENCES rooms (room_id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES users (user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_rate FOREIGN KEY (rate_id) REFERENCES room_rates (rate_id) ON DELETE RESTRICT,
    INDEX idx_bookings_room_lookup (room_id, status, busy_start, busy_end),
    INDEX idx_bookings_expires (status, expires_at),
    INDEX idx_bookings_completed (status, completed_at),
    INDEX idx_bookings_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Bảng booking_details: Chi tiết thiết bị thuê kèm trong đơn
CREATE TABLE IF NOT EXISTS booking_details (
    detail_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    equipment_id INT NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    pricing_unit VARCHAR(20) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    equipment_hours DECIMAL(8, 2) NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    CONSTRAINT chk_bd_qty CHECK (quantity > 0),
    CONSTRAINT chk_bd_pricing_unit CHECK (pricing_unit IN ('session', 'hour')),
    CONSTRAINT chk_bd_unit_price CHECK (unit_price >= 0),
    CONSTRAINT chk_bd_subtotal CHECK (subtotal >= 0),
    CONSTRAINT fk_bd_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id) ON DELETE CASCADE,
    CONSTRAINT fk_bd_equipment FOREIGN KEY (equipment_id) REFERENCES equipments (equipment_id) ON DELETE RESTRICT,
    INDEX idx_booking_details_eq_bk (equipment_id, booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Bảng payments: Giao dịch thanh toán cọc/hoàn tất đơn
CREATE TABLE IF NOT EXISTS payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    payment_type VARCHAR(20) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'sandbox_qr',
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    transaction_code VARCHAR(100) NOT NULL UNIQUE,
    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_payments_type CHECK (payment_type IN ('deposit', 'remaining', 'full')),
    CONSTRAINT chk_payments_status CHECK (status IN ('pending', 'success', 'failed')),
    CONSTRAINT chk_payments_amount CHECK (amount > 0),
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id) ON DELETE CASCADE,
    INDEX idx_payments_lookup (booking_id, payment_type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Bảng audit_logs: Nhật ký hoạt động và kiểm toán hệ thống
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    metadata JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL,
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
