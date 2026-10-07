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

// Ensure default user exists so foreign keys never fail
try {
  db.exec(`
    INSERT OR IGNORE INTO users (id, username, wallet_address, balance_pts, sol_balance)
    VALUES ('usr_sol', 'solana_trader', 'system_sol', 1000.0, 5.0);
  `);
} catch (e) {
  console.warn('Default user creation warning:', e.message);
}

// Auto-migrate new columns for live persistent databases
try { db.exec("ALTER TABLE markets ADD COLUMN news_url TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE markets ADD COLUMN news_title TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE markets ADD COLUMN news_source TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE markets ADD COLUMN settlement_timestamp TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE markets ADD COLUMN settlement_rules TEXT;"); } catch(e){}

// Reseed or update active markets to match live Spotify data and include countdown timestamps + settlement rules
try {
  const nextDailySettlement = '2026-10-08T10:00:00Z';
  const fridayDropSettlement = '2026-10-09T14:00:00Z';

  const freshMarkets = [
    {
      id: 'mkt_karol_bbywow_no1',
      title: 'Will KAROL G "BbY WOW" hold #1 on Spotify Global tomorrow?',
      category: 'DAILY_CHARTS',
      subtitle: 'Daily Top 50 hold test: Currently reigning at #1 with 4.94M daily streams',
      image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
      settlement_date: 'Oct 8, 2026 at 10:00 AM UTC',
      settlement_timestamp: nextDailySettlement,
      settlement_rules: 'Settles YES if KAROL G - "BbY WOW" holds rank #1 on the official Spotify Daily Global Top 50 chart published at 10:00 AM UTC. Settles NO if any other song (such as ADÉLA "Nicole Kidman" or Taylor Swift) takes the #1 position.',
      resolution_source: 'charts.spotify.com/charts/view/regional-global-daily/latest',
      news_title: 'Spotify Global Daily: Official #1 Live Standings',
      news_source: 'Spotify Charts',
      news_url: 'https://charts.spotify.com/charts/view/regional-global-daily/latest',
      yes_price: 0.65,
      no_price: 0.35,
      yes_pool_sol: 0.0,
      no_pool_sol: 0.0,
      volume_sol: 0.0
    },
    {
      id: 'mkt_adela_flip_no1',
      title: 'Will ADÉLA\'s "Nicole Kidman" flip KAROL G for #1 Global Daily?',
      category: 'DAILY_CHARTS',
      subtitle: 'Currently surging at #2 with +577k stream daily velocity gain',
      image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
      settlement_date: 'Oct 8, 2026 at 10:00 AM UTC',
      settlement_timestamp: nextDailySettlement,
      settlement_rules: 'Settles YES if ADÉLA - "Nicole Kidman" ranks at #1 on the Spotify Daily Global chart at 10:00 AM UTC tomorrow. Settles NO if it remains at #2 or lower.',
      resolution_source: 'Spotify Daily Global Top 50 Chart',
      news_title: 'Kworb Global Daily: ADÉLA #2 Surge Velocity',
      news_source: 'Kworb Tracker',
      news_url: 'https://kworb.net/spotify/country/global_daily.html',
      yes_price: 0.38,
      no_price: 0.62,
      yes_pool_sol: 0.0,
      no_pool_sol: 0.0,
      volume_sol: 0.0
    },
    {
      id: 'mkt_battle_taylor_adela',
      title: 'CHART DUEL: Taylor Swift ("Patient Zero") vs ADÉLA ("Ain\'t In LA")?',
      category: 'BATTLES',
      subtitle: 'Battle for Top 3: Taylor (#3) vs ADÉLA (#4) separated by only 320k streams',
      image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
      settlement_date: 'Oct 8, 2026 at 10:00 AM UTC',
      settlement_timestamp: nextDailySettlement,
      settlement_rules: 'Settles YES if Taylor Swift\'s "Patient Zero" finishes at a higher numerical position (lower rank number) than ADÉLA\'s "Ain\'t In LA" on Spotify Global Daily. Settles NO if ADÉLA ranks higher.',
      resolution_source: 'Spotify Daily Global Top 200 comparative rank',
      news_title: 'Kworb Global Daily: Head-to-Head Comparative Ranks',
      news_source: 'Kworb Charts',
      news_url: 'https://kworb.net/spotify/country/global_daily.html',
      yes_price: 0.59,
      no_price: 0.41,
      yes_pool_sol: 0.001,
      no_pool_sol: 0.0,
      volume_sol: 0.001
    },
    {
      id: 'mkt_olivia_two_top10',
      title: 'Will Olivia Rodrigo keep 2 tracks in Spotify Global Top 10 tomorrow?',
      category: 'DAILY_CHARTS',
      subtitle: 'Currently holding #5 ("the cure") and #8 ("stupid song") in Global Top 10',
      image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
      settlement_date: 'Oct 8, 2026 at 10:00 AM UTC',
      settlement_timestamp: nextDailySettlement,
      settlement_rules: 'Settles YES if Olivia Rodrigo has 2 or more songs inside positions 1 through 10 on the official Spotify Daily Global Top 50 chart. Settles NO if fewer than 2 songs remain in the Top 10.',
      resolution_source: 'charts.spotify.com Global Top 50 Daily',
      news_title: 'Spotify Global Top 50: Official Live Standings',
      news_source: 'Spotify Charts',
      news_url: 'https://charts.spotify.com/charts/view/regional-global-daily/latest',
      yes_price: 0.76,
      no_price: 0.24,
      yes_pool_sol: 0.0,
      no_pool_sol: 0.0,
      volume_sol: 0.0
    },
    {
      id: 'mkt_newfriday_debut_top20',
      title: 'NEW RELEASE: Will New Music Friday lead single debut inside Global Top 20?',
      category: 'NEW_RELEASES',
      subtitle: 'Release window: Friday 00:00 EST. 24H debut streaming threshold check',
      image_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
      settlement_date: 'Oct 9, 2026 at 2:00 PM UTC (Friday)',
      settlement_timestamp: fridayDropSettlement,
      settlement_rules: 'Settles YES if the flagship New Music Friday release debuts at position #20 or higher on the Spotify Global Daily chart following its first 24 hours of streaming. Settles NO if it debuts at #21 or lower.',
      resolution_source: 'Spotify Global Daily Top 50 Chart Refresh',
      news_title: 'Spotify New Music Friday Official Playlist Tracker',
      news_source: 'Spotify NMF',
      news_url: 'https://charts.spotify.com/charts/view/regional-global-daily/latest',
      yes_price: 0.44,
      no_price: 0.56,
      yes_pool_sol: 0.0,
      no_pool_sol: 0.0,
      volume_sol: 0.0
    },
    {
      id: 'mkt_dualipa_top15',
      title: 'Will Dua Lipa\'s "Training Season" break into Global Top 15 tomorrow?',
      category: 'VIRAL',
      subtitle: 'Currently surging at #16 with a +6 position daily climb',
      image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
      settlement_date: 'Oct 8, 2026 at 10:00 AM UTC',
      settlement_timestamp: nextDailySettlement,
      settlement_rules: 'Settles YES if Dua Lipa - "Training Season" reaches rank #15 or better on the Spotify Daily Global chart at 10:00 AM UTC. Settles NO if it remains at rank #16 or lower.',
      resolution_source: 'charts.spotify.com Global Top 50',
      news_title: 'Kworb Global Daily: Dua Lipa +6 Climb Tracker',
      news_source: 'Kworb Tracker',
      news_url: 'https://kworb.net/spotify/country/global_daily.html',
      yes_price: 0.52,
      no_price: 0.48,
      yes_pool_sol: 0.0,
      no_pool_sol: 0.0,
      volume_sol: 0.0
    }
  ];

  // Upsert all fresh live-aligned markets
  const upsertStmt = db.prepare(`
    INSERT INTO markets (
      id, title, category, subtitle, image_url, settlement_date, settlement_timestamp, settlement_rules, resolution_source,
      news_url, news_title, news_source,
      yes_price, no_price, yes_pool_sol, no_pool_sol, volume_sol, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      category = excluded.category,
      subtitle = excluded.subtitle,
      image_url = excluded.image_url,
      settlement_date = excluded.settlement_date,
      settlement_timestamp = excluded.settlement_timestamp,
      settlement_rules = excluded.settlement_rules,
      resolution_source = excluded.resolution_source,
      news_url = excluded.news_url,
      news_title = excluded.news_title,
      news_source = excluded.news_source,
      yes_price = excluded.yes_price,
      no_price = excluded.no_price,
      yes_pool_sol = excluded.yes_pool_sol,
      no_pool_sol = excluded.no_pool_sol,
      volume_sol = excluded.volume_sol,
      status = 'OPEN'
  `);

  for (const m of freshMarkets) {
    upsertStmt.run(
      m.id,
      m.title,
      m.category,
      m.subtitle,
      m.image_url,
      m.settlement_date,
      m.settlement_timestamp,
      m.settlement_rules,
      m.resolution_source,
      m.news_url,
      m.news_title,
      m.news_source,
      m.yes_price,
      m.no_price,
      m.yes_pool_sol,
      m.no_pool_sol,
      m.volume_sol
    );
  }

  // Remove stale positions and deprecated markets
  db.exec(`
    DELETE FROM positions 
    WHERE market_id NOT IN (
      'mkt_karol_bbywow_no1',
      'mkt_adela_flip_no1',
      'mkt_battle_taylor_adela',
      'mkt_olivia_two_top10',
      'mkt_newfriday_debut_top20',
      'mkt_dualipa_top15'
    );
    DELETE FROM markets 
    WHERE id NOT IN (
      'mkt_karol_bbywow_no1',
      'mkt_adela_flip_no1',
      'mkt_battle_taylor_adela',
      'mkt_olivia_two_top10',
      'mkt_newfriday_debut_top20',
      'mkt_dualipa_top15'
    );
  `);
} catch (e) {
  console.warn('Market sync warning:', e.message);
}

