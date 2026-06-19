import React from 'react'
import { sh } from '../lib/config.js'

export default function ClaimCard({ claim, account, onBet, onResolve }) {
  const { id, text, poster, stake, status, ai_verdict, ai_reason,
          true_pool = 0, false_pool = 0, bet_count = 0 } = claim

  const total   = true_pool + false_pool
  const tPct    = total > 0 ? ((true_pool / total) * 100).toFixed(0) : 50
  const fPct    = total > 0 ? ((false_pool / total) * 100).toFixed(0) : 50
  const isOpen  = status === 'OPEN'
  const isOwn   = poster?.toLowerCase() === account?.toLowerCase()
  const verdict = ai_verdict || ''

  const statusColor = isOpen ? 'var(--amber)' : verdict === 'TRUE' ? 'var(--true)' : 'var(--false)'
  const statusBg    = isOpen ? 'var(--amber-dim)' : verdict === 'TRUE' ? 'var(--true-dim)' : 'var(--false-dim)'
  const statusBdr   = isOpen ? 'var(--amber-border)' : verdict === 'TRUE' ? 'var(--true-border)' : 'var(--false-border)'

  return (
    <div style={{
      background:'var(--card)', border:'1px solid var(--border)',
      borderRadius:'var(--r)', padding:20,
      transition:'all 200ms var(--ease)', animation:'fin .35s var(--ease) both',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor='rgba(245,158,11,.25)'}
    onMouseLeave={e => e.currentTarget.style.borderColor='rgba(245,158,11,.1)'}
    >
      {/* Top row */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:14 }}>
        <span style={{
          fontFamily:'var(--mono)', fontSize:8, letterSpacing:'.12em', textTransform:'uppercase',
          padding:'3px 10px', borderRadius:100, flexShrink:0,
          color:statusColor, background:statusBg, border:`1px solid ${statusBdr}`,
        }}>
          {isOpen ? 'OPEN' : verdict || 'RESOLVED'}
        </span>
        <div style={{ fontFamily:'var(--font)', fontWeight:700, fontSize:'1rem', letterSpacing:'-.02em', lineHeight:1.3 }}>
          "{text}"
        </div>
      </div>

      {/* AI Reasoning */}
      {!isOpen && ai_reason && (
        <div style={{
          background:'var(--bg2)', border:'1px solid var(--border)',
          borderRadius:6, padding:'10px 14px', marginBottom:12,
          fontSize:11, color:'var(--text2)', lineHeight:1.65, fontStyle:'italic',
        }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--muted)', marginBottom:4 }}>
            AI Reasoning
          </div>
          {ai_reason}
        </div>
      )}

      {/* Bet bar */}
      <div style={{ marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--mono)', fontSize:10, marginBottom:5 }}>
          <span style={{ color:'var(--true)' }}>TRUE {tPct}% · {true_pool} pts</span>
          <span style={{ color:'var(--false)' }}>{false_pool} pts · {fPct}% FALSE</span>
        </div>
        <div style={{ height:6, background:'var(--border)', borderRadius:100, overflow:'hidden', display:'flex' }}>
          <div style={{ width:`${tPct}%`, height:'100%', background:'var(--true)', transition:'width .6s var(--ease)', borderRadius:'100px 0 0 100px' }} />
          <div style={{ width:`${fPct}%`, height:'100%', background:'var(--false)', transition:'width .6s var(--ease)', borderRadius:'0 100px 100px 0' }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
        <div style={{ fontSize:10, color:'var(--muted)' }}>
          {bet_count} bet{bet_count !== 1 ? 's' : ''} · Posted by {sh(poster)} · Stake: {stake} pts
        </div>
        {isOpen && (
          <div style={{ display:'flex', gap:6 }}>
            {!isOwn && (
              <>
                <button onClick={() => onBet(claim, 'TRUE')} style={btnStyle('var(--true)', 'var(--true-dim)', 'var(--true-border)')}>
                  Bet TRUE
                </button>
                <button onClick={() => onBet(claim, 'FALSE')} style={btnStyle('var(--false)', 'var(--false-dim)', 'var(--false-border)')}>
                  Bet FALSE
                </button>
              </>
            )}
            <button onClick={() => onResolve(id)} style={{
              fontFamily:'var(--font)', fontWeight:700, fontSize:10,
              padding:'7px 14px', borderRadius:'var(--r)', cursor:'pointer',
              background:'var(--amber-dim)', border:'1px solid var(--amber-border)', color:'var(--amber)',
              transition:'all 150ms var(--ease)',
            }}>
              Resolve (1 tx)
            </button>
          </div>
        )}
        {!isOpen && (
          <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)' }}>
            AI ruled {verdict}
          </span>
        )}
      </div>
    </div>
  )
}

function btnStyle(color, bg, border) {
  return {
    fontFamily: 'var(--font)', fontWeight: 700, fontSize: 10, letterSpacing: '.06em',
    padding: '7px 14px', borderRadius: 'var(--r)', cursor: 'pointer',
    color, background: bg, border: `1.5px solid ${border}`,
    transition: 'all 150ms var(--ease)',
  }
}
