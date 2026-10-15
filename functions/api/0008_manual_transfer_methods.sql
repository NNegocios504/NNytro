-- Extend the payment ledger for USD and ARS transfers confirmed manually by the owner.
-- The ledger's amount/currency remain the USD quote equivalent; the actual transfer
-- amount, currency and agreed exchange rate are recorded in receipt_json.
PRAGMA foreign_keys=OFF;
DROP INDEX IF EXISTS payments_one_active_attempt_per_step;
CREATE TABLE payments_new (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES orders(id),
 provider TEXT NOT NULL CHECK(provider IN ('mercadopago','paypal','pix','transfer_usd','transfer_ars')),
 leg TEXT NOT NULL CHECK(leg IN ('full','advance','balance')),
 amount REAL NOT NULL CHECK(amount>0),
 currency TEXT NOT NULL CHECK(currency IN ('USD','BRL')),
 provider_payment_id TEXT UNIQUE,
 provider_reference_id TEXT,
 provider_order_id TEXT,
 checkout_url TEXT,
 qr_payload TEXT,
 status TEXT NOT NULL CHECK(status IN ('created','pending','paid','failed','refunded')),
 verified_at TEXT,
 receipt_json TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
INSERT INTO payments_new SELECT id,order_id,provider,leg,amount,currency,provider_payment_id,provider_reference_id,provider_order_id,checkout_url,qr_payload,status,verified_at,receipt_json,created_at,updated_at FROM payments;
DROP TABLE payments;
ALTER TABLE payments_new RENAME TO payments;
CREATE INDEX payments_order_idx ON payments(order_id,created_at);
CREATE UNIQUE INDEX payments_provider_order_id_uq ON payments(provider_order_id) WHERE provider_order_id IS NOT NULL;
CREATE INDEX payments_provider_reference_idx ON payments(provider,provider_reference_id);
CREATE UNIQUE INDEX payments_one_active_attempt_per_step ON payments(order_id,leg) WHERE status IN ('created','pending') AND currency='USD';
PRAGMA foreign_keys=ON;
