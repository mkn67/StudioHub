CREATE TABLE IF NOT EXISTS room_reviews (
    review_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    booking_id INT NOT NULL,
    room_id INT NOT NULL,
    customer_id INT NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    review_text VARCHAR(1200) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'published',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (review_id),
    UNIQUE KEY uq_room_reviews_booking (booking_id),
    KEY idx_room_reviews_public (room_id, status, created_at),
    CONSTRAINT chk_room_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT chk_room_reviews_status CHECK (status IN ('published', 'hidden')),
    CONSTRAINT fk_room_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id) ON DELETE CASCADE,
    CONSTRAINT fk_room_reviews_room FOREIGN KEY (room_id) REFERENCES rooms (room_id) ON DELETE CASCADE,
    CONSTRAINT fk_room_reviews_customer FOREIGN KEY (customer_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
