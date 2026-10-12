-- Database initialization for MySQL 8.0
USE studio_db;

-- System health test table for Foundation Scaffolding verification
CREATE TABLE IF NOT EXISTS system_health (
    id INT AUTO_INCREMENT PRIMARY KEY,
    note VARCHAR(100) NOT NULL,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial sample record for testing
INSERT INTO system_health (note) 
VALUES ('Foundation Scaffolding health check initialized successfully (MySQL 8.0)');
