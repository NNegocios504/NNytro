PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS site_settings (setting_key TEXT PRIMARY KEY,setting_value TEXT NOT NULL,updated_at TEXT NOT NULL);
INSERT OR IGNORE INTO site_settings(setting_key,setting_value,updated_at) VALUES('commissions_open','true',datetime('now'));
CREATE TABLE IF NOT EXISTS users (google_sub TEXT PRIMARY KEY,email TEXT NOT NULL,display_name TEXT NOT NULL,avatar_url TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY,user_sub TEXT NOT NULL REFERENCES users(google_sub),customer_email TEXT NOT NULL,customer_name TEXT NOT NULL,contact TEXT NOT NULL,details TEXT NOT NULL DEFAULT '',items_json TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('requested','accepted','rejected','awaiting_full_payment','awaiting_advance','advance_paid','in_progress','awaiting_balance','paid','awaiting_publication','completed_paid','cancelled')),
 already_spoken INTEGER NOT NULL CHECK(already_spoken=1),rejection_reason TEXT,total_brl REAL CHECK(total_brl IS NULL OR total_brl>0),total_usd REAL CHECK(total_usd IS NULL OR total_usd>0),quote_currency TEXT NOT NULL DEFAULT 'USD' CHECK(quote_currency IN ('USD','BRL')),payment_plan TEXT CHECK(payment_plan IS NULL OR payment_plan IN ('full','deposit_50')),quoted_at TEXT,public_consent INTEGER NOT NULL DEFAULT 0 CHECK(public_consent IN (0,1)),public_chosen_name TEXT,public_consent_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_owner_idx ON orders(user_sub,created_at);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status,created_at);
CREATE TABLE IF NOT EXISTS order_events (id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,actor_sub TEXT NOT NULL,event_type TEXT NOT NULL,metadata_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,sender_sub TEXT NOT NULL,body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS messages_order_idx ON messages(order_id,created_at);
CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),provider TEXT NOT NULL CHECK(provider IN ('mercadopago','paypal','pix','transfer_usd','transfer_ars')),leg TEXT NOT NULL CHECK(leg IN ('full','advance','balance')),amount REAL NOT NULL CHECK(amount>0),currency TEXT NOT NULL CHECK(currency IN ('USD','BRL')),provider_payment_id TEXT UNIQUE,provider_reference_id TEXT,provider_order_id TEXT,checkout_url TEXT,qr_payload TEXT,status TEXT NOT NULL CHECK(status IN ('created','pending','paid','failed','refunded')),verified_at TEXT,receipt_json TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS payments_order_idx ON payments(order_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_order_id_uq ON payments(provider_order_id) WHERE provider_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_provider_reference_idx ON payments(provider,provider_reference_id);
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_active_attempt_per_step ON payments(order_id,leg) WHERE status IN ('created','pending') AND currency='USD';
CREATE TABLE IF NOT EXISTS api_rate_limits (bucket TEXT PRIMARY KEY,minute_bucket INTEGER NOT NULL,hits INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS api_rate_limits_updated_idx ON api_rate_limits(updated_at);
CREATE TABLE IF NOT EXISTS commission_posts (id TEXT PRIMARY KEY,order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),title TEXT NOT NULL,chosen_name TEXT NOT NULL,brief TEXT NOT NULL,initial_price_brl REAL,final_price_brl REAL,initial_price REAL,final_price REAL,price_currency TEXT NOT NULL DEFAULT 'USD' CHECK(price_currency IN ('USD','BRL')),price_change_reason TEXT NOT NULL DEFAULT '',process_video_url TEXT NOT NULL DEFAULT '',final_images_json TEXT NOT NULL,reference_images_json TEXT NOT NULL DEFAULT '[]',client_consent INTEGER NOT NULL CHECK(client_consent=1),is_published INTEGER NOT NULL DEFAULT 0 CHECK(is_published IN (0,1)),published_at TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY,order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),rating INTEGER NOT NULL CHECK(rating BETWEEN 0 AND 5),comment TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS support_tickets (id TEXT PRIMARY KEY,user_sub TEXT NOT NULL,subject TEXT NOT NULL CHECK(length(subject) BETWEEN 1 AND 120),status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS support_tickets_owner_idx ON support_tickets(user_sub,updated_at);
CREATE TABLE IF NOT EXISTS support_messages (id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,sender_sub TEXT NOT NULL,body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON support_messages(ticket_id,created_at);
INSERT OR IGNORE INTO support_tickets(id,user_sub,subject,status,created_at,updated_at) SELECT 'legacy-'||o.id,o.user_sub,'Conversación por pedido NN-'||upper(substr(o.id,1,8)),'open',MIN(m.created_at),MAX(m.created_at) FROM orders o JOIN messages m ON m.order_id=o.id GROUP BY o.id,o.user_sub;
INSERT OR IGNORE INTO support_messages(id,ticket_id,sender_sub,body,created_at) SELECT 'legacy-'||m.id,'legacy-'||m.order_id,m.sender_sub,m.body,m.created_at FROM messages m;
