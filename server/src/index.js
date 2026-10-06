import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { db } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

const SOLANA_RPC = process.env.SOLANA_RPC || clusterApiUrl('devnet');
const connection = new Connection(SOLANA_RPC, 'confirmed');
const ESCROW_WALLET = process.env.ESCROW_WALLET || '8szR7W2QGk26QW9m5B8V51Q91k8c7jYqZkH9x8d3';

app.use(cors());
app.use(express.json());

// Healthcheck & status
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'musicx-solana-prediction-api',
    solanaNetwork: 'devnet',
    escrowWallet: ESCROW_WALLET,
    timestamp: new Date().toISOString()
  });
});

// All Active Prediction Markets
app.get('/api/markets', (req, res) => {
  const category = req.query.category;
  let query = "SELECT * FROM markets WHERE status = 'OPEN'";
  let params = [];
  
  if (category && category !== 'ALL') {
    query += ' AND category = ?';
    params.push(category);
  }
  query += ' ORDER BY volume_sol DESC';

  const markets = db.prepare(query).all(...params);
  res.json(markets);
});

// Market Details
app.get('/api/markets/:id', (req, res) => {
  const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(req.params.id);
  if (!market) return res.status(404).json({ error: 'Market not found' });
  res.json(market);
});

// Place prediction in SOL (Polymarket order mechanism)
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

  // Calculate price and shares
  const currentPrice = prediction === 'YES' ? market.yes_price : market.no_price;
  const shares = +(numAmount / currentPrice).toFixed(2);

  // Dynamic price shift (bonding curve AMM adjustment)
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
  const userWallet = walletAddress || 'SolWallet_' + nanoid(6);

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
    txSignature || 'sol_tx_' + nanoid(16)
  );

  const updatedMarket = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);

  res.json({
    success: true,
    positionId,
    shares,
    avgPrice: currentPrice,
    payoutPotentialSol: +(shares * 1.0).toFixed(2), // Each share pays 1 SOL on YES/NO resolution
    txSignature: txSignature || 'sol_tx_' + nanoid(16),
    market: updatedMarket
  });
});

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MusicX 24H Prediction Markets API running on port ${PORT}`);
});
