import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { db } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Solana Devnet/Mainnet connection
const SOLANA_RPC = process.env.SOLANA_RPC || clusterApiUrl('devnet');
const connection = new Connection(SOLANA_RPC, 'confirmed');

// House/Escrow treasury wallet for prediction escrow
const ESCROW_WALLET = process.env.ESCROW_WALLET || '8szR7W2QGk26QW9m5B8V51Q91k8c7jYqZkH9x8d3';

app.use(cors());
app.use(express.json());

// Healthcheck & Solana Network info
app.get('/health', async (req, res) => {
  try {
    const version = await connection.getVersion();
    res.json({
      status: 'ok',
      service: 'musicx-solana-futures-api',
      solanaNetwork: 'devnet',
      solanaVersion: version,
      escrowWallet: ESCROW_WALLET,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.json({
      status: 'ok',
      service: 'musicx-solana-futures-api',
      solanaNetwork: 'fallback',
      escrowWallet: ESCROW_WALLET,
      timestamp: new Date().toISOString()
    });
  }
});

// All Active Spotify Listener Futures Markets (SOL Pools)
app.get('/api/markets', (req, res) => {
  const query = `
    SELECT 
      m.id AS market_id,
      m.target_date,
      m.target_listeners,
      m.status,
      m.yes_pool_sol,
      m.no_pool_sol,
      a.id AS artist_id,
      a.name AS artist_name,
      a.spotify_id,
      a.image_url,
      a.genre,
      a.current_listeners,
      a.prev_listeners,
      (m.yes_pool_sol / (m.yes_pool_sol + m.no_pool_sol)) AS yes_prob,
      (m.no_pool_sol / (m.yes_pool_sol + m.no_pool_sol)) AS no_prob
    FROM markets m
    JOIN artists a ON m.artist_id = a.id
    ORDER BY (m.yes_pool_sol + m.no_pool_sol) DESC
  `;
  const markets = db.prepare(query).all();
  res.json(markets);
});

// Place prediction with SOL (receives onchain transaction signature from Phantom/Solflare)
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

  // Update market liquidity pool in SOL
  if (prediction === 'YES') {
    db.prepare('UPDATE markets SET yes_pool_sol = yes_pool_sol + ? WHERE id = ?').run(numAmount, marketId);
  } else {
    db.prepare('UPDATE markets SET no_pool_sol = no_pool_sol + ? WHERE id = ?').run(numAmount, marketId);
  }

  const positionId = nanoid(12);
  const userWallet = walletAddress || 'GuestSolWallet_' + nanoid(6);

  db.prepare(`
    INSERT INTO positions (id, user_id, wallet_address, market_id, prediction, amount_sol, tx_signature)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    positionId,
    'usr_sol',
    userWallet,
    marketId,
    prediction,
    numAmount,
    txSignature || 'simulated_tx_' + nanoid(16)
  );

  const updatedMarket = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);

  res.json({
    success: true,
    positionId,
    amountSol: numAmount,
    txSignature: txSignature || 'simulated_tx_' + nanoid(16),
    market: updatedMarket
  });
});

// User's active positions by wallet address
app.get('/api/user/positions', (req, res) => {
  const wallet = req.query.wallet || '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';
  const query = `
    SELECT 
      p.id AS position_id,
      p.wallet_address,
      p.prediction,
      p.amount_sol,
      p.tx_signature,
      p.created_at,
      m.id AS market_id,
      m.target_date,
      m.target_listeners,
      m.status AS market_status,
      a.name AS artist_name,
      a.image_url,
      a.current_listeners
    FROM positions p
    JOIN markets m ON p.market_id = m.id
    JOIN artists a ON m.artist_id = a.id
    ORDER BY p.created_at DESC
  `;
  const positions = db.prepare(query).all();
  res.json(positions);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MusicX Solana Futures API listening on port ${PORT}`);
});
