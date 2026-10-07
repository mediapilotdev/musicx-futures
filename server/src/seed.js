import { db } from './db.js';
import { nanoid } from 'nanoid';

console.log('🌱 Seeding MusicX with 24H settlement markets linked to real news articles...');

const markets = [
  {
    id: 'mkt_karol_no1',
    title: 'Will "Si Antes Te Hubiera Conocido" stay #1 on Spotify Global tomorrow?',
    category: 'DAILY_CHARTS',
    subtitle: 'Spotify Daily Top 50 Global (24h refresh at 10 AM UTC)',
    image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    settlement_date: 'Oct 8, 2026 (24h)',
    resolution_source: 'charts.spotify.com/charts/view/regional-global-daily/latest',
    news_title: 'Billboard: Karol G Dominates Global Streaming Charts With Latin Hit',
    news_source: 'Billboard',
    news_url: 'https://www.billboard.com/music/latin/karol-g-si-antes-te-hubiera-conocido-global-charts-1235715560/',
    yes_price: 0.68,
    no_price: 0.32,
    yes_pool_sol: 42.5,
    no_pool_sol: 20.0,
    volume_sol: 62.5
  },
  {
    id: 'mkt_gaga_bruno_top3',
    title: 'Will Lady Gaga & Bruno Mars "Die With A Smile" stay Top 3 tomorrow?',
    category: 'DAILY_CHARTS',
    subtitle: 'Spotify Global Top 50 Daily tracking against new weekday releases',
    image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    settlement_date: 'Oct 8, 2026 (24h)',
    resolution_source: 'charts.spotify.com Global Top 50 Daily',
    news_title: 'Variety: Lady Gaga & Bruno Mars Smash Global Spotify Streaming Milestone',
    news_source: 'Variety',
    news_url: 'https://variety.com/2024/music/news/lady-gaga-bruno-mars-die-with-a-smile-spotify-milestone-1236151240/',
    yes_price: 0.85,
    no_price: 0.15,
    yes_pool_sol: 58.2,
    no_pool_sol: 10.5,
    volume_sol: 68.7
  },
  {
    id: 'mkt_battle_billie_olivia',
    title: 'CHART DUEL: Billie Eilish vs Olivia Rodrigo on Global Daily?',
    category: 'BATTLES',
    subtitle: 'Who ranks higher tomorrow: Billie ("BIRDS OF A FEATHER") or Olivia ("vampire")?',
    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    settlement_date: 'Oct 8, 2026 (24h)',
    resolution_source: 'Spotify Daily Global Top 200 comparative rank',
    news_title: 'Rolling Stone: The Gen-Z Pop Royalty Streaming Battle',
    news_source: 'Rolling Stone',
    news_url: 'https://www.rollingstone.com/music/music-news/billie-eilish-olivia-rodrigo-pop-charts-1234856012/',
    yes_price: 0.62, // YES = Billie, NO = Olivia
    no_price: 0.38,
    yes_pool_sol: 64.0,
    no_pool_sol: 39.2,
    volume_sol: 103.2
  },
  {
    id: 'mkt_weeknd_top5',
    title: 'Will The Weeknd\'s "Dancing In The Flames" break into Global Top 5?',
    category: 'NEW_RELEASES',
    subtitle: 'Hurry Up Tomorrow lead single 24-hour surge test',
    image_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
    settlement_date: 'Oct 9, 2026 (48h)',
    resolution_source: 'Spotify Daily Global Top 50',
    news_title: 'Pitchfork: The Weeknd Unveils "Dancing in the Flames" Lead Single',
    news_source: 'Pitchfork',
    news_url: 'https://pitchfork.com/news/the-weeknd-shares-new-song-dancing-in-the-flames-listen/',
    yes_price: 0.44,
    no_price: 0.56,
    yes_pool_sol: 38.0,
    no_pool_sol: 48.7,
    volume_sol: 86.7
  },
  {
    id: 'mkt_kendrick_notlikeus',
    title: 'Will Kendrick Lamar\'s "Not Like Us" stream count rise > 1.5% tomorrow?',
    category: 'VIRAL',
    subtitle: 'Daily stream momentum ahead of upcoming headlining announcement',
    image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
    settlement_date: 'Oct 8, 2026 (24h)',
    resolution_source: 'Spotify Daily Counter & Kworb Spotify Global',
    news_title: 'Complex: Kendrick Lamar Super Bowl Halftime Announcement Sparks Streaming Boost',
    news_source: 'Complex',
    news_url: 'https://www.complex.com/music/a/backwoodbum/kendrick-lamar-super-bowl-halftime-show-streams-increase',
    yes_price: 0.53,
    no_price: 0.47,
    yes_pool_sol: 24.5,
    no_pool_sol: 21.8,
    volume_sol: 46.3
  },
  {
    id: 'mkt_sabrina_espresso',
    title: 'Will Sabrina Carpenter "Espresso" hold in Global Top 10 tomorrow?',
    category: 'DAILY_CHARTS',
    subtitle: 'Short n\' Sweet phenomenon 24-hour chart durability challenge',
    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
    settlement_date: 'Oct 8, 2026 (24h)',
    resolution_source: 'Spotify Global Daily Top 10 Chart',
    news_title: 'NME: Sabrina Carpenter\'s "Espresso" Breaks Record for Fastest 1B Streams',
    news_source: 'NME',
    news_url: 'https://www.nme.com/news/music/sabrina-carpenter-espresso-fastest-1-billion-streams-spotify-3782012',
    yes_price: 0.79,
    no_price: 0.21,
    yes_pool_sol: 45.0,
    no_pool_sol: 12.0,
    volume_sol: 57.0
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
    news_url, news_title, news_source,
    yes_price, no_price, yes_pool_sol, no_pool_sol, volume_sol
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  '5Ksj...testSolscanTx'
);

console.log('✅ Seeding complete with news articles attached to all markets.');
