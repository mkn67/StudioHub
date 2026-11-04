CREATE TABLE revoked_jwt_tokens (
    jti CHAR(64) NOT NULL PRIMARY KEY,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_revoked_jwt_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE api_rate_limits (
    bucket_key CHAR(64) NOT NULL PRIMARY KEY,
    scope VARCHAR(40) NOT NULL,
    window_started_at DATETIME NOT NULL,
    request_count INT UNSIGNED NOT NULL,
    expires_at DATETIME NOT NULL,
    INDEX idx_api_rate_limits_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
