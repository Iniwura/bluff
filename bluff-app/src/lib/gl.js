// ── GenLayer encoding (verified against genlayer-js) ─────────
const _T = { SPECIAL:0, PINT:1, NINT:2, BYTES:3, STR:4, ARR:5, MAP:6 }
const _S = { NULL:0, FALSE:8, TRUE:16, ADDR:24 }

function _writeNum(to, data) {
  if (data === 0n) { to.push(0); return }
  while (data > 0n) {
    let cur = Number(data & 0x7fn)
    data >>= 7n
    if (data > 0n) cur |= 128
    to.push(cur)
  }
}

function _encodeWithType(to, val, typ) {
  _writeNum(to, (BigInt(val) << 3n) | BigInt(typ))
}

function _encodeImpl(to, data) {
  if (data === null || data === undefined) { to.push(_S.NULL); return }
  if (data === true)  { to.push(_S.TRUE);  return }
  if (data === false) { to.push(_S.FALSE); return }
  if (typeof data === 'number' || typeof data === 'bigint') {
    const n = BigInt(data)
    if (n >= 0n) _encodeWithType(to, n, _T.PINT)
    else         _encodeWithType(to, -n - 1n, _T.NINT)
    return
  }
  if (typeof data === 'string') {
    const b = new TextEncoder().encode(data)
    _encodeWithType(to, b.length, _T.STR)
    for (const c of b) to.push(c)
    return
  }
  if (Array.isArray(data)) {
    _encodeWithType(to, data.length, _T.ARR)
    for (const item of data) _encodeImpl(to, item)
    return
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data).sort(([a],[b]) => a < b ? -1 : 1)
    _encodeWithType(to, entries.length, _T.MAP)
    for (const [k, v] of entries) {
      const kb = new TextEncoder().encode(k)
      _writeNum(to, BigInt(kb.length))
      for (const b of kb) to.push(b)
      _encodeImpl(to, v)
    }
    return
  }
}

function _glEncode(data) {
  const arr = []
  _encodeImpl(arr, data)
  return new Uint8Array(arr)
}

function _rlpBytes(data) {
  if (data.length === 1 && data[0] < 0x80) return data
  if (data.length <= 55) return new Uint8Array([0x80 + data.length, ...data])
  const lb = []; let l = data.length
  while (l > 0) { lb.unshift(l & 0xff); l >>= 8 }
  return new Uint8Array([0xb7 + lb.length, ...lb, ...data])
}

function _rlpList(items) {
  const encoded = []
  for (const item of items) for (const b of _rlpBytes(item)) encoded.push(b)
  if (encoded.length <= 55) return new Uint8Array([0xc0 + encoded.length, ...encoded])
  const lb = []; let l = encoded.length
  while (l > 0) { lb.unshift(l & 0xff); l >>= 8 }
  return new Uint8Array([0xf7 + lb.length, ...lb, ...encoded])
}

function encodeCalldata(method, args = [], leaderOnly = false) {
  const obj = {}
  if (method) obj.method = method
  if (args?.length) obj.args = args
  const encoded    = _glEncode(obj)
  const leaderByte = new Uint8Array([leaderOnly ? 1 : 0])
  const rlp        = _rlpList([encoded, leaderByte])
  return '0x' + Array.from(rlp).map(b => b.toString(16).padStart(2,'0')).join('')
}

// ── RPC ───────────────────────────────────────────────────────
const RPC = 'https://rpc-bradbury.genlayer.com'

async function rpcPost(method, params = []) {
  const r = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const d = await r.json()
  if (d.error) throw new Error(d.error.message || JSON.stringify(d.error))
  return d.result
}

// Simple in-memory cache (60s TTL)
const _readCache = new Map()
const _CACHE_TTL = 60_000

export async function readContract(addr, method, args = [], useCache = false) {
  const cacheKey = `${addr}:${method}:${JSON.stringify(args)}`
  if (useCache) {
    const cached = _readCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < _CACHE_TTL) return cached.val
  }
  const from = window._glAccount || '0x0000000000000000000000000000000000000000'
  const data = encodeCalldataMsgpack(method, args, false)
  let lastErr
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(1000 * 2 ** attempt, 8000) + Math.random() * 500
      await new Promise(r => setTimeout(r, delay))
    }
    try {
      const result = await rpcPost('gen_call', [{
        to: addr, from, Data: data, Type: 'read', gas: '0x7A120', value: '0x0',
      }])
      if (!result) return ''
      const raw = typeof result === 'string' ? result
        : result.data || result.output || result.result || result.return_value || ''
      if (!raw) return ''
      const hex = raw.startsWith('0x') ? raw.slice(2) : raw
      let decoded = ''
      try {
        const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)))
        let pos = 0, varint = 0, shift = 0
        while (pos < bytes.length) {
          const b = bytes[pos++]
          varint |= (b & 0x7f) << shift
          shift += 7
          if (!(b & 0x80)) break
        }
        const typ = varint & 7
        const len = varint >> 3
        decoded = (typ === 4 && pos + len <= bytes.length)
          ? new TextDecoder().decode(bytes.slice(pos, pos + len))
          : new TextDecoder().decode(bytes)
      } catch { decoded = String(raw) }
      if (useCache) _readCache.set(cacheKey, { val: decoded, ts: Date.now() })
      return decoded
    } catch(e) {
      lastErr = e
      const msg = (e.message || '').toLowerCase()
      if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many')) {
        console.warn(`gen_call rate limited, retrying (attempt ${attempt + 1})...`)
        continue
      }
      throw e
    }
  }
  throw lastErr
}
export async function writeContract(contractAddr, account, method, args = []) {
  const cd   = encodeCalldata(method, args, false)
  const CONS = '0x4F33a39DC5Ac7c5B9F2E7aB137F7c50b8f9B9339'
  const pad  = v => v.toString(16).padStart(64, '0')
  const padA = a => a.toLowerCase().replace('0x','').padStart(64,'0')
  const ch   = cd.startsWith('0x') ? cd.slice(2) : cd
  const txData = '0xe71d5196' + padA(account) + padA(contractAddr) +
    pad(1) + pad(3) + pad(192) +
    pad(Math.floor(Date.now() / 1000) + 3600) +
    pad(ch.length / 2) +
    ch.padEnd(Math.ceil(ch.length / 64) * 64, '0')
  return window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{ from: account, to: CONS, data: txData, gas: '0x493E0' }],
  })
}

export async function waitTx(hash, onSlow, tries = 30) {
  for (let i = 0; i < tries; i++) {
    await new Promise(r => setTimeout(r, 3000))
    if (i === 9 && onSlow) onSlow()
    try {
      const r = await rpcPost('eth_getTransactionReceipt', [hash])
      if (r) {
        if (r.status === '0x1' || r.status === 1) return
        throw new Error('Transaction rejected by contract')
      }
    } catch (e) {
      if (e.message.startsWith('Trans')) throw e
    }
  }
  throw new Error('Timeout - check explorer-bradbury.genlayer.com')
}

export const CHAIN_ID = '0x107D'
export const NET = {
  chainId: CHAIN_ID,
  chainName: 'GenLayer Bradbury',
  rpcUrls: [RPC],
  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
  blockExplorerUrls: ['https://explorer-bradbury.genlayer.com'],
}
