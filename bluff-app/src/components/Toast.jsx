import React, { useEffect } from 'react'

export default function Toast({ message, type, onClear }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClear, type === 'ok' ? 4000 : 5000)
    return () => clearTimeout(t)
  }, [message])

  if (!message) return null

  const colors = {
    ok:  { border: 'rgba(245,158,11,.4)',  color: 'var(--amber)' },
    err: { border: 'rgba(239,68,68,.3)',   color: 'var(--false)' },
  }
  const c = colors[type] || colors.ok

  return (
    <div style={{
      position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
      background:'var(--card2)', border:`1px solid ${c.border}`, color:c.color,
      padding:'10px 22px', borderRadius:100, fontFamily:'var(--mono)', fontSize:11,
      zIndex:999, boxShadow:'0 8px 32px rgba(0,0,0,.4)',
      animation:'fin .3s var(--ease)',
    }}>
      {message}
    </div>
  )
}
