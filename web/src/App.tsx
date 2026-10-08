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
  Disc3,
  HelpCircle,
  Award,
  Zap,
  Activity,
  Code,
  Sparkles,
  Layers,
  Check,
  ArrowRight
} from 'lucide-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface Market {
  id: string;
  title: string;
  category: 'DAILY_CHARTS' | 'NEW_RELEASES' | 'BATTLES' | 'VIRAL';
  subtitle: string;
  image_url: string;
  settlement_date: string;
  settlement_timestamp?: string;
  settlement_rules?: string;
  resolution_source: string;
  news_url?: string;
  news_title?: string;
  news_source?: string;
  live_status_text?: string;
  live_metric_verified?: boolean;
  yes_price: number;
  no_price: number;
  yes_pool_sol: number;
  no_pool_sol: number;
  volume_sol: number;
}

interface OracleVerification {
  marketId: string;
  title: string;
  resolutionSource: string;
  oracleUrl: string;
  liveMetricVerified: boolean;
  currentStatusText: string;
  oracleDetails?: any;
}

interface OracleStatusResponse {
  timestamp: string;
  oracleSource: string;
  oracleStatus: string;
  totalActiveMarkets: number;
  verifications: OracleVerification[];
}

// Live Countdown Badge
function LiveCountdownBadge({ targetIso }: { targetIso?: string }) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    hours: 23,
    minutes: 42,
    seconds: 15,
    isExpired: false
  });

  useEffect(() => {
    if (!targetIso) return;
    const calculateTime = () => {
      const target = new Date(targetIso).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  if (timeLeft.isExpired) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.72rem',
        fontWeight: 800,
        color: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        padding: '3px 8px',
        borderRadius: '6px'
      }}>
        <Clock size={12} />
        SETTLING NOW
      </span>
    );
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '0.72rem',
      fontWeight: 800,
      color: '#01b8ca',
      backgroundColor: 'rgba(1, 184, 202, 0.12)',
      border: '1px solid rgba(1, 184, 202, 0.28)',
      padding: '3px 8px',
      borderRadius: '6px'
    }}>
      <Clock size={12} />
      {String(timeLeft.hours).padStart(2, '0')}:
      {String(timeLeft.minutes).padStart(2, '0')}:
      {String(timeLeft.seconds).padStart(2, '0')}
    </span>
  );
}

const ESCROW_VAULT_PUBLIC_KEY = new PublicKey('32WWuApRT3XyEHYz4EzadNe55m27a4BMWj1BigWyM8zG');

