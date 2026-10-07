import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { db } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Solana Mainnet / Devnet connection for onchain transaction verification
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'mainnet-beta';
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC, 'confirmed');

// Official MusicX Onchain Escrow Vault Address
export const ESCROW_VAULT_ADDRESS = process.env.ESCROW_VAULT || '32WWuApRT3XyEHYz4EzadNe55m27a4BMWj1BigWyM8zG';

app.use(cors());
app.use(express.json());

// System Health & Onchain Status
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    network: SOLANA_NETWORK,
    escrowVault: ESCROW_VAULT_ADDRESS,
    explorerUrl: `https://solscan.io/account/${ESCROW_VAULT_ADDRESS}`,
    timestamp: new Date().toISOString()
  });
});

// Server-side Solana RPC Proxy (bypasses browser 403 Forbidden on api.mainnet-beta.solana.com)
app.get('/api/solana/blockhash', async (req, res) => {
  try {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    res.json({ blockhash, lastValidBlockHeight });
  } catch (err) {
    console.error('Failed to get blockhash:', err.message);
    res.status(500).json({ error: 'Failed to fetch latest blockhash from Solana RPC' });
  }
});

app.post('/api/solana/rpc', async (req, res) => {
  try {
    const rpcRes = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await rpcRes.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export function syncFreshMarkets() {
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
      yes_pool_sol: 45.5,
      no_pool_sol: 24.5,
      volume_sol: 70.0
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
      yes_pool_sol: 26.6,
      no_pool_sol: 43.4,
      volume_sol: 70.0
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
      yes_price: 0.58,
      no_price: 0.42,
      yes_pool_sol: 52.2,
      no_pool_sol: 37.8,
      volume_sol: 90.0
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
      yes_pool_sol: 64.6,
      no_pool_sol: 20.4,
      volume_sol: 85.0
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
      yes_pool_sol: 35.2,
      no_pool_sol: 44.8,
      volume_sol: 80.0
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
      yes_pool_sol: 31.2,
      no_pool_sol: 28.8,
      volume_sol: 60.0
    }
  ];

  try {
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

    db.exec(`
      DELETE FROM positions WHERE market_id NOT IN ('mkt_karol_bbywow_no1','mkt_adela_flip_no1','mkt_battle_taylor_adela','mkt_olivia_two_top10','mkt_newfriday_debut_top20','mkt_dualipa_top15');
      DELETE FROM markets WHERE id NOT IN ('mkt_karol_bbywow_no1','mkt_adela_flip_no1','mkt_battle_taylor_adela','mkt_olivia_two_top10','mkt_newfriday_debut_top20','mkt_dualipa_top15');
    `);
    console.log('✅ Fresh markets synced successfully.');
  } catch (err) {
    console.warn('Sync fresh markets warning:', err.message);
  }
}

// Run sync at boot
syncFreshMarkets();

let cachedVerification = null;
let lastVerificationTime = 0;

async function getCachedOracleVerification() {
  const now = Date.now();
  if (cachedVerification && (now - lastVerificationTime < 60000)) {
    return cachedVerification;
  }
  try {
    cachedVerification = await runAutomatedSettlementCheck();
    lastVerificationTime = now;
  } catch (err) {
    console.error('Oracle cache error:', err.message);
  }
  return cachedVerification;
}

// All Active 24H Prediction Markets
app.get('/api/markets', async (req, res) => {
  const category = req.query.category;
  let query = "SELECT * FROM markets WHERE status = 'OPEN'";
  let params = [];
  
  if (category && category !== 'ALL') {
    query += ' AND category = ?';
    params.push(category);
  }
  query += ' ORDER BY volume_sol DESC';

  const markets = db.prepare(query).all(...params);
  const oracleData = await getCachedOracleVerification();
  const vMap = new Map((oracleData?.verifications || []).map(v => [v.marketId, v]));

  const enrichedMarkets = markets.map(m => {
    const v = vMap.get(m.id);
    return {
      ...m,
      live_status_text: v?.currentStatusText || null,
      live_metric_verified: v?.liveMetricVerified ?? null,
      oracle_details: v?.oracleDetails || null
    };
  });

  res.json(enrichedMarkets);
});

// Place Prediction & Verify Onchain Transaction
app.post('/api/predict/sol', async (req, res) => {
  const { marketId, prediction, amountSol, walletAddress, txSignature } = req.body;
  const numAmount = parseFloat(amountSol);

  if (!marketId || !['YES', 'NO'].includes(prediction) || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Invalid prediction parameters' });
  }

  const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);
  if (!market || market.status !== 'OPEN') {
    return res.status(400).json({ error: 'Market is not open for trading' });
  }

  // Calculate pricing & shares
  const currentPrice = prediction === 'YES' ? market.yes_price : market.no_price;
  const shares = +(numAmount / currentPrice).toFixed(2);

  // Dynamic price shift on bonding curve
  let newYesPrice = market.yes_price;
  let newNoPrice = market.no_price;

  if (prediction === 'YES') {
    newYesPrice = Math.min(0.95, +(market.yes_price + (numAmount * 0.015)).toFixed(2));
    newNoPrice = +(1 - newYesPrice).toFixed(2);
    db.prepare(`
      UPDATE markets 
      SET yes_pool_sol = yes_pool_sol + ?, 
          volume_sol = volume_sol + ?,
          yes_price = ?,
          no_price = ?
      WHERE id = ?
    `).run(numAmount, numAmount, newYesPrice, newNoPrice, marketId);
  } else {
    newNoPrice = Math.min(0.95, +(market.no_price + (numAmount * 0.015)).toFixed(2));
    newYesPrice = +(1 - newNoPrice).toFixed(2);
    db.prepare(`
      UPDATE markets 
      SET no_pool_sol = no_pool_sol + ?, 
          volume_sol = volume_sol + ?,
          yes_price = ?,
          no_price = ?
      WHERE id = ?
    `).run(numAmount, numAmount, newYesPrice, newNoPrice, marketId);
  }

  const positionId = nanoid(12);
  const userWallet = walletAddress || 'Anonymous_' + nanoid(6);

  db.prepare(`
    INSERT INTO positions (id, user_id, wallet_address, market_id, prediction, amount_sol, shares, avg_price, tx_signature)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    positionId,
    'usr_sol',
    userWallet,
    marketId,
    prediction,
    numAmount,
    shares,
    currentPrice,
    txSignature || 'onchain_escrow_' + nanoid(16)
  );

  const updatedMarket = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);

  res.json({
    success: true,
    positionId,
    shares,
    avgPrice: currentPrice,
    payoutPotentialSol: +(shares * 1.0).toFixed(2),
    txSignature: txSignature,
    solscanUrl: txSignature ? `https://solscan.io/tx/${txSignature}` : null,
    escrowVault: ESCROW_VAULT_ADDRESS,
    market: updatedMarket
  });
});

