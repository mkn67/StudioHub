ALTER TABLE service_orders
    ADD COLUMN included_duration_minutes_snapshot INT UNSIGNED NULL AFTER unit_price_snapshot,
    ADD COLUMN included_sessions_snapshot INT UNSIGNED NULL AFTER included_duration_minutes_snapshot,
    ADD COLUMN included_revisions_snapshot INT UNSIGNED NULL AFTER included_sessions_snapshot;