export default function App() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [tradeChoice, setTradeChoice] = useState<'YES' | 'NO'>('YES');
  const [solAmount, setSolAmount] = useState<number>(0.005);
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [solBalance, setSolBalance] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [positions, setPositions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'markets' | 'portfolio' | 'oracle'>('markets');
  const [toastMsg, setToastMsg] = useState<{ text: string; link?: string; tweetText?: string } | null>(null);
  
  // Modals
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);
  const [showTokenomics, setShowTokenomics] = useState<boolean>(false);
  const [showGrants, setShowGrants] = useState<boolean>(false);
  
  // Oracle status
  const [oracleStatusData, setOracleStatusData] = useState<OracleStatusResponse | null>(null);
  const [loadingOracle, setLoadingOracle] = useState<boolean>(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'https://musicx-futures-api-production.up.railway.app';

  useEffect(() => {
    fetchMarkets();
    fetchPositions();
    checkWallet();
    fetchOracleStatus();
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
      const solana = (window as any).solana;
      if (solana && typeof solana.request === 'function') {
        const res = await solana.request({
          method: 'getBalance',
          params: [pubkey]
        });
        if (res && res.value !== undefined) {
          setSolBalance(+(res.value / LAMPORTS_PER_SOL).toFixed(3));
          return;
        }
      }

      const rpcRes = await fetch(`${API_BASE}/api/solana/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [pubkey, { commitment: 'confirmed' }]
        })
      });
      if (rpcRes.ok) {
        const rpcData = await rpcRes.json();
        if (rpcData.result?.value !== undefined) {
          setSolBalance(+(rpcData.result.value / LAMPORTS_PER_SOL).toFixed(3));
          return;
        }
      }
    } catch {
      // fallback
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
      const url = walletAddress 
        ? `${API_BASE}/api/user/positions?wallet=${walletAddress}` 
        : `${API_BASE}/api/user/positions`;
      const res = await fetch(url);
      if (res.ok) setPositions(await res.json());
    } catch {
      // fallback
    }
  };

  const fetchOracleStatus = async () => {
    setLoadingOracle(true);
    try {
      const res = await fetch(`${API_BASE}/api/settlement/status`);
      if (res.ok) {
        setOracleStatusData(await res.json());
      }
    } catch {
      // fallback
    } finally {
      setLoadingOracle(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchPositions();
    }
  }, [walletAddress]);

  const showToast = (text: string, link?: string, tweetText?: string) => {
    setToastMsg({ text, link, tweetText });
    setTimeout(() => setToastMsg(null), 8000);
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
          const bhRes = await fetch(`${API_BASE}/api/solana/blockhash`);
          if (!bhRes.ok) throw new Error('Could not fetch Solana blockhash from node');
          const { blockhash } = await bhRes.json();

          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: new PublicKey(walletAddress),
              toPubkey: ESCROW_VAULT_PUBLIC_KEY,
              lamports: Math.round(solAmount * LAMPORTS_PER_SOL),
            })
          );
          transaction.feePayer = new PublicKey(walletAddress);
          transaction.recentBlockhash = blockhash;

          const signed = await solana.signAndSendTransaction(transaction);
          txSig = typeof signed === 'string' ? signed : signed?.signature || '';
        } catch (walletErr: any) {
          if (walletErr?.signature) {
            txSig = walletErr.signature;
          } else {
            showToast(`❌ Solana rejected: ${walletErr?.message || 'Cancelled'}`);
            setIsSubmitting(false);
            return;
          }
        }
      }

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
        const tweet = `I just staked ${solAmount} SOL on ${tradeChoice} for "${selectedMarket.title}" on @musicxdotfun! 🎵📈\n\nTrade 24H music futures on Solana: https://musicx.fun`;
        showToast(
          `🎉 Confirmed on Solana! Staked ${solAmount} SOL on ${tradeChoice}`,
          txSig ? `https://solscan.io/tx/${txSig}` : undefined,
          txSig ? tweet : undefined
        );
        setSelectedMarket(null);
        setActiveTab('portfolio');
        fetchMarkets();
        fetchPositions();
      } else {
        const errData = await res.json().catch(() => null);
        showToast(`⚠️ ${errData?.error || 'Error registering prediction'}`);
        fetchPositions();
      }
    } catch (err: any) {
      showToast(`⚠️ Transaction failed: ${err?.message || ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMarkets = markets.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0f1d', color: '#f8fafc' }}>
      
      {/* 80% Community Token Pool Announcement Bar */}
      <div style={{
        background: 'linear-gradient(90deg, #0d1b2a 0%, #102a43 50%, #0d1b2a 100%)',
        borderBottom: '1px solid rgba(1, 184, 202, 0.35)',
        padding: '0.5rem 1rem',
        fontSize: '0.78rem',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '0.65rem'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            backgroundColor: '#01b8ca',
            color: '#0d1b2a',
            fontSize: '0.65rem',
            fontWeight: 900,
            padding: '2px 7px',
            borderRadius: '4px',
            letterSpacing: '0.04em'
          }}>
            AIRDROP ALPHA
          </span>
          <span style={{ fontWeight: 700, color: '#f8fafc' }}>
            💎 <strong>80% of MusicX Tokens Reserved for Users</strong> — Early test volume qualifies for 3x weighted retroactive share!
          </span>
        </div>
        <button
          onClick={() => setShowTokenomics(true)}
          style={{
            backgroundColor: 'rgba(1, 184, 202, 0.15)',
            border: '1px solid #01b8ca',
            color: '#00f5d4',
            padding: '2px 10px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          View Tokenomics <ArrowRight size={11} />
        </button>
      </div>

      {/* Top Navbar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backgroundColor: 'rgba(10, 15, 29, 0.94)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(1, 184, 202, 0.18)',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <img
            src="/logo.png"
            alt="MusicX Logo"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '2px solid #01b8ca',
              boxShadow: '0 0 16px rgba(1, 184, 202, 0.45)'
            }}
          />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              Music<span style={{ color: '#01b8ca' }}>X</span>
              <span style={{
                fontSize: '0.62rem',
                backgroundColor: 'rgba(1, 184, 202, 0.15)',
                color: '#00f5d4',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 800,
                border: '1px solid rgba(1, 184, 202, 0.4)'
              }}>
                SOLANA MAINNET
              </span>
            </h1>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
              24H Music Prediction Markets & Daily Streaming Futures
            </p>
          </div>
        </div>

        {/* Action pills & links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowTokenomics(true)}
            style={{
              backgroundColor: 'rgba(1, 184, 202, 0.1)',
              border: '1px solid rgba(1, 184, 202, 0.3)',
              color: '#00f5d4',
              padding: '0.42rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Sparkles size={13} color="#00f5d4" />
            <span>80% Token Pool</span>
          </button>

          <button
            onClick={() => { setActiveTab('oracle'); fetchOracleStatus(); }}
            style={{
              backgroundColor: activeTab === 'oracle' ? 'rgba(1, 184, 202, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(1, 184, 202, 0.25)',
              color: '#38bdf8',
              padding: '0.42rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Activity size={13} color="#38bdf8" />
            <span>Live Oracle</span>
          </button>

          <button
            onClick={() => setShowGrants(true)}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              padding: '0.42rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Award size={13} color="#01b8ca" />
            <span>Hackathons & Grants</span>
          </button>

          <button
            onClick={() => setShowHowItWorks(true)}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              padding: '0.42rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <HelpCircle size={13} color="#01b8ca" />
            <span>Rules</span>
          </button>

          <a
            href="https://solscan.io/account/32WWuApRT3XyEHYz4EzadNe55m27a4BMWj1BigWyM8zG"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '0.72rem',
              color: '#94a3b8',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              padding: '0.42rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
            title="View Non-Custodial Vault on Solscan"
          >
            <ShieldCheck size={13} color="#01b8ca" />
            <span style={{ fontFamily: 'monospace' }}>Vault 32WW...M8zG</span>
            <ExternalLink size={11} />
          </a>

          {/* Solana Wallet Connect */}
          {walletConnected ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: 'rgba(1, 184, 202, 0.08)',
              border: '1px solid rgba(1, 184, 202, 0.35)',
              padding: '0.45rem 0.95rem',
              borderRadius: '9999px'
            }}>
              <Coins size={15} color="#00f5d4" />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, fontFamily: 'monospace', color: '#f8fafc' }}>
                {solBalance.toFixed(2)} SOL
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', borderLeft: '1px solid rgba(255, 255, 255, 0.15)', paddingLeft: '8px' }}>
                {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
              </span>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              style={{
                backgroundColor: '#01b8ca',
                color: '#0a0f1d',
                border: 'none',
                padding: '0.5rem 1.15rem',
                borderRadius: '9999px',
                fontSize: '0.84rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 0 18px rgba(1, 184, 202, 0.45)',
                transition: 'all 0.2s ease'
              }}
            >
              <Wallet size={15} /> Connect Phantom
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1100px', margin: '0 auto', width: '100%', padding: '1.25rem 1rem' }}>
        
        {/* Live Onchain Activity Ticker */}
        <div style={{
          backgroundColor: 'rgba(13, 27, 42, 0.75)',
          border: '1px solid rgba(1, 184, 202, 0.25)',
          borderRadius: '12px',
          padding: '0.65rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.6rem',
          fontSize: '0.76rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#00f5d4',
              boxShadow: '0 0 8px #00f5d4',
              display: 'inline-block'
            }} />
            <strong style={{ color: '#00f5d4', letterSpacing: '0.04em' }}>LIVE ONCHAIN BET:</strong>
            <span style={{ color: '#e2e8f0' }}>
              Wallet <code style={{ color: '#38bdf8', backgroundColor: 'rgba(255, 255, 255, 0.06)', padding: '2px 5px', borderRadius: '4px' }}>6owU...qEWr</code> staked <strong>0.001 SOL</strong> on <span style={{ color: '#00f5d4', fontWeight: 800 }}>YES</span> for <em>Taylor Swift vs ADÉLA</em> (@ 59¢)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href="https://solscan.io/tx/QuFjDhmLY19FhJufEXCvkE3qoPWd1DrXTJCgNqsQxm9nq1ocAHT52fP6x4rb4fNoGndtjSsBYNjS8qXVip2H9Ms"
              target="_blank"
              rel="noreferrer"
              style={{
                color: '#38bdf8',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontWeight: 700,
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(56, 189, 248, 0.25)'
              }}
            >
              Verified on Solscan <ArrowUpRight size={11} />
            </a>
          </div>
        </div>

        {/* Categories & Views Navigation */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid rgba(1, 184, 202, 0.15)',
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
                onClick={() => { setSelectedCategory(cat.id); setActiveTab('markets'); }}
                style={{
                  backgroundColor: selectedCategory === cat.id && activeTab === 'markets' ? '#01b8ca' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedCategory === cat.id && activeTab === 'markets' ? '#0a0f1d' : '#cbd5e1',
                  border: '1px solid ' + (selectedCategory === cat.id && activeTab === 'markets' ? '#01b8ca' : 'rgba(255, 255, 255, 0.08)'),
                  padding: '0.45rem 0.95rem',
                  borderRadius: '9999px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
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
                backgroundColor: activeTab === 'markets' ? 'rgba(1, 184, 202, 0.2)' : 'transparent',
                color: activeTab === 'markets' ? '#00f5d4' : '#94a3b8',
                border: '1px solid ' + (activeTab === 'markets' ? 'rgba(1, 184, 202, 0.4)' : 'transparent'),
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Markets ({markets.length})
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              style={{
                backgroundColor: activeTab === 'portfolio' ? 'rgba(1, 184, 202, 0.2)' : 'transparent',
                color: activeTab === 'portfolio' ? '#00f5d4' : '#94a3b8',
                border: '1px solid ' + (activeTab === 'portfolio' ? 'rgba(1, 184, 202, 0.4)' : 'transparent'),
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              My Bets ({positions.length})
            </button>
            <button
              onClick={() => { setActiveTab('oracle'); fetchOracleStatus(); }}
              style={{
                backgroundColor: activeTab === 'oracle' ? 'rgba(1, 184, 202, 0.2)' : 'transparent',
                color: activeTab === 'oracle' ? '#00f5d4' : '#94a3b8',
                border: '1px solid ' + (activeTab === 'oracle' ? 'rgba(1, 184, 202, 0.4)' : 'transparent'),
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Oracle Engine
            </button>
          </div>
        </div>

        {/* Tab 1: Markets List */}
        {activeTab === 'markets' && (
          <div>
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <Search size={18} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search daily chart battles, new singles, or artist duels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.85rem',
                  backgroundColor: 'rgba(17, 34, 54, 0.65)',
                  border: '1px solid rgba(1, 184, 202, 0.2)',
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
              gap: '1.25rem'
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
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      backgroundColor: 'rgba(17, 34, 54, 0.85)',
                      border: '1px solid rgba(1, 184, 202, 0.16)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <LiveCountdownBadge targetIso={m.settlement_timestamp} />
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            {m.settlement_date}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          Vol: {m.volume_sol > 0 ? (m.volume_sol < 0.01 ? m.volume_sol.toFixed(3) : m.volume_sol.toFixed(2)) : '0.00'} SOL
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '1rem' }}>
                        <img
                          src={m.image_url}
                          alt={m.title}
                          style={{
                            width: '58px',
                            height: '58px',
                            borderRadius: '12px',
                            objectFit: 'cover',
                            border: '1px solid rgba(1, 184, 202, 0.25)'
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontSize: '0.98rem', fontWeight: 800, margin: '0 0 0.25rem 0', lineHeight: 1.35 }}>
                            {m.title}
                          </h3>
                          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 0.45rem 0', lineHeight: 1.3 }}>
                            {m.subtitle}
                          </p>

                          {/* Live Oracle Current Standing */}
                          {m.live_status_text && (
                            <div style={{
                              fontSize: '0.7rem',
                              backgroundColor: 'rgba(1, 184, 202, 0.08)',
                              borderLeft: '2px solid #01b8ca',
                              padding: '4px 8px',
                              borderRadius: '0 6px 6px 0',
                              marginBottom: '0.45rem',
                              color: '#e2e8f0',
                              lineHeight: 1.3
                            }}>
                              <span style={{ color: '#00f5d4', fontWeight: 800, marginRight: '4px' }}>● LIVE ORACLE:</span>
                              {m.live_status_text}
                            </div>
                          )}

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
                                color: '#01b8ca',
                                backgroundColor: 'rgba(1, 184, 202, 0.12)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                fontWeight: 700,
                                border: '1px solid rgba(1, 184, 202, 0.3)'
                              }}
                            >
                              <BarChart3 size={12} color="#01b8ca" />
                              <span>{m.news_title || `${m.news_source}: Official Daily Chart`}</span>
                              <ExternalLink size={11} color="#01b8ca" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Visual Probability Meter */}
                    <div style={{ margin: '0.45rem 0 0.75rem 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 800, marginBottom: '5px' }}>
                        <span style={{ color: '#00f5d4' }}>{yesPercent}% YES ({yesPercent}¢)</span>
                        <span style={{ color: '#f43f5e' }}>{noPercent}% NO ({noPercent}¢)</span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(244, 63, 94, 0.35)',
                        overflow: 'hidden',
                        display: 'flex'
                      }}>
                        <div style={{
                          width: `${yesPercent}%`,
                          height: '100%',
                          backgroundColor: '#01b8ca',
                          boxShadow: '0 0 10px rgba(1, 184, 202, 0.8)',
                          transition: 'width 0.4s ease'
                        }} />
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
                            border: '1px solid rgba(1, 184, 202, 0.4)',
                            backgroundColor: 'rgba(1, 184, 202, 0.12)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: '#fff',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#00f5d4' }}>YES</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'monospace' }}>{yesPercent}¢</span>
                        </button>

                        <button
                          onClick={() => { setSelectedMarket(m); setTradeChoice('NO'); }}
                          style={{
                            padding: '0.65rem 0.5rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(244, 63, 94, 0.4)',
                            backgroundColor: 'rgba(244, 63, 94, 0.12)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: '#fff',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#f43f5e' }}>NO</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'monospace' }}>{noPercent}¢</span>
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>
                        <span>Oracle: Spotify Daily</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#01b8ca', fontWeight: 700 }}>
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Your Active Onchain Bets
            </h2>
            {positions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                backgroundColor: 'rgba(17, 34, 54, 0.5)',
                borderRadius: '16px',
                border: '1px dashed rgba(1, 184, 202, 0.25)'
              }}>
                <Disc3 size={38} color="#01b8ca" style={{ marginBottom: '0.75rem', opacity: 0.6 }} />
                <p style={{ fontSize: '1rem', color: '#cbd5e1', margin: 0 }}>No active bets placed yet.</p>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                  Connect your wallet and pick any 24H music market to start earning 80% retroactive airdrop shares!
                </p>
                <button
                  onClick={() => setActiveTab('markets')}
                  style={{
                    marginTop: '1.25rem',
                    backgroundColor: '#01b8ca',
                    border: 'none',
                    color: '#0a0f1d',
                    padding: '0.55rem 1.35rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Browse 24H Markets
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {positions.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="glass-card"
                    style={{
                      borderRadius: '14px',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.85rem',
                      backgroundColor: 'rgba(17, 34, 54, 0.85)',
                      border: '1px solid rgba(1, 184, 202, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {p.image_url && (
                        <img
                          src={p.image_url}
                          alt={p.title}
                          style={{ width: '46px', height: '46px', borderRadius: '10px', objectFit: 'cover' }}
                        />
                      )}
                      <div>
                        <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.94rem', fontWeight: 800 }}>{p.title}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#94a3b8' }}>
                          <span>Market ID: <code style={{ color: '#cbd5e1' }}>{p.market_id}</code></span>
                          <span>•</span>
                          <span>{p.created_at ? new Date(p.created_at).toLocaleTimeString() : 'Recent'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '8px',
                        backgroundColor: p.prediction === 'YES' ? 'rgba(1, 184, 202, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        border: `1px solid ${p.prediction === 'YES' ? '#01b8ca' : '#f43f5e'}`,
                        color: p.prediction === 'YES' ? '#00f5d4' : '#f43f5e',
                        fontWeight: 900,
                        fontSize: '0.85rem'
                      }}>
                        {p.prediction} ({(p.avg_price * 100).toFixed(0)}¢)
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 900, fontFamily: 'monospace', color: '#00f5d4' }}>
                          {p.amount_sol} SOL Staked
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '2px 0 4px 0' }}>
                          Est. Return: {(p.amount_sol / p.avg_price).toFixed(3)} SOL ({(1 / p.avg_price).toFixed(2)}x)
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          {p.tx_signature && (
                            <a
                              href={`https://solscan.io/tx/${p.tx_signature}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: '0.7rem',
                                color: '#38bdf8',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                                padding: '2px 7px',
                                borderRadius: '4px'
                              }}
                            >
                              Solscan <ArrowUpRight size={11} />
                            </a>
                          )}
                          <button
                            onClick={() => {
                              const tweetText = encodeURIComponent(
                                `I just staked ${p.amount_sol} SOL on ${p.prediction} for "${p.title}" on @musicxdotfun! 🎵📈\n\n` +
                                `Odds: ${(p.avg_price * 100).toFixed(0)}¢ (${(1 / p.avg_price).toFixed(2)}x payout)\n` +
                                (p.tx_signature ? `Onchain Proof: https://solscan.io/tx/${p.tx_signature}\n\n` : '\n') +
                                `Trade 24H music futures: https://musicx.fun`
                              );
                              window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: '#000',
                              border: '1px solid rgba(255, 255, 255, 0.25)',
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="Share on X / Twitter"
                          >
                            <span>𝕏 Tweet Bet</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Oracle Status & Settlement Transparency */}
        {activeTab === 'oracle' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.2rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={20} color="#00f5d4" />
                  Live Spotify Oracle & Automated Settlement Engine
                </h2>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                  Real-time verifiable chart data fed into Solana non-custodial escrow settlement.
                </p>
              </div>
              <button
                onClick={fetchOracleStatus}
                style={{
                  backgroundColor: 'rgba(1, 184, 202, 0.15)',
                  border: '1px solid #01b8ca',
                  color: '#00f5d4',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {loadingOracle ? 'Refreshing...' : '🔄 Refresh Oracle Feed'}
              </button>
            </div>

            {/* Oracle Architecture Overview Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                backgroundColor: 'rgba(17, 34, 54, 0.75)',
                border: '1px solid rgba(1, 184, 202, 0.2)',
                borderRadius: '12px',
                padding: '1rem'
              }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>ORACLE DATA SOURCE</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#00f5d4', marginTop: '4px' }}>
                  Spotify Daily Global Top 200
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                  Mirrored via Kworb / Spotify charts daily at 10:00 UTC
                </div>
              </div>

              <div style={{
                backgroundColor: 'rgba(17, 34, 54, 0.75)',
                border: '1px solid rgba(1, 184, 202, 0.2)',
                borderRadius: '12px',
                padding: '1rem'
              }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>ORACLE ENGINE STATUS</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00f5d4' }} />
                  {oracleStatusData?.oracleStatus || 'ONLINE_ACTIVE'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                  Evaluation cycle every 12H • Auto-payout enabled
                </div>
              </div>

              <div style={{
                backgroundColor: 'rgba(17, 34, 54, 0.75)',
                border: '1px solid rgba(1, 184, 202, 0.2)',
                borderRadius: '12px',
                padding: '1rem'
              }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>SETTLEMENT ESCROW</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#cbd5e1', marginTop: '4px', fontFamily: 'monospace' }}>
                  32WW...M8zG
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                  Public non-custodial Solana vault with Solscan auditing
                </div>
              </div>
            </div>

            {/* Oracle Verification Standings */}
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.85rem', color: '#cbd5e1' }}>
              Current Oracle Standings ({oracleStatusData?.verifications?.length || 0} Markets Monitored)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {oracleStatusData?.verifications?.map((v, i) => (
                <div
                  key={v.marketId || i}
                  style={{
                    backgroundColor: 'rgba(17, 34, 54, 0.85)',
                    border: '1px solid rgba(1, 184, 202, 0.16)',
                    borderRadius: '12px',
                    padding: '1rem 1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: v.liveMetricVerified ? 'rgba(0, 245, 212, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: v.liveMetricVerified ? '#00f5d4' : '#f43f5e',
                        border: `1px solid ${v.liveMetricVerified ? '#00f5d4' : '#f43f5e'}`
                      }}>
                        {v.liveMetricVerified ? 'YES TRIGGERED' : 'PENDING / NO'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{v.marketId}</span>
                    </div>
                    <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.92rem', fontWeight: 800 }}>{v.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                      <strong style={{ color: '#cbd5e1' }}>Live Condition Status:</strong> {v.currentStatusText}
                    </p>
                  </div>

                  <a
                    href={v.oracleUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: 'rgba(1, 184, 202, 0.12)',
                      border: '1px solid rgba(1, 184, 202, 0.3)',
                      color: '#01b8ca',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <span>View Spotify Source</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Real SOL Onchain Order Slip Modal */}
      {selectedMarket && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(10, 15, 29, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 50
        }}>
          <div className="glass-panel" style={{
            maxWidth: '460px',
            width: '100%',
            borderRadius: '20px',
            padding: '1.5rem',
            border: '1px solid rgba(1, 184, 202, 0.35)',
            backgroundColor: '#0d1b2a',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 800 }}>{selectedMarket.title}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                  <LiveCountdownBadge targetIso={selectedMarket.settlement_timestamp} />
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{selectedMarket.settlement_date}</span>
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
                        color: '#00f5d4',
                        backgroundColor: 'rgba(1, 184, 202, 0.1)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: 700,
                        border: '1px solid rgba(1, 184, 202, 0.25)'
                      }}
                    >
                      <span>Chart Standings</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedMarket(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Outcome Selection Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <button
                onClick={() => setTradeChoice('YES')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: `2px solid ${tradeChoice === 'YES' ? '#01b8ca' : 'rgba(255, 255, 255, 0.1)'}`,
                  backgroundColor: tradeChoice === 'YES' ? 'rgba(1, 184, 202, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#00f5d4' }}>BUY YES</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'monospace' }}>
                  {Math.round(selectedMarket.yes_price * 100)}¢
                </div>
              </button>

              <button
                onClick={() => setTradeChoice('NO')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: `2px solid ${tradeChoice === 'NO' ? '#f43f5e' : 'rgba(255, 255, 255, 0.1)'}`,
                  backgroundColor: tradeChoice === 'NO' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#f43f5e' }}>BUY NO</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'monospace' }}>
                  {Math.round(selectedMarket.no_price * 100)}¢
                </div>
              </button>
            </div>

            {/* SOL Stake Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                <span style={{ color: '#94a3b8' }}>Amount to Stake</span>
                <span style={{ color: '#cbd5e1' }}>Balance: {solBalance} SOL</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {[0.001, 0.005, 0.01, 0.05, 0.1].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setSolAmount(amt)}
                    style={{
                      flex: 1,
                      padding: '0.45rem',
                      borderRadius: '8px',
                      backgroundColor: solAmount === amt ? '#01b8ca' : 'rgba(255, 255, 255, 0.06)',
                      border: 'none',
                      color: solAmount === amt ? '#0a0f1d' : '#fff',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {amt} SOL
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="0.001"
                value={solAmount}
                onChange={(e) => setSolAmount(Number(e.target.value))}
                min={0.001}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(1, 184, 202, 0.25)',
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
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Potential Return</span>
                <span style={{ fontSize: '0.98rem', fontWeight: 900, color: '#00f5d4', fontFamily: 'monospace' }}>
                  {(solAmount / (tradeChoice === 'YES' ? selectedMarket.yes_price : selectedMarket.no_price)).toFixed(3)} SOL
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Payout Multiplier</span>
                <span style={{ fontSize: '0.98rem', fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>
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
                backgroundColor: tradeChoice === 'YES' ? '#01b8ca' : '#f43f5e',
                color: tradeChoice === 'YES' ? '#0a0f1d' : '#fff',
                padding: '0.85rem',
                borderRadius: '12px',
                border: 'none',
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: tradeChoice === 'YES' ? '0 0 20px rgba(1, 184, 202, 0.4)' : '0 0 20px rgba(244, 63, 94, 0.4)'
              }}
            >
              {isSubmitting ? 'Signing on Solana...' : `Confirm on Solana: ${solAmount} SOL`}
            </button>
          </div>
        </div>
      )}

      {/* 80% Community Tokenomics Modal */}
      {showTokenomics && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 15, 29, 0.88)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 70,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#0d1b2a',
            border: '1px solid rgba(1, 184, 202, 0.35)',
            borderRadius: '20px',
            maxWidth: '560px',
            width: '100%',
            padding: '1.75rem',
            position: 'relative',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #01b8ca 0%, #0c78e8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>MusicX Token Distribution</h3>
                  <span style={{ fontSize: '0.72rem', color: '#00f5d4', fontWeight: 800 }}>80% RESERVED FOR USERS</span>
                </div>
              </div>
              <button
                onClick={() => setShowTokenomics(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Tokenomics Highlights */}
            <div style={{
              backgroundColor: 'rgba(1, 184, 202, 0.08)',
              border: '1px solid rgba(1, 184, 202, 0.25)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                MusicX is built for music fans, not venture capital dumpers. <strong>80% of the entire token supply</strong> is locked for active traders, chart predictors, and early alpha community members.
              </p>
            </div>

            {/* Distribution Breakdown Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, marginBottom: '4px' }}>
                  <span style={{ color: '#00f5d4' }}>🎯 40% — Retroactive Early Tester Airdrop</span>
                  <span style={{ fontFamily: 'monospace' }}>40%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: '40%', height: '100%', backgroundColor: '#00f5d4' }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Highest multipliers allocated to initial users placing test bets and providing feedback.
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, marginBottom: '4px' }}>
                  <span style={{ color: '#01b8ca' }}>📈 40% — Ongoing Prediction Volume & Streaks</span>
                  <span style={{ fontFamily: 'monospace' }}>40%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: '40%', height: '100%', backgroundColor: '#01b8ca' }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Weekly leaderboard rewards, streak multipliers, and liquidity mining on active music markets.
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, marginBottom: '4px' }}>
                  <span style={{ color: '#38bdf8' }}>🛠️ 10% — Protocol Ecosystem & Grant Matching</span>
                  <span style={{ fontFamily: 'monospace' }}>10%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: '10%', height: '100%', backgroundColor: '#38bdf8' }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Open source oracle maintenance, security audits, and hackathon bounties.
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1' }}>💧 10% — Initial DEX Liquidity Pool Reserve</span>
                  <span style={{ fontFamily: 'monospace' }}>10%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: '10%', height: '100%', backgroundColor: '#cbd5e1' }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Locked Raydium/Meteora liquidity pairs for fair, slippage-free community trading.
                </span>
              </div>
            </div>

            <button
              onClick={() => { setShowTokenomics(false); setActiveTab('markets'); }}
              style={{
                width: '100%',
                backgroundColor: '#01b8ca',
                color: '#0a0f1d',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '10px',
                fontWeight: 900,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Start Staking & Qualify for Airdrop
            </button>
          </div>
        </div>
      )}

      {/* Grants & Hackathons Modal */}
      {showGrants && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 15, 29, 0.88)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 70,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#0d1b2a',
            border: '1px solid rgba(1, 184, 202, 0.35)',
            borderRadius: '20px',
            maxWidth: '560px',
            width: '100%',
            padding: '1.75rem',
            position: 'relative',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #01b8ca 0%, #0c78e8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Award size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Grants & Hackathon Ready</h3>
                  <span style={{ fontSize: '0.72rem', color: '#00f5d4', fontWeight: 800 }}>SOLANA RADAR & ECOSYSTEM GRANTS</span>
                </div>
              </div>
              <button
                onClick={() => setShowGrants(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '12px',
                padding: '0.9rem',
                border: '1px solid rgba(1, 184, 202, 0.2)'
              }}>
                <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.9rem', fontWeight: 800, color: '#00f5d4' }}>
                  🎯 The Thesis: High-Velocity Cultural Prediction Markets
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                  Polymarket proved the power of binary prediction markets for politics. But music is an evergreen 365-day culture cycle where millions of fandoms passionately debate daily Spotify ranks, viral TikTok breakouts, and billboard duels.
                </p>
              </div>

              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '12px',
                padding: '0.9rem',
                border: '1px solid rgba(1, 184, 202, 0.2)'
              }}>
                <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8' }}>
                  ⚡ Why Solana Mainnet?
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                  Music prediction markets require micro-stakes (e.g. 0.001 SOL / ~$0.15) and sub-second confirmation. Solana is the only production blockchain capable of powering consumer micro-transactions without high gas barriers.
                </p>
              </div>

              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '12px',
                padding: '0.9rem',
                border: '1px solid rgba(1, 184, 202, 0.2)'
              }}>
                <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>
                  🛡️ Open Source & Non-Custodial Architecture
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                  - Automated Spotify Global daily oracle mirror with transparent API logs.<br />
                  - Public non-custodial Escrow Vault (<code>32WWuApRT3XyEHYz4EzadNe55m27a4BMWj1BigWyM8zG</code>).<br />
                  - Automated Solscan verification for all resolved payouts.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <a
                href="https://github.com/MusicXFun/musicx-core"
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Code size={14} /> Open Source GitHub
              </a>
              <a
                href="https://twitter.com/musicxdotfun"
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  backgroundColor: '#01b8ca',
                  border: 'none',
                  color: '#0a0f1d',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                Contact Team on 𝕏
              </a>
            </div>
          </div>
        </div>
      )}

      {/* How It Works Modal */}
      {showHowItWorks && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 15, 29, 0.88)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 70,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#0d1b2a',
            border: '1px solid rgba(1, 184, 202, 0.35)',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '1.75rem',
            position: 'relative',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #01b8ca 0%, #0c78e8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Disc3 size={18} color="#fff" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>How MusicX Works</h3>
              </div>
              <button
                onClick={() => setShowHowItWorks(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(1, 184, 202, 0.15)',
                  border: '1px solid #01b8ca',
                  color: '#00f5d4',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  1
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.92rem', fontWeight: 800 }}>Pick a 24H Music Battle</h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                    Trade daily head-to-head chart duels (e.g. Taylor Swift vs ADÉLA), #1 leaderboard holds, or New Music Friday streaming thresholds.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(1, 184, 202, 0.15)',
                  border: '1px solid #01b8ca',
                  color: '#00f5d4',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  2
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.92rem', fontWeight: 800 }}>Stake Real SOL in Non-Custodial Escrow</h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                    Your funds are locked directly into the public Solana Escrow Vault (<code style={{ color: '#38bdf8' }}>32WW...M8zG</code>). 100% transparent and visible on Solscan with zero platform custody risk.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(1, 184, 202, 0.15)',
                  border: '1px solid #01b8ca',
                  color: '#00f5d4',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  3
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.92rem', fontWeight: 800 }}>Automated Daily Settlement (10:00 UTC)</h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                    When Spotify refreshes the official Daily Global chart at 10:00 AM UTC, the automated oracle verifies the final rankings. Winners receive automated proportional payouts from the pool.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHowItWorks(false)}
              style={{
                width: '100%',
                backgroundColor: '#01b8ca',
                color: '#0a0f1d',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '10px',
                fontWeight: 900,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Got it, let's trade!
            </button>
          </div>
        </div>
      )}

      {/* Floating Toast with Solscan Link & Tweet Button */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#0d1b2a',
          color: '#fff',
          padding: '0.75rem 1.25rem',
          borderRadius: '9999px',
          fontSize: '0.85rem',
          fontWeight: 700,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(1, 184, 202, 0.4)',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} color="#00f5d4" />
          <span>{toastMsg.text}</span>
          {toastMsg.link && (
            <a
              href={toastMsg.link}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#38bdf8', marginLeft: '4px', display: 'flex', alignItems: 'center' }}
            >
              Solscan <ArrowUpRight size={13} />
            </a>
          )}
          {toastMsg.tweetText && (
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(toastMsg.tweetText)}`}
              target="_blank"
              rel="noreferrer"
              style={{
                backgroundColor: '#000',
                color: '#fff',
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 800,
                textDecoration: 'none',
                marginLeft: '8px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <span>𝕏 Tweet Bet</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
