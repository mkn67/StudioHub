ALTER TABLE inventory_movements
    ADD COLUMN reversal_of_movement_id BIGINT UNSIGNED NULL AFTER idempotency_key,
    ADD CONSTRAINT uq_inventory_reversal UNIQUE (reversal_of_movement_id),
    ADD CONSTRAINT fk_inventory_reversal FOREIGN KEY (reversal_of_movement_id) REFERENCES inventory_movements(movement_id) ON DELETE RESTRICT;
