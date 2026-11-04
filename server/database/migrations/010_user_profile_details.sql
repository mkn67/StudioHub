ALTER TABLE users
    ADD COLUMN date_of_birth DATE NULL AFTER phone,
    ADD COLUMN address VARCHAR(255) NULL AFTER date_of_birth;
