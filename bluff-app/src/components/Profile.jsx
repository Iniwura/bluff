import React, { useState, useEffect } from 'react'
import { readContract, writeContract, waitTx } from '../lib/gl.js'
import { CONTRACT_ADDR, sh } from '../lib/config.js'

export default function Profile({ account, onClose, onNotify, onPointsLoaded }) {
  const [balance,   setBalance]   = useState(0)
  const [claimed,   setClaimed]   = useState(false)
  const [stats,     setStats]     = useState({ wins: 0, losses: 0, total: 0 })
  const [username,  setUsername]  = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameMsg,   setUsernameMsg]   = useState('')
  const [loading,   setLoading]   = useState(true)
  const [claiming,  setClaiming]  = useState(false)
  const [savingUN,  setSavingUN]  = useState(false)

  useEffect(() => { if (account) loadProfile() }, [account])

  async function loadProfile() {
    setLoading(true)
    try {
      const [ptsRaw, statsRaw, un] = await Promise.all([
        readContract(CONTRACT_ADDR, 'get_points',   [account]),
        readContract(CONTRACT_ADDR, 'get_my_stats', [account]),
        readContract(CONTRACT_ADDR, 'get_username', [account]),
      ])
      if (ptsRaw)   { const p = JSON.parse(ptsRaw); setBalance(p.balance); setClaimed(p.claimed); if(onPointsLoaded) onPointsLoaded(p.balance, p.claimed) }
      if (statsRaw) { const s = JSON.parse(statsRaw); setStats(s) }
      if (un)       { setUsername(un); setUsernameInput(un) }
    } catch(e) { onNotify(e.message, 'err') }
    finally { setLoading(false) }
  }

  async function claimPoints() {
    setClaiming(true)
    try {
      const hash = await writeContract(CONTRACT_ADDR, account, 'claim_points', [])
      onNotify('Claiming starter points...', 'ok')
      await waitTx(hash, () => onNotify('Still finalizing...', 'ok'))
      onNotify('500 points claimed!', 'ok')
      await loadProfile()
    } catch(e) { onNotify(e.message, 'err') }
    finally { setClaiming(false) }
  }

  async function saveUsername() {
    if (!usernameInput.trim()) return
    setSavingUN(true); setUsernameMsg('')
    try {
      const avail = await readContract(CONTRACT_ADDR, 'check_username', [usernameInput])
      if (avail === 'TAKEN' && usernameInput.toLowerCase() !== username.toLowerCase()) {
        setUsernameMsg('Username already taken'); setSavingUN(false); return
      }
      const hash = await writeContract(CONTRACT_ADDR, account, 'set_username', [usernameInput])
      onNotify('Saving username...', 'ok')
      await waitTx(hash, () => onNotify('Still finalizing...', 'ok'))
      setUsername(usernameInput)
      onNotify('Username saved!', 'ok')
    } catch(e) { onNotify(e.message, 'err') }
    finally { setSavingUN(false) }
  }

  const winRate = stats.total > 0 ? Math.round(stats.wins / stats.total * 100) : 0

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'var(--card2)', border:'1px solid var(--border2)', borderRadius:16, padding:28, width:'100%', maxWidth:420, position:'relative', animation:'pop .25s var(--ease) both', maxHeight:'90vh', overflowY:'auto' }}>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'var(--card)', border:'1px solid var(--border)', color:'var(--muted)', fontSize:18, width:28, height:28, cursor:'pointer', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>

        <div style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:'1.1rem', letterSpacing:'-.02em', marginBottom:20 }}>Your Profile</div>

        {/* Address */}
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', marginBottom:16, wordBreak:'break-all' }}>{account}</div>

        {/* Balance */}
        <div style={{ background:'var(--amber-dim)', border:'1px solid var(--amber-border)', borderRadius:12, padding:'20px 24px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:'2.2rem', color:'var(--amber)', letterSpacing:'-.04em', lineHeight:1 }}>
              {loading ? '...' : balance.toLocaleString()}
            </div>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--muted)', marginTop:4 }}>Points Balance</div>
          </div>
          {!claimed && !loading && (
            <button className="btn btn-solid" style={{ fontSize:11, padding:'8px 16px' }} disabled={claiming} onClick={claimPoints}>
              {claiming ? '⟳' : '+ Claim 500'}
            </button>
          )}
          {claimed && (
            <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.1em', color:'var(--muted)', border:'1px solid var(--border)', padding:'4px 10px', borderRadius:100 }}>Claimed ✓</span>
          )}
        </div>

        {/* Claim prompt */}
        {!claimed && !loading && (
          <div style={{ background:'rgba(245,158,11,.06)', border:'1px solid var(--amber-border)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontFamily:'var(--mono)', fontSize:11, color:'var(--amber)' }}>
            Claim your 500 starter points to post claims and place bets.
          </div>
        )}

        {/* Username */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--muted)', display:'block', marginBottom:6 }}>
            Username {username && <span style={{ color:'var(--amber)' }}>@{username}</span>}
          </label>
          <div style={{ display:'flex', gap:8 }}>
            <input className="fi" value={usernameInput} onChange={e => { setUsernameInput(e.target.value); setUsernameMsg('') }}
              placeholder="pick a handle" maxLength={20}
              style={{ flex:1 }}
              onKeyDown={e => e.key === 'Enter' && saveUsername()}
            />
            <button className="btn btn-solid" style={{ fontSize:11, padding:'8px 16px', flexShrink:0 }}
              disabled={savingUN || !usernameInput.trim()} onClick={saveUsername}>
              {savingUN ? '⟳' : 'Save'}
            </button>
          </div>
          {usernameMsg && <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--false)', marginTop:4 }}>{usernameMsg}</div>}
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
          {[
            { val: stats.wins,   lbl:'Won',      col:'var(--true)' },
            { val: stats.losses, lbl:'Lost',      col:'var(--false)' },
            { val: winRate+'%',  lbl:'Win Rate',  col:'var(--amber)' },
          ].map(({ val, lbl, col }) => (
            <div key={lbl} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 12px', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:'1.4rem', letterSpacing:'-.03em', lineHeight:1, color:col, marginBottom:4 }}>{val}</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--muted)' }}>{lbl}</div>
            </div>
          ))}
        </div>

        <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', textAlign:'center' }}>
          {stats.total} total bet{stats.total !== 1 ? 's' : ''} placed
        </div>
      </div>
    </div>
  )
}
