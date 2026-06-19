import React, { useState } from 'react'

const overlay = {
  position:'fixed', inset:0, zIndex:300,
  background:'rgba(0,0,0,.7)', backdropFilter:'blur(8px)',
  display:'flex', alignItems:'center', justifyContent:'center', padding:20,
}
const box = {
  background:'var(--card2)', border:'1px solid var(--border2)',
  borderRadius:16, padding:28, width:'100%', maxWidth:480,
  maxHeight:'90vh', overflowY:'auto', position:'relative',
  boxShadow:'0 24px 80px rgba(0,0,0,.5)',
  animation:'pop .25s var(--ease) both',
}
const closeBtn = {
  float:'right', background:'var(--card)', border:'1px solid var(--border)',
  color:'var(--muted)', fontSize:18, width:28, height:28, cursor:'pointer',
  borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
}

export function PostModal({ onClose, onSubmit, loading }) {
  const [text, setText] = useState('')
  const [stake, setStake] = useState(20)

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={box}>
        <button style={closeBtn} onClick={onClose}>×</button>
        <div style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:'1.1rem', letterSpacing:'-.02em', marginBottom:6 }}>Post a Claim</div>
        <div style={{ fontSize:11, color:'var(--muted)', marginBottom:20, lineHeight:1.7 }}>
          Post anything — facts, predictions, hot takes. Others bet on how the AI will judge it.
        </div>

        <div className="ff">
          <label className="fl">Your Claim (max 280 chars)</label>
          <textarea className="fi" value={text} onChange={e => setText(e.target.value)}
            placeholder="BTC will never go below $50k again." maxLength={280} rows={3} />
          <div style={{ fontSize:9, color:'var(--muted)', textAlign:'right', marginTop:4 }}>{text.length}/280</div>
        </div>

        <div className="ff">
          <label className="fl">Stake — min 20 pts (you lose this if AI says FALSE)</label>
          <input className="fi" type="number" min={20} step={10} value={stake}
            onChange={e => setStake(parseInt(e.target.value)||20)} />
        </div>

        <button className="btn btn-solid" style={{ width:'100%' }}
          disabled={loading || !text.trim()} onClick={() => onSubmit(text, stake)}>
          {loading ? '⟳ Posting...' : 'Post Claim'}
        </button>
        <p style={{ fontSize:10, color:'var(--muted)', textAlign:'center', marginTop:10 }}>
          1 transaction · stake is locked until resolution
        </p>
      </div>
    </div>
  )
}

export function BetModal({ claim, onClose, onSubmit, loading }) {
  const [verdict, setVerdict] = useState('TRUE')
  const [amount, setAmount]   = useState(10)

  if (!claim) return null

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={box}>
        <button style={closeBtn} onClick={onClose}>×</button>
        <div style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:'1.1rem', marginBottom:12 }}>Place Your Bet</div>

        <div style={{
          background:'var(--bg2)', border:'1px solid var(--border)',
          borderRadius:8, padding:12, marginBottom:16,
          fontSize:12, color:'var(--text2)', fontStyle:'italic',
        }}>
          "{claim.text}"
        </div>

        <div className="ff">
          <label className="fl">How will the AI rule?</label>
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            {['TRUE','FALSE'].map(v => (
              <div key={v} onClick={() => setVerdict(v)} style={{
                flex:1, padding:16, borderRadius:'var(--r)', textAlign:'center', cursor:'pointer',
                border: `2px solid ${verdict === v
                  ? (v === 'TRUE' ? 'var(--true)' : 'var(--false)')
                  : (v === 'TRUE' ? 'var(--true-border)' : 'var(--false-border)')}`,
                background: verdict === v
                  ? (v === 'TRUE' ? 'var(--true-dim)' : 'var(--false-dim)') : 'transparent',
                transition:'all 150ms var(--ease)',
              }}>
                <div style={{
                  fontFamily:'var(--font)', fontWeight:800, fontSize:'1.1rem', marginBottom:4,
                  color: v === 'TRUE' ? 'var(--true)' : 'var(--false)',
                }}>
                  {v === 'TRUE' ? 'TRUE ✓' : 'FALSE ✗'}
                </div>
                <div style={{ fontSize:10, color:'var(--muted)' }}>
                  {v === 'TRUE' ? 'AI will agree' : 'AI will disagree'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ff">
          <label className="fl">Bet Amount — min 10 pts</label>
          <input className="fi" type="number" min={10} step={10} value={amount}
            onChange={e => setAmount(parseInt(e.target.value)||10)} />
        </div>

        <button className="btn btn-solid" style={{ width:'100%' }}
          disabled={loading} onClick={() => onSubmit(verdict, amount)}>
          {loading ? '⟳ Placing bet...' : 'Place Bet'}
        </button>
        <p style={{ fontSize:10, color:'var(--muted)', textAlign:'center', marginTop:10 }}>
          1 transaction · locked until resolution
        </p>
      </div>
    </div>
  )
}
