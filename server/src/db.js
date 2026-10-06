import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'musicx.db');

export const db = new DatabaseSync(dbPath);

// Initialize schema supporting SOL onchain escrow
db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    wallet_address TEXT,
    balance_pts REAL DEFAULT 1000.0,
    sol_balance REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    spotify_id TEXT UNIQUE,
    image_url TEXT,
    genre TEXT,
    current_listeners INTEGER NOT NULL,
    prev_listeners INTEGER NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS markets (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL,
    target_date TEXT NOT NULL,
    target_listeners INTEGER NOT NULL,
    status TEXT DEFAULT 'OPEN', -- 'OPEN', 'RESOLVED_YES', 'RESOLVED_NO'
    yes_pool_sol REAL DEFAULT 0.5,
    no_pool_sol REAL DEFAULT 0.5,
    resolved_listeners INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(artist_id) REFERENCES artists(id)
  );

  CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    market_id TEXT NOT NULL,
    prediction TEXT NOT NULL, -- 'YES' or 'NO'
    amount_sol REAL NOT NULL,
    tx_signature TEXT,
    claimed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(market_id) REFERENCES markets(id)
  );
`);
