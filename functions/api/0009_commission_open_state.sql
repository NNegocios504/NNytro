CREATE TABLE IF NOT EXISTS site_settings (setting_key TEXT PRIMARY KEY,setting_value TEXT NOT NULL,updated_at TEXT NOT NULL);
INSERT OR IGNORE INTO site_settings(setting_key,setting_value,updated_at) VALUES('commissions_open','true',datetime('now'));
