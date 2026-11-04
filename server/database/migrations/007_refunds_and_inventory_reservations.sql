CREATE TABLE booking_refunds (
    refund_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL UNIQUE,
    booking_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    reason VARCHAR(50) NOT NULL,
    transaction_code VARCHAR(100) NOT NULL UNIQUE,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_booking_refund_amount CHECK (amount > 0),
    CONSTRAINT chk_booking_refund_status CHECK (status IN ('pending','success','failed')),
    CONSTRAINT fk_booking_refund_payment FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_refund_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT,
    INDEX idx_booking_refunds_booking (booking_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE service_order_refunds (
    refund_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT UNSIGNED NOT NULL UNIQUE,
    order_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    reason VARCHAR(50) NOT NULL,
    transaction_code VARCHAR(100) NOT NULL UNIQUE,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_service_refund_amount CHECK (amount > 0),
    CONSTRAINT chk_service_refund_status CHECK (status IN ('pending','success','failed')),
    CONSTRAINT fk_service_refund_payment FOREIGN KEY (payment_id) REFERENCES service_order_payments(payment_id) ON DELETE RESTRICT,
    CONSTRAINT fk_service_refund_order FOREIGN KEY (order_id) REFERENCES service_orders(order_id) ON DELETE RESTRICT,
    INDEX idx_service_refunds_order (order_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_reservations (
    reservation_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_id BIGINT UNSIGNED NOT NULL,
    booking_id INT NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'reserved',
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_inventory_reservation UNIQUE (item_id, booking_id),
    CONSTRAINT chk_inventory_reservation_quantity CHECK (quantity > 0),
    CONSTRAINT chk_inventory_reservation_status CHECK (status IN ('reserved','consumed','released')),
    CONSTRAINT fk_inventory_reservation_item FOREIGN KEY (item_id) REFERENCES consumable_items(item_id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_reservation_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_reservation_user FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    INDEX idx_inventory_reservation_booking (booking_id, status),
    INDEX idx_inventory_reservation_item (item_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
