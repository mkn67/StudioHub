CREATE TABLE IF NOT EXISTS helpdesk_conversations (id TEXT PRIMARY KEY, owner TEXT NOT NULL, payload TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS helpdesk_conversations_owner ON helpdesk_conversations(owner);
CREATE TABLE IF NOT EXISTS helpdesk_tickets (id TEXT PRIMARY KEY, owner TEXT NOT NULL, conversation_id TEXT NOT NULL, proposal_id TEXT NOT NULL UNIQUE, payload TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS helpdesk_records (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, expires INTEGER NOT NULL);
