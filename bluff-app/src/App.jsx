import React, { useState, useEffect, useCallback } from 'react'
import Header from './components/Header.jsx'
import ClaimCard from './components/ClaimCard.jsx'
import { PostModal, BetModal } from './components/Modals.jsx'
import Profile from './components/Profile.jsx'
import Toast from './components/Toast.jsx'
import { readContract, writeContract, waitTx, CHAIN_ID, NET } from './lib/gl.js'
import { CONTRACT_ADDR } from './lib/config.js'

export default function App() {
  const [claims,    setClaims]    = useState([])
  const [account,   setAccount]   = useState('')
  const [connected, setConnected] = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [toast,     setToast]     = useState({ msg:'', type:'ok' })
  const [postOpen,     setPostOpen]     = useState(false)
  const [betClaim,     setBetClaim]     = useState(null)
  const [profileOpen,  setProfileOpen]  = useState(false)
  const [hasClaimed,   setHasClaimed]   = useState(true) // optimistic, checked on connect
  const [txLoading,    setTxLoading]    = useState(false)

  const notify = (msg, type='ok') => setToast({ msg, type })

  // Load claims
  const load = useCallback(async () => {
    try {
      const raw = await readContract(CONTRACT_ADDR, 'get_all_claims', [])
      if (raw && raw !== '[]') {
        const parsed = JSON.parse(raw)
        setClaims([...parsed].reverse())
      } else {
        setClaims([])
      }
    } catch (e) {
      notify(e.message, 'err')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-reconnect
  useEffect(() => {
    if (!window.ethereum) return
    window.ethereum.request({ method: 'eth_accounts' }).then(a => {
      if (a?.[0]) { setAccount(a[0]); setConnected(true); window._glAccount = a[0] }
    }).catch(() => {})
  }, [])

  // Connect wallet
  const connect = async () => {
    if (!window.ethereum) { notify('Install MetaMask', 'err'); return }
    try {
      const accs  = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const chain = await window.ethereum.request({ method: 'eth_chainId' })
      if (chain !== CHAIN_ID) {
        try {
          await window.ethereum.request({ method:'wallet_switchEthereumChain', params:[{ chainId:CHAIN_ID }] })
        } catch (e) {
          if (e.code === 4902 || e.code === -32603)
            await window.ethereum.request({ method:'wallet_addEthereumChain', params:[NET] })
        }
      }
      setAccount(accs[0]); setConnected(true); window._glAccount = accs[0]
      notify('Connected', 'ok')
      setProfileOpen(true) // open profile on connect so user sees claim prompt
      window.ethereum.on('accountsChanged', a => { if (!a.length) disconnect() })
      window.ethereum.on('chainChanged', () => window.location.reload())
    } catch (e) { notify(e.message || 'Connection failed', 'err') }
  }

  const disconnect = () => { setAccount(''); setConnected(false); window._glAccount = '' }

  // Post claim
  const handlePost = async (text, stake) => {
    setTxLoading(true)
    try {
      const hash = await writeContract(CONTRACT_ADDR, account, 'post_claim', [text, stake])
      notify('Transaction submitted...', 'ok')
      await waitTx(hash, () => notify('Still finalizing - Bradbury can take 1-3 min...', 'ok'))
      notify('Claim posted!', 'ok')
      setPostOpen(false)
      await load()
    } catch (e) { notify(e.message, 'err') }
    finally { setTxLoading(false) }
  }

  // Place bet
  const handleBet = async (verdict, amount) => {
    if (!betClaim) return
    setTxLoading(true)
    try {
      const hash = await writeContract(CONTRACT_ADDR, account, 'place_bet', [betClaim.id, verdict, amount])
      notify('Bet submitted...', 'ok')
      await waitTx(hash, () => notify('Still finalizing...', 'ok'))
      notify(`Bet placed: ${verdict} for ${amount} pts`, 'ok')
      setBetClaim(null)
      await load()
    } catch (e) { notify(e.message, 'err') }
    finally { setTxLoading(false) }
  }

  // Resolve
  const handleResolve = async (id) => {
    if (!connected) { notify('Connect wallet first', 'err'); return }
    setTxLoading(true)
    notify('Asking the AI to judge this claim... (1-3 min)', 'ok')
    try {
      const hash = await writeContract(CONTRACT_ADDR, account, 'resolve', [id])
      await waitTx(hash, () => notify('AI is thinking... Bradbury can take 1-3 min', 'ok'))
      notify('AI has ruled!', 'ok')
      await load()
    } catch (e) { notify(e.message, 'err') }
    finally { setTxLoading(false) }
  }

  const openBet = (claim, defaultVerdict) => {
    if (!connected) { notify('Connect wallet first', 'err'); return }
    setBetClaim({ ...claim, _default: defaultVerdict })
  }

  return (
    <div style={{ position:'relative', zIndex:1 }}>
      <Header
        account={account} connected={connected}
        onConnect={connect} onDisconnect={disconnect}
        onPost={() => {
            if (!connected) { notify('Connect wallet first', 'err'); return }
            if (!hasClaimed) { notify('Claim your 500 starter points first', 'err'); setProfileOpen(true); return }
            setPostOpen(true)
          }}
        onProfile={() => setProfileOpen(true)}
      />

      {/* HERO */}
      <div style={{ textAlign:'center', padding:'clamp(3rem,8vw,5rem) clamp(1rem,4vw,2rem) clamp(2rem,4vw,3rem)' }}>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:6,
          fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.15em', textTransform:'uppercase',
          color:'var(--amber)', border:'1px solid var(--amber-border)', background:'var(--amber-dim)',
          padding:'5px 16px', borderRadius:100, marginBottom:20,
        }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--amber)', animation:'blink 2s ease-in-out infinite', display:'inline-block' }} />
          GenLayer Bradbury · AI decides everything
        </div>

        <h1 style={{
          fontFamily:'var(--font)', fontWeight:800, letterSpacing:'-.05em',
          fontSize:'clamp(2.6rem,8vw,5rem)', lineHeight:.95, marginBottom:16,
        }}>
          Make a claim.<br />
          <span style={{ color:'var(--amber)', fontSize:'clamp(1rem,2.5vw,1.4rem)', fontWeight:700, letterSpacing:'.02em', display:'block', marginTop:8 }}>
            Bet on the AI's verdict.
          </span>
        </h1>

        <p style={{ fontSize:13, color:'var(--text2)', maxWidth:440, margin:'0 auto 28px', lineHeight:1.8 }}>
          Post any claim. Others bet TRUE or FALSE on how the AI will rule.
          The AI resolves everything - no human referee, no admin key.
        </p>

        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <button className="btn btn-solid" onClick={() => {
              if (!connected) { notify('Connect wallet first','err'); return }
              if (!hasClaimed) { notify('Claim your 500 starter points first','err'); setProfileOpen(true); return }
              setPostOpen(true)
            }}>
            + Post a Claim
          </button>
          <button className="btn btn-outline" onClick={() => document.getElementById('feed')?.scrollIntoView({ behavior:'smooth' })}>
            See Active Claims
          </button>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{
        display:'flex', justifyContent:'center',
        borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)',
        background:'var(--bg2)', overflowX:'auto',
      }}>
        {[
          ['01','Post a claim'],['02','Others bet TRUE/FALSE'],['03','AI rules'],['04','Winners collect'],
        ].map(([n, l], i, arr) => (
          <div key={n} style={{
            flex:1, minWidth:130, padding:'18px 20px', textAlign:'center',
            borderRight: i < arr.length-1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:'1.6rem', color:'var(--amber)', letterSpacing:'-.04em', lineHeight:1 }}>{n}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--muted)', marginTop:4 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* FEED */}
      <div id="feed" style={{ maxWidth:900, margin:'0 auto', padding:'clamp(1.5rem,4vw,2.5rem) clamp(1rem,4vw,2rem) clamp(2rem,4vw,4rem)' }}>
        <div style={{
          fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.18em', textTransform:'uppercase',
          color:'var(--muted)', marginBottom:16, display:'flex', alignItems:'center', gap:10,
        }}>
          Active Claims
          <div style={{ flex:1, height:1, background:'var(--border)' }} />
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--muted)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:14 }}><span className="spin-el" /></div>
            <div style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:'.9rem', color:'var(--text2)', marginTop:10 }}>Loading claims...</div>
          </div>
        ) : claims.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--muted)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:14 }}>🎭</div>
            <div style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:'.9rem', color:'var(--text2)', marginBottom:8 }}>No claims yet</div>
            <div style={{ fontSize:11 }}>Be the first to post a claim and start the game.</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {claims.map(c => (
              <ClaimCard key={c.id} claim={c} account={account}
                onBet={(claim, verdict) => openBet(claim, verdict)}
                onResolve={handleResolve}
              />
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexWrap:'wrap', gap:12, padding:'20px clamp(1rem,4vw,2.5rem)',
        borderTop:'1px solid var(--border)', fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)',
      }}>
        <div>🎭 Bluff · AI Judgment Game · GenLayer Bradbury · Chain ID 4221</div>
        <div style={{ display:'flex', gap:12 }}>
          <a href="https://studio.genlayer.com" target="_blank" rel="noreferrer" style={{ color:'var(--muted)', textDecoration:'none' }}>Studio</a>
          <a href="https://docs.genlayer.com"   target="_blank" rel="noreferrer" style={{ color:'var(--muted)', textDecoration:'none' }}>Docs</a>
        </div>
      </footer>

      {/* MODALS */}
      {postOpen    && <PostModal onClose={() => setPostOpen(false)} onSubmit={handlePost} loading={txLoading} />}
      {betClaim    && <BetModal claim={betClaim} onClose={() => setBetClaim(null)} onSubmit={handleBet} loading={txLoading} />}
      {profileOpen && <Profile account={account} onClose={() => setProfileOpen(false)} onNotify={notify}
        onPointsLoaded={(bal, claimed) => setHasClaimed(claimed)} />}

      <Toast message={toast.msg} type={toast.type} onClear={() => setToast({ msg:'', type:'ok' })} />
    </div>
  )
}
