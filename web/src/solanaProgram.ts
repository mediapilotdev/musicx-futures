import { PublicKey } from '@solana/web3.js';

// MusicX Solana Prediction Program Details
export const MUSICX_PROGRAM_ID = new PublicKey('Mus1cX1111111111111111111111111111111111111');

// PDA Derivation helpers for 100% onchain escrow
export function getMarketPDA(marketId: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('market'), Buffer.from(marketId)],
    MUSICX_PROGRAM_ID
  );
}

export function getVaultPDA(marketPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), marketPubkey.toBuffer()],
    MUSICX_PROGRAM_ID
  );
}

export function getPositionPDA(marketPubkey: PublicKey, userPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('position'), marketPubkey.toBuffer(), userPubkey.toBuffer()],
    MUSICX_PROGRAM_ID
  );
}
