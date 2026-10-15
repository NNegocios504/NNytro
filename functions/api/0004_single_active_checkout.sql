-- At most one checkout may be live for an order/payment step, regardless of provider.
-- Resolve any duplicate created/pending rows before applying this migration.
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_active_attempt_per_step
ON payments(order_id, leg)
WHERE status IN ('created','pending');
