CREATE TABLE IF NOT EXISTS service_order_items (
    order_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    item_type VARCHAR(30) NOT NULL,
    name_snapshot VARCHAR(150) NOT NULL,
    quantity_snapshot INT UNSIGNED NULL,
    duration_minutes_snapshot INT UNSIGNED NULL,
    details_snapshot TEXT NULL,
    CONSTRAINT fk_service_order_item_order FOREIGN KEY (order_id) REFERENCES service_orders(order_id) ON DELETE RESTRICT,
    INDEX idx_service_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
