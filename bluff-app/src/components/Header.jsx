import React from 'react'
import { sh } from '../lib/config.js'

const styles = {
  header: {
    position: 'sticky', top: 0, zIndex: 100, height: 56,
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '0 clamp(1rem,4vw,2.5rem)',
    background: 'rgba(12,10,4,.92)', backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(245,158,11,.1)',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: 'var(--font)', fontWeight: 800, fontSize: 16,
    letterSpacing: '-.02em', color: 'var(--text)',
  },
  badge: {
    fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em',
    background: 'var(--amber-dim)', border: '1px solid var(--amber-border)',
    color: 'var(--amber)', padding: '2px 8px', borderRadius: 100,
  },
  right: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 },
  pill: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'var(--amber-dim)', border: '1px solid var(--amber-border)',
    padding: '5px 14px', borderRadius: 100,
    fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--amber)',
  },
  dot: { width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)' },
  hbtn: {
    fontFamily: 'var(--font)', fontWeight: 700, fontSize: 12,
    padding: '8px 16px', borderRadius: 'var(--r)', cursor: 'pointer',
    transition: 'all 150ms var(--ease)',
  },
}

export default function Header({ account, connected, onConnect, onDisconnect, onPost, onProfile }) {
  return (
    <header style={styles.header}>
      <div style={styles.logo}>
        <span style={{ fontSize: 20 }}>🎭</span>
        Bluff
        <span style={styles.badge}>AI Judge</span>
      </div>
      <div style={styles.right}>
        {connected && (
          <div style={{...styles.pill, cursor:'pointer'}} onClick={onProfile}>
            <div style={styles.dot} />
            {sh(account)}
          </div>
        )}
        {!connected
          ? <button style={{...styles.hbtn, background:'transparent', border:'1.5px solid rgba(245,158,11,.2)', color:'var(--text2)'}} onClick={onConnect}>Connect</button>
          : <button style={{...styles.hbtn, background:'transparent', border:'1.5px solid rgba(245,158,11,.2)', color:'var(--text2)'}} onClick={onDisconnect}>Disconnect</button>
        }
        {connected && (
          <button style={{...styles.hbtn, background:'var(--amber)', color:'#0C0A04', border:'none', fontWeight:800}} onClick={onPost}>
            + Post Claim
          </button>
        )}
      </div>
    </header>
  )
}
