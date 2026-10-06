import { db } from './db.js';
import { nanoid } from 'nanoid';

console.log('🌱 Seeding MusicX with high-velocity 24H settlement and drop markets...');

const markets = [
  {
    id: 'mkt_karol_no1',
    title: 'Will "BbY WOW" stay #1 on Spotify Daily Global tomorrow?',
    category: 'DAILY_CHARTS',
    subtitle: 'Spotify Daily Top 50 Global (Oct 7 refresh at 10 AM UTC)',
    image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    settlement_date: 'Oct 7, 2026 (24h)',
    resolution_source: 'charts.spotify.com/charts/view/regional-global-daily/latest',
    yes_price: 0.68,
    no_price: 0.32,
    yes_pool_sol: 42.5,
    no_pool_sol: 20.0,
    volume_sol: 62.5
  },
  {
    id: 'mkt_taylor_top5',
    title: 'Will Taylor Swift have 3+ tracks in Spotify Global Top 5 tomorrow?',
    category: 'DAILY_CHARTS',
    subtitle: 'The Life of a Showgirl deluxe track holdout test',
    image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    settlement_date: 'Oct 7, 2026 (24h)',
    resolution_source: 'charts.spotify.com Global Top 50 Daily',
    yes_price: 0.54,
    no_price: 0.46,
    yes_pool_sol: 58.2,
    no_pool_sol: 49.5,
    volume_sol: 107.7
  },
  {
    id: 'mkt_drake_fomo_debut',
    title: 'Will Drake\'s "Habibti (FOMO)" debut at #1 on Spotify USA Daily?',
    category: 'NEW_RELEASES',
    subtitle: 'First 24-hour debut tracking for surprise EP drop',
    image_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
    settlement_date: 'Oct 8, 2026 (48h)',
    resolution_source: 'Spotify USA Daily Top 50 Chart',
    yes_price: 0.41,
    no_price: 0.59,
    yes_pool_sol: 38.0,
    no_pool_sol: 54.7,
    volume_sol: 92.7
  },
  {
    id: 'mkt_battle_billie_olivia',
    title: 'CHART DUEL: Billie Eilish vs Olivia Rodrigo on Global Daily?',
    category: 'BATTLES',
    subtitle: 'Who ranks higher on Spotify Global: Billie ("LUNCH") or Olivia ("the cure")?',
    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    settlement_date: 'Oct 7, 2026 (24h)',
    resolution_source: 'Spotify Daily Global Top 200 comparative rank',
    yes_price: 0.62, // YES means Billie wins, NO means Olivia wins
    no_price: 0.38,
    yes_pool_sol: 64.0,
    no_pool_sol: 39.2,
    volume_sol: 103.2
  },
  {
    id: 'mkt_victoria_monet_debut',
    title: 'Will Victoria Monét\'s "Frequency of Love" debut in Global Top 50?',
    category: 'NEW_RELEASES',
    subtitle: 'New Music Friday R&B single 48h streaming threshold',
    image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
    settlement_date: 'Oct 8, 2026 (48h)',
    resolution_source: 'Spotify Global Top 50 Chart',
    yes_price: 0.28,
    no_price: 0.72,
    yes_pool_sol: 14.5,
    no_pool_sol: 37.3,
    volume_sol: 51.8
  },
  {
    id: 'mkt_chappell_mariah',
    title: 'Will any Christmas song enter the Spotify Global Top 100 this week?',
    category: 'VIRAL',
    subtitle: 'Early holiday streaming surge tracker (Mariah Carey / Bleachers)',
    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
    settlement_date: 'Oct 11, 2026 (5 days)',
    resolution_source: 'Spotify Global Daily Top 100 Chart',
    yes_price: 0.35,
    no_price: 0.65,
    yes_pool_sol: 21.0,
    no_pool_sol: 39.0,
    volume_sol: 60.0
  }
];

db.exec(`
  DELETE FROM positions;
  DELETE FROM markets;
  DELETE FROM users;
`);

const insertUser = db.prepare(`
  INSERT INTO users (id, username, wallet_address, balance_pts, sol_balance)
  VALUES (?, ?, ?, ?, ?)
`);

insertUser.run('usr_demo', 'arun_demo', '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', 1000.0, 5.0);

const insertMarket = db.prepare(`
  INSERT INTO markets (
    id, title, category, subtitle, image_url, settlement_date, resolution_source,
    yes_price, no_price, yes_pool_sol, no_pool_sol, volume_sol
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const m of markets) {
  insertMarket.run(
    m.id,
    m.title,
    m.category,
    m.subtitle,
    m.image_url,
    m.settlement_date,
    m.resolution_source,
    m.yes_price,
    m.no_price,
    m.yes_pool_sol,
    m.no_pool_sol,
    m.volume_sol
  );
}

// Add sample position
const insertPosition = db.prepare(`
  INSERT INTO positions (id, user_id, wallet_address, market_id, prediction, amount_sol, shares, avg_price, tx_signature)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertPosition.run(
  nanoid(10),
  'usr_demo',
  '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
  'mkt_karol_no1',
  'YES',
  0.5,
  0.73,
  0.68,
  '5UfDuVvX8z9...demoTx'
);

console.log('✅ Seed completed with 6 high-frequency 24H music prediction markets!');
