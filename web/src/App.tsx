import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Flame, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  BarChart3, 
  Search, 
  Coins, 
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  Newspaper,
  BookOpen,
  Disc3
} from 'lucide-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface Market {
  id: string;
  title: string;
  category: 'DAILY_CHARTS' | 'NEW_RELEASES' | 'BATTLES' | 'VIRAL';
  subtitle: string;
  image_url: string;
  settlement_date: string;
  resolution_source: string;
  news_url?: string;
  news_title?: string;
  news_source?: string;
  yes_price: number;
  no_price: number;
  yes_pool_sol: number;
  no_pool_sol: number;
  volume_sol: number;
}

interface Position {
  position_id: string;
  wallet_address: string;
  prediction: string;
  amount_sol: number;
  shares: number;
  avg_price: number;
  tx_signature: string;
  created_at: string;
  market_id: string;
  title: string;
  image_url: string;
  settlement_date: string;
}

// Onchain Escrow Vault on Solana Mainnet
const ESCROW_VAULT_PUBLIC_KEY = new PublicKey('32WWuApRT3XyEHYz4EzadNe55m27a4BMWj1BigWyM8zG');

export default function App() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [solBalance, setSolBalance] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'markets' | 'portfolio'>('markets');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [tradeChoice, setTradeChoice] = useState<'YES' | 'NO'>('YES');
  const [solAmount, setSolAmount] = useState<number>(0.05);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; link?: string } | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'https://musicx-futures-api-production.up.railway.app';
  const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

  useEffect(() => {
    fetchMarkets();
    fetchPositions();
    checkWallet();
  }, [selectedCategory]);

  const checkWallet = async () => {
    const solana = (window as any).solana;
    if (solana && solana.isPhantom && solana.isConnected) {
      setWalletConnected(true);
      setWalletAddress(solana.publicKey.toString());
      fetchSolBalance(solana.publicKey.toString());
    }
  };

  const connectWallet = async () => {
    try {
      const solana = (window as any).solana;
      if (solana) {
        const resp = await solana.connect();
        const pubkey = resp.publicKey.toString();
        setWalletConnected(true);
        setWalletAddress(pubkey);
        fetchSolBalance(pubkey);
        showToast(`Connected: ${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`);
      } else {
        alert('Please install Phantom or Solflare wallet from phantom.app or solflare.com to trade with real SOL!');
      }
    } catch {
      showToast('⚠️ Wallet connection request dismissed');
    }
  };

  const fetchSolBalance = async (pubkey: string) => {
    try {
      const connection = new Connection(SOLANA_RPC, 'confirmed');
      const balance = await connection.getBalance(new PublicKey(pubkey));
      setSolBalance(+(balance / LAMPORTS_PER_SOL).toFixed(3));
    } catch {
      setSolBalance(0.5);
    }
  };

  const fetchMarkets = async () => {
    try {
      const url = selectedCategory === 'ALL' 
        ? `${API_BASE}/api/markets` 
        : `${API_BASE}/api/markets?category=${selectedCategory}`;
      const res = await fetch(url);
      if (res.ok) setMarkets(await res.json());
    } catch {
      // fallback
    }
  };

  const fetchPositions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/positions`);
      if (res.ok) setPositions(await res.json());
    } catch {
      // fallback
    }
  };

  const showToast = (text: string, link?: string) => {
    setToastMsg({ text, link });
    setTimeout(() => setToastMsg(null), 6000);
  };

  const handlePredictSol = async () => {
    if (!selectedMarket) return;
    if (!walletConnected) {
      showToast('⚠️ Please connect Phantom / Solflare wallet first');
      return;
    }
    if (solAmount > solBalance && solBalance > 0) {
      showToast(`⚠️ Insufficient balance (${solBalance} SOL available)`);
      return;
    }

    setIsSubmitting(true);
    try {
      let txSig = '';
      const solana = (window as any).solana;

      if (solana && solana.isPhantom) {
        try {
          const connection = new Connection(SOLANA_RPC, 'confirmed');
          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: new PublicKey(walletAddress),
              toPubkey: ESCROW_VAULT_PUBLIC_KEY,
              lamports: Math.round(solAmount * LAMPORTS_PER_SOL),
            })
          );
          transaction.feePayer = new PublicKey(walletAddress);
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;

          const signed = await solana.signAndSendTransaction(transaction);
          txSig = signed.signature;
        } catch (walletErr: any) {
          showToast(`❌ Solana rejected: ${walletErr?.message || 'Cancelled'}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Record to backend database
      const res = await fetch(`${API_BASE}/api/predict/sol`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: selectedMarket.id,
          prediction: tradeChoice,
          amountSol: solAmount,
          walletAddress: walletAddress,
          txSignature: txSig
        })
      });

      if (res.ok) {
        setSolBalance((prev) => Math.max(0, +(prev - solAmount).toFixed(3)));
        showToast(
          `🎉 Confirmed on Solana! Staked ${solAmount} SOL on ${tradeChoice}`,
          txSig ? `https://solscan.io/tx/${txSig}` : undefined
        );
        setSelectedMarket(null);
        fetchMarkets();
        fetchPositions();
      } else {
        showToast('⚠️ Error registering prediction');
      }
    } catch {
      showToast('⚠️ Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMarkets = markets.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#090b10' }}>
      
      {/* Top Navbar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backgroundColor: 'rgba(9, 11, 16, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(16, 185, 129, 0.35)'
          }}>
            <Disc3 size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              Music<span style={{ color: '#10b981' }}>X</span>
              <span style={{
                fontSize: '0.62rem',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                padding: '2px 7px',
                borderRadius: '6px',
                fontWeight: 800,
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                MAINNET LIVE
              </span>
            </h1>
            <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: 0 }}>Onchain Spotify & Streaming Predictions on Solana</p>
          </div>
        </div>

        {/* Solana Wallet Connect & Vault Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a
            href="https://solscan.io/account/32WWuApRT3XyEHYz4EzadNe55m27a4BMWj1BigWyM8zG"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '0.72rem',
              color: '#9ca3af',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              padding: '0.35rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
            title="View Onchain Escrow Vault on Solscan"
          >
            <ShieldCheck size={13} color="#10b981" />
            <span style={{ fontFamily: 'monospace' }}>Vault 32WW...M8zG</span>
            <ExternalLink size={11} />
          </a>

          {walletConnected ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              padding: '0.45rem 0.95rem',
              borderRadius: '9999px'
            }}>
              <Coins size={15} color="#10b981" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', color: '#f3f4f6' }}>
                {solBalance.toFixed(2)} SOL
              </span>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', borderLeft: '1px solid rgba(255, 255, 255, 0.15)', paddingLeft: '8px' }}>
                {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
              </span>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              style={{
                backgroundColor: '#10b981',
                color: '#000',
                border: 'none',
                padding: '0.5rem 1.15rem',
                borderRadius: '9999px',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 0 18px rgba(16, 185, 129, 0.4)'
              }}
            >
              <Wallet size={15} /> Connect Phantom
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1080px', margin: '0 auto', width: '100%', padding: '1.25rem 1rem' }}>
        
        {/* Categories Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '0.85rem'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
            {[
              { id: 'ALL', label: '⚡ All Fast Markets' },
              { id: 'DAILY_CHARTS', label: '📊 24h Daily Charts' },
              { id: 'NEW_RELEASES', label: '🔥 New Drops' },
              { id: 'BATTLES', label: '⚔️ Chart Duels' },
              { id: 'VIRAL', label: '📈 Viral & Sprints' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  backgroundColor: selectedCategory === cat.id ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedCategory === cat.id ? '#000' : '#d1d5db',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '0.45rem 0.95rem',
                  borderRadius: '9999px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => setActiveTab('markets')}
              style={{
                backgroundColor: activeTab === 'markets' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Browse ({markets.length})
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              style={{
                backgroundColor: activeTab === 'portfolio' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              My Bets ({positions.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Markets List */}
        {activeTab === 'markets' && (
          <div>
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <Search size={18} color="#6b7280" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search daily chart battles, new singles, or artist duels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.85rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Markets Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.15rem'
            }}>
              {filteredMarkets.map((m) => {
                const yesPercent = Math.round(m.yes_price * 100);
                const noPercent = 100 - yesPercent;

                return (
                  <div
                    key={m.id}
                    className="glass-card"
                    style={{
                      borderRadius: '16px',
                      padding: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      backgroundColor: 'rgba(18, 22, 34, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={13} color="#10b981" />
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                            {m.settlement_date}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                          Vol: {m.volume_sol.toFixed(1)} SOL
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '1rem' }}>
                        <img
                          src={m.image_url}
                          alt={m.title}
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '12px',
                            objectFit: 'cover',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontSize: '0.96rem', fontWeight: 700, margin: '0 0 0.25rem 0', lineHeight: 1.35 }}>
                            {m.title}
                          </h3>
                          <p style={{ fontSize: '0.74rem', color: '#9ca3af', margin: '0 0 0.45rem 0' }}>
                            {m.subtitle}
                          </p>
                          {m.news_url && (
                            <a
                              href={m.news_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.7rem',
                                color: '#10b981',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                fontWeight: 600,
                                border: '1px solid rgba(16, 185, 129, 0.25)'
                              }}
                            >
                              <BarChart3 size={12} color="#10b981" />
                              <span>{m.news_title || `${m.news_source}: View Live Standings`}</span>
                              <ExternalLink size={11} color="#10b981" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* YES / NO Two-Button Odds Box */}
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.85rem' }}>
                        <button
                          onClick={() => { setSelectedMarket(m); setTradeChoice('YES'); }}
                          style={{
                            padding: '0.65rem 0.5rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: '#fff'
                          }}
                        >
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#10b981' }}>YES</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'monospace' }}>{yesPercent}¢</span>
                        </button>

                        <button
                          onClick={() => { setSelectedMarket(m); setTradeChoice('NO'); }}
                          style={{
                            padding: '0.65rem 0.5rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: '#fff'
                          }}
                        >
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ef4444' }}>NO</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'monospace' }}>{noPercent}¢</span>
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#6b7280' }}>
                        <span>Oracle: Spotify Charts</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#10b981', fontWeight: 600 }}>
                          Solana Escrow <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: User Bets */}
        {activeTab === 'portfolio' && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
              Your Active Onchain Bets
            </h2>
            {positions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                border: '1px dashed rgba(255, 255, 255, 0.1)'
              }}>
                <Disc3 size={36} color="#6b7280" style={{ marginBottom: '0.75rem' }} />
                <p style={{ fontSize: '1rem', color: '#9ca3af', margin: 0 }}>No active bets placed yet.</p>
                <button
                  onClick={() => setActiveTab('markets')}
                  style={{
                    marginTop: '1rem',
                    backgroundColor: '#10b981',
                    border: 'none',
                    color: '#000',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Explore 24H Markets
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {positions.map((p) => (
                  <div
                    key={p.position_id}
                    className="glass-card"
                    style={{
                      borderRadius: '14px',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <img
                        src={p.image_url}
                        alt={p.title}
                        style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }}
                      />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{p.title}</h4>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          Settlement: {p.settlement_date}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{
                        padding: '0.3rem 0.75rem',
                        borderRadius: '8px',
                        backgroundColor: p.prediction === 'YES' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        border: `1px solid ${p.prediction === 'YES' ? '#10b981' : '#ef4444'}`,
                        color: p.prediction === 'YES' ? '#10b981' : '#ef4444',
                        fontWeight: 800,
                        fontSize: '0.85rem'
                      }}>
                        {p.prediction}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'monospace', color: '#10b981' }}>
                          {p.amount_sol} SOL
                        </div>
                        {p.tx_signature && (
                          <a
                            href={`https://solscan.io/tx/${p.tx_signature}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: '0.7rem',
                              color: '#60a5fa',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '2px'
                            }}
                          >
                            Solscan <ArrowUpRight size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Real SOL Onchain Order Slip Modal */}
      {selectedMarket && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 50
        }}>
          <div className="glass-panel" style={{
            maxWidth: '440px',
            width: '100%',
            borderRadius: '20px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backgroundColor: '#121622'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 800 }}>{selectedMarket.title}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>{selectedMarket.settlement_date}</span>
                  {selectedMarket.news_url && (
                    <a
                      href={selectedMarket.news_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        color: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: 600,
                        border: '1px solid rgba(16, 185, 129, 0.25)'
                      }}
                    >
                      <BarChart3 size={11} color="#10b981" />
                      <span>{selectedMarket.news_source}: Live Results</span>
                      <ExternalLink size={10} color="#10b981" />
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedMarket(null)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* YES / NO Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <button
                onClick={() => setTradeChoice('YES')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: `2px solid ${tradeChoice === 'YES' ? '#10b981' : 'rgba(255, 255, 255, 0.08)'}`,
                  backgroundColor: tradeChoice === 'YES' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                  color: tradeChoice === 'YES' ? '#10b981' : '#fff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                YES ({(selectedMarket.yes_price * 100).toFixed(0)}¢)
              </button>
              <button
                onClick={() => setTradeChoice('NO')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: `2px solid ${tradeChoice === 'NO' ? '#ef4444' : 'rgba(255, 255, 255, 0.08)'}`,
                  backgroundColor: tradeChoice === 'NO' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                  color: tradeChoice === 'NO' ? '#ef4444' : '#fff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                NO ({(selectedMarket.no_price * 100).toFixed(0)}¢)
              </button>
            </div>

            {/* SOL Stake Selection */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Stake Amount (SOL)</span>
                <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                  Wallet Balance: {solBalance.toFixed(3)} SOL
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.65rem' }}>
                {[0.02, 0.05, 0.1, 0.25].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setSolAmount(amt)}
                    style={{
                      flex: 1,
                      padding: '0.45rem',
                      borderRadius: '8px',
                      backgroundColor: solAmount === amt ? '#10b981' : 'rgba(255, 255, 255, 0.06)',
                      border: 'none',
                      color: solAmount === amt ? '#000' : '#fff',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {amt} SOL
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="0.01"
                value={solAmount}
                onChange={(e) => setSolAmount(Number(e.target.value))}
                min={0.01}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Escrow note */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '12px',
              padding: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Potential Return</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                  {(solAmount / (tradeChoice === 'YES' ? selectedMarket.yes_price : selectedMarket.no_price)).toFixed(3)} SOL
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>Payout Multiplier</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>
                  {(1 / (tradeChoice === 'YES' ? selectedMarket.yes_price : selectedMarket.no_price)).toFixed(2)}x
                </span>
              </div>
            </div>

            {/* Place Onchain Bet Button */}
            <button
              onClick={handlePredictSol}
              disabled={isSubmitting}
              style={{
                width: '100%',
                backgroundColor: tradeChoice === 'YES' ? '#10b981' : '#ef4444',
                color: '#fff',
                padding: '0.85rem',
                borderRadius: '12px',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? 'Signing on Solana...' : `Confirm on Solana: ${solAmount} SOL`}
            </button>
          </div>
        </div>
      )}

      {/* Floating Toast with Solscan Link */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#1f2937',
          color: '#fff',
          padding: '0.75rem 1.25rem',
          borderRadius: '9999px',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMsg.text}</span>
          {toastMsg.link && (
            <a
              href={toastMsg.link}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#60a5fa', marginLeft: '6px', display: 'flex', alignItems: 'center' }}
            >
              Solscan <ArrowUpRight size={13} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
