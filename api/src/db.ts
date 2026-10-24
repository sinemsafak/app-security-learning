
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const configuredPath = process.env.DB_PATH ?? "./data/app.sqlite";

if (configuredPath !== ":memory:") {
  fs.mkdirSync(path.dirname(path.resolve(configuredPath)), {
    recursive: true
  });
}

export const db = new Database(configuredPath);

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS private_notes (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL,
    content TEXT NOT NULL CHECK(length(content) <= 5000),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_notes_owner
  ON private_notes(owner_user_id);
`);
