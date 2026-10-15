-- Apply once to databases created with the initial schema.sql.
ALTER TABLE orders ADD COLUMN public_consent INTEGER NOT NULL DEFAULT 0 CHECK(public_consent IN (0,1));
ALTER TABLE orders ADD COLUMN public_chosen_name TEXT;
ALTER TABLE orders ADD COLUMN public_consent_at TEXT;