// Retroactive restoration for confirmed onchain transaction
try {
  const confirmedTx = 'QuFjDhmLY19FhJufEXCvkE3qoPWd1DrXTJCgNqsQxm9nq1ocAHT52fP6x4rb4fNoGndtjSsBYNjS8qXVip2H9Ms';
  const existing = db.prepare('SELECT id FROM positions WHERE tx_signature = ?').get(confirmedTx);
  if (!existing) {
    const userWallet = '6owU82nTHo2WSnSmVHfite7czRjbJppduuVPjpRzqEWr';
    const userId = 'usr_6owU82nT';
    db.prepare(`
      INSERT OR IGNORE INTO users (id, username, wallet_address)
      VALUES (?, ?, ?)
    `).run(userId, '6owU82nT', userWallet);

    db.prepare(`
      INSERT INTO positions (id, user_id, wallet_address, market_id, prediction, amount_sol, shares, avg_price, tx_signature, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      'pos_QuFjDhmL',
      userId,
      userWallet,
      'mkt_battle_taylor_adela',
      'YES',
      0.001,
      0.0017,
      0.58,
      confirmedTx
    );
    console.log(`✅ Restored confirmed onchain position for tx: ${confirmedTx}`);
  }
} catch (e) {
  console.warn('Tx restoration error:', e.message);
}

