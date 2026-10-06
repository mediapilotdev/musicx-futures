import { db } from './db.js';
import { nanoid } from 'nanoid';

console.log('🌱 Seeding MusicX database with SOL-denominated listener futures markets...');

const artists = [
  {
    id: 'art_chappell',
    name: 'Chappell Roan',
    spotify_id: '7GlBOeep6PqTfFi59PTJ60',
    image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80',
    genre: 'Pop / Synthpop',
    current_listeners: 43250000,
    prev_listeners: 38400000,
    target_listeners: 46000000,
    yes_pool_sol: 18.5,
    no_pool_sol: 12.2
  },
  {
    id: 'art_billie',
    name: 'Billie Eilish',
    spotify_id: '6qqNVTkY8uBg9cP3Jd7DAH',
    image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    genre: 'Alt Pop',
    current_listeners: 104500000,
    prev_listeners: 99800000,
    target_listeners: 107000000,
    yes_pool_sol: 45.0,
    no_pool_sol: 26.5
  },
  {
    id: 'art_diljit',
    name: 'Diljit Dosanjh',
    spotify_id: '2FKWNmUpLFXIRdgBhUikHm',
    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
    genre: 'Punjabi / Global Pop',
    current_listeners: 24800000,
    prev_listeners: 22100000,
    target_listeners: 27000000,
    yes_pool_sol: 22.4,
    no_pool_sol: 17.6
  },
  {
    id: 'art_travis',
    name: 'Travis Scott',
    spotify_id: '0Y5tJX1MQlPlqiwlOH1tJY',
    image_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
    genre: 'Hip Hop / Trap',
    current_listeners: 71200000,
    prev_listeners: 73500000,
    target_listeners: 72000000,
    yes_pool_sol: 14.8,
    no_pool_sol: 31.2
  },
  {
    id: 'art_benson',
    name: 'Benson Boone',
    spotify_id: '22wSO2vIJ7ncnrQMrrzC7v',
    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    genre: 'Pop Rock',
    current_listeners: 58900000,
    prev_listeners: 61400000,
    target_listeners: 60000000,
    yes_pool_sol: 16.0,
    no_pool_sol: 24.5
  },
  {
    id: 'art_indie',
    name: 'The Marías',
    spotify_id: '2sSGPbdZJkaSE2Abc9AC4f',
    image_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80',
    genre: 'Indie Pop / Psychedelic',
    current_listeners: 18400000,
    prev_listeners: 16900000,
    target_listeners: 20000000,
    yes_pool_sol: 35.8,
    no_pool_sol: 11.2
  }
];

// Clean existing
db.exec(`
  DELETE FROM positions;
  DELETE FROM markets;
  DELETE FROM artists;
  DELETE FROM users;
`);

const insertUser = db.prepare(`
  INSERT INTO users (id, username, wallet_address, balance_pts, sol_balance)
  VALUES (?, ?, ?, ?, ?)
`);

insertUser.run('usr_demo', 'arun_demo', '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', 1000.0, 5.0);

const insertArtist = db.prepare(`
  INSERT INTO artists (id, name, spotify_id, image_url, genre, current_listeners, prev_listeners)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertMarket = db.prepare(`
  INSERT INTO markets (id, artist_id, target_date, target_listeners, status, yes_pool_sol, no_pool_sol)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertPosition = db.prepare(`
  INSERT INTO positions (id, user_id, wallet_address, market_id, prediction, amount_sol, tx_signature)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const a of artists) {
  insertArtist.run(a.id, a.name, a.spotify_id, a.image_url, a.genre, a.current_listeners, a.prev_listeners);
  const marketId = `mkt_${a.id.replace('art_', '')}_nov`;
  insertMarket.run(
    marketId,
    a.id,
    '2026-11-01',
    a.target_listeners,
    'OPEN',
    a.yes_pool_sol,
    a.no_pool_sol
  );

  if (a.id === 'art_chappell') {
    insertPosition.run(
      nanoid(10),
      'usr_demo',
      '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
      marketId,
      'YES',
      0.5,
      '5UfDuVvX8z9...demoTx'
    );
  }
}

console.log('✅ Seed completed with 6 SOL artist futures markets!');
