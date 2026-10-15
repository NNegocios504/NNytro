-- Add provider identifiers used to reconcile Mercado Pago preferences and PayPal Orders.
ALTER TABLE payments ADD COLUMN provider_reference_id TEXT;
ALTER TABLE payments ADD COLUMN provider_order_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_order_id_uq ON payments(provider_order_id) WHERE provider_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_provider_reference_idx ON payments(provider,provider_reference_id);
