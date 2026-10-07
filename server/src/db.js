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

// Auto-migrate news columns for live persistent databases
try {
  db.exec(`
    ALTER TABLE markets ADD COLUMN news_url TEXT;
    ALTER TABLE markets ADD COLUMN news_title TEXT;
    ALTER TABLE markets ADD COLUMN news_source TEXT;
  `);
} catch (e) {
  // Columns already exist
}

// Ensure news articles are present on active markets
try {
  const newsMappings = [
    {
      id: 'mkt_karol_no1',
      news_title: 'Billboard: Karol G Dominates Global Streaming Charts With Latin Hit',
      news_source: 'Billboard',
      news_url: 'https://www.billboard.com/music/latin/karol-g-si-antes-te-hubiera-conocido-global-charts-1235715560/'
    },
    {
      id: 'mkt_gaga_bruno_top3',
      news_title: 'Variety: Lady Gaga & Bruno Mars Smash Global Spotify Streaming Milestone',
      news_source: 'Variety',
      news_url: 'https://variety.com/2024/music/news/lady-gaga-bruno-mars-die-with-a-smile-spotify-milestone-1236151240/'
    },
    {
      id: 'mkt_taylor_top5',
      news_title: 'Billboard: Taylor Swift Retains Top 5 Hold on Spotify Global',
      news_source: 'Billboard',
      news_url: 'https://www.billboard.com/charts/hot-100/'
    },
    {
      id: 'mkt_battle_billie_olivia',
      news_title: 'Rolling Stone: The Gen-Z Pop Royalty Streaming Battle',
      news_source: 'Rolling Stone',
      news_url: 'https://www.rollingstone.com/music/music-news/billie-eilish-olivia-rodrigo-pop-charts-1234856012/'
    },
    {
      id: 'mkt_weeknd_top5',
      news_title: 'Pitchfork: The Weeknd Unveils "Dancing in the Flames" Lead Single',
      news_source: 'Pitchfork',
      news_url: 'https://pitchfork.com/news/the-weeknd-shares-new-song-dancing-in-the-flames-listen/'
    },
    {
      id: 'mkt_kendrick_notlikeus',
      news_title: 'Complex: Kendrick Lamar Super Bowl Halftime Announcement Sparks Streaming Boost',
      news_source: 'Complex',
      news_url: 'https://www.complex.com/music/a/backwoodbum/kendrick-lamar-super-bowl-halftime-show-streams-increase'
    },
    {
      id: 'mkt_sabrina_espresso',
      news_title: 'NME: Sabrina Carpenter\'s "Espresso" Breaks Record for Fastest 1B Streams',
      news_source: 'NME',
      news_url: 'https://www.nme.com/news/music/sabrina-carpenter-espresso-fastest-1-billion-streams-spotify-3782012'
    }
  ];

  const updateStmt = db.prepare(`
    UPDATE markets 
    SET news_title = ?, news_source = ?, news_url = ? 
    WHERE id = ?
  `);

  for (const item of newsMappings) {
    updateStmt.run(item.news_title, item.news_source, item.news_url, item.id);
  }
} catch (e) {
  console.warn('News migration warning:', e.message);
}
