DROP INDEX payments_one_active_attempt_per_step;
CREATE UNIQUE INDEX payments_one_active_attempt_per_step ON payments(order_id,leg) WHERE status IN ('created','pending') AND currency='USD';