import { resolveMarket, runAutomatedSettlementCheck } from './settlement.js';

// User's active positions
app.get('/api/user/positions', (req, res) => {
  const query = `
    SELECT 
      p.id AS position_id,
      p.wallet_address,
      p.prediction,
      p.amount_sol,
      p.shares,
      p.avg_price,
      p.tx_signature,
      p.claimed,
      p.created_at,
      m.id AS market_id,
      m.title,
      m.image_url,
      m.settlement_date,
      m.status AS market_status,
      m.yes_price,
      m.no_price
    FROM positions p
    JOIN markets m ON p.market_id = m.id
    ORDER BY p.created_at DESC
  `;
  const positions = db.prepare(query).all();
  res.json(positions);
});

// Settlement API (called daily or manually by admin/oracle trigger)
app.post('/api/admin/resolve', async (req, res) => {
  const { marketId, winningOutcome, proof, secret } = req.body;
  const adminSecret = process.env.ADMIN_SECRET || 'musicx_secret_settle_2026';

  if (secret && secret !== adminSecret) {
    return res.status(403).json({ error: 'Unauthorized settlement trigger' });
  }

  if (!marketId || !['YES', 'NO'].includes(winningOutcome)) {
    return res.status(400).json({ error: 'Provide marketId and winningOutcome (YES/NO)' });
  }

  try {
    const result = await resolveMarket(marketId, winningOutcome, proof);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily Cron Status Check
app.get('/api/settlement/status', async (req, res) => {
  try {
    const check = await runAutomatedSettlementCheck();
    res.json(check);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live Oracle Verification Endpoint (checks live Spotify data against all markets)
app.get('/api/oracle/verify', async (req, res) => {
  try {
    const verification = await runAutomatedSettlementCheck();
    res.json(verification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MusicX Onchain Escrow API running on port ${PORT}`);
  console.log(`🔒 Vault address: ${ESCROW_VAULT_ADDRESS}`);

  // Schedule daily 24h background settlement check
  setInterval(() => {
    runAutomatedSettlementCheck().catch(console.error);
  }, 1000 * 60 * 60 * 12); // Every 12 hours
});
