-- Allows a zero-value remaining-payment record when deposit_amount equals total_amount.
-- Safe additive constraint adjustment; does not modify existing payment rows.
ALTER TABLE payments
    DROP CHECK chk_payments_amount,
    ADD CONSTRAINT chk_payments_amount CHECK (amount >= 0);
