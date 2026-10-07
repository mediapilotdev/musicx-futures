import { Connection, PublicKey, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEYPAIR_PATH = process.env.ESCROW_KEYPAIR_PATH || path.join(__dirname, '..', 'escrow-vault-keypair.json');
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

const connection = new Connection(SOLANA_RPC, 'confirmed');

// Load Escrow Vault Keypair
let vaultKeypair = null;
try {
  if (fs.existsSync(KEYPAIR_PATH)) {
    const raw = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'));
    vaultKeypair = Keypair.fromSecretKey(Uint8Array.from(raw));
    console.log(`[Settlement Worker] Escrow Vault loaded: ${vaultKeypair.publicKey.toBase58()}`);
  } else if (process.env.ESCROW_VAULT_PRIVATE_KEY) {
    const raw = JSON.parse(process.env.ESCROW_VAULT_PRIVATE_KEY);
    vaultKeypair = Keypair.fromSecretKey(Uint8Array.from(raw));
    console.log(`[Settlement Worker] Escrow Vault loaded from ENV: ${vaultKeypair.publicKey.toBase58()}`);
  } else {
    console.warn('[Settlement Worker] No vault keypair found. Payout transactions will be simulated.');
  }
} catch (e) {
  console.error('[Settlement Worker] Failed to load escrow vault keypair:', e.message);
}

/**
 * Resolves a market and executes automatic SOL disbursements to winning positions
 * @param {string} marketId - ID of the market (e.g. 'mkt_karol_no1')
 * @param {'YES' | 'NO'} winningOutcome - Winning outcome
 * @param {string} resolutionProof - URL or proof citation (e.g. charts.spotify.com)
 */
export async function resolveMarket(marketId, winningOutcome, resolutionProof = '') {
  console.log(`\n========================================`);
  console.log(`[RESOLVING MARKET] ${marketId} -> Outcome: ${winningOutcome}`);
  console.log(`Proof: ${resolutionProof}`);
  console.log(`========================================`);

  const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);
  if (!market) {
    throw new Error(`Market not found: ${marketId}`);
  }
  if (market.status !== 'OPEN') {
    throw new Error(`Market is already resolved: status=${market.status}`);
  }

  const statusVal = winningOutcome === 'YES' ? 'RESOLVED_YES' : 'RESOLVED_NO';

  // 1. Mark market as resolved in DB
  db.prepare(`
    UPDATE markets 
    SET status = ? 
    WHERE id = ?
  `).run(statusVal, marketId);

  // 2. Fetch all winning positions that haven't claimed/received payouts yet
  const winningPositions = db.prepare(`
    SELECT * FROM positions 
    WHERE market_id = ? 
      AND prediction = ? 
      AND claimed = 0
  `).all(marketId, winningOutcome);

  console.log(`Found ${winningPositions.length} winning position(s) to disburse.`);

  const payoutResults = [];

  for (const pos of winningPositions) {
    // 1 Share = 1.0 SOL payout
    const payoutSol = +(pos.shares * 1.0).toFixed(4);
    const lamports = Math.floor(payoutSol * LAMPORTS_PER_SOL);

    console.log(`Processing payout for wallet ${pos.wallet_address}: ${payoutSol} SOL (${pos.shares} shares)...`);

    let txSig = null;

    if (vaultKeypair && lamports > 0) {
      try {
        const recipientPubkey = new PublicKey(pos.wallet_address);
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: vaultKeypair.publicKey,
            toPubkey: recipientPubkey,
            lamports
          })
        );

        txSig = await sendAndConfirmTransaction(connection, tx, [vaultKeypair], {
          commitment: 'confirmed'
        });
        console.log(`✅ Onchain payout sent! Sig: ${txSig} (Solscan: https://solscan.io/tx/${txSig})`);
      } catch (err) {
        console.error(`⚠️ Onchain payout failed for ${pos.wallet_address}:`, err.message);
        txSig = 'failed: ' + err.message;
      }
    } else {
      console.log(`ℹ️ Simulation mode or 0 balance: Marked position as resolved without onchain dispatch.`);
      txSig = 'simulated_settlement_' + Date.now();
    }

    // Mark position as claimed & store resolution payout tx
    db.prepare(`
      UPDATE positions 
      SET claimed = 1 
      WHERE id = ?
    `).run(pos.id);

    payoutResults.push({
      positionId: pos.id,
      wallet: pos.wallet_address,
      payoutSol,
      txSig,
      solscan: txSig && !txSig.startsWith('failed') && !txSig.startsWith('simulated')
        ? `https://solscan.io/tx/${txSig}`
        : null
    });
  }

  return {
    marketId,
    status: statusVal,
    winningOutcome,
    resolutionProof,
    winnersCount: winningPositions.length,
    payoutResults
  };
}

/**
 * Daily settlement job: Checks active markets and can be triggered via cron or API
 */
export async function runAutomatedSettlementCheck() {
  console.log(`[Settlement Worker] Checking for pending/expired markets at ${new Date().toISOString()}...`);
  const openMarkets = db.prepare("SELECT * FROM markets WHERE status = 'OPEN'").all();
  
  return {
    checkedAt: new Date().toISOString(),
    openMarketsCount: openMarkets.length,
    markets: openMarkets.map(m => ({ id: m.id, title: m.title, settlement_date: m.settlement_date }))
  };
}
