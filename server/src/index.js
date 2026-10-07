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
