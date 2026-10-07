import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'musicx.db');

export const db = new DatabaseSync(dbPath);

// Polymarket-grade schema for 24-48h Daily Chart, Drops & Head-to-Head Battles
db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    wallet_address TEXT,
    balance_pts REAL DEFAULT 1000.0,
    sol_balance REAL DEFAULT 5.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS markets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'DAILY_CHARTS', 'NEW_RELEASES', 'BATTLES', 'VIRAL'
    subtitle TEXT,
    image_url TEXT NOT NULL,
    settlement_date TEXT NOT NULL,
    resolution_source TEXT NOT NULL,
    news_url TEXT,
    news_title TEXT,
    news_source TEXT,
    status TEXT DEFAULT 'OPEN', -- 'OPEN', 'RESOLVED_YES', 'RESOLVED_NO'
    yes_price REAL DEFAULT 0.50,
    no_price REAL DEFAULT 0.50,
    yes_pool_sol REAL DEFAULT 12.5,
    no_pool_sol REAL DEFAULT 12.5,
    volume_sol REAL DEFAULT 25.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    market_id TEXT NOT NULL,
    prediction TEXT NOT NULL, -- 'YES' or 'NO'
    amount_sol REAL NOT NULL,
    shares REAL NOT NULL,
    avg_price REAL NOT NULL,
    tx_signature TEXT,
    claimed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(market_id) REFERENCES markets(id)
  );
`);
