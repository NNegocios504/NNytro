CREATE TABLE IF NOT EXISTS support_tickets (
 id TEXT PRIMARY KEY,
 user_sub TEXT NOT NULL,
 subject TEXT NOT NULL CHECK(length(subject) BETWEEN 1 AND 120),
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS support_tickets_owner_idx ON support_tickets(user_sub,updated_at);
CREATE TABLE IF NOT EXISTS support_messages (
 id TEXT PRIMARY KEY,
 ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
 sender_sub TEXT NOT NULL,
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON support_messages(ticket_id,created_at);
INSERT OR IGNORE INTO support_tickets(id,user_sub,subject,status,created_at,updated_at)
SELECT 'legacy-'||o.id,o.user_sub,'Conversación por pedido NN-'||upper(substr(o.id,1,8)),'open',MIN(m.created_at),MAX(m.created_at)
FROM orders o JOIN messages m ON m.order_id=o.id GROUP BY o.id,o.user_sub;
INSERT OR IGNORE INTO support_messages(id,ticket_id,sender_sub,body,created_at)
SELECT 'legacy-'||m.id,'legacy-'||m.order_id,m.sender_sub,m.body,m.created_at FROM messages m;
