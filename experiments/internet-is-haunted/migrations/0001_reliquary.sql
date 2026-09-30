CREATE TABLE IF NOT EXISTS relics (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 url TEXT NOT NULL UNIQUE,
 snapshot TEXT NOT NULL,
 saved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS discoveries (
 token TEXT PRIMARY KEY,
 url TEXT NOT NULL,
 snapshot TEXT NOT NULL,
 expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS discoveries_expiry ON discoveries(expires);
