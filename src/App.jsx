import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { fetchSlots } from './slots'

const fmt = (n, d = 2) => (n ?? 0).toFixed(d)
const fmtK = n => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n

function VolBadge({ v }) {
  const cls = v === 'Very High' || v === 'Very high' ? 'badge-vhigh' : v === 'High' ? 'badge-high' : v === 'Medium' ? 'badge-medium' : 'badge-low'
  return <span className={`badge ${cls}`}>{v}</span>
}

// ── Toast notification ────────────────────────────────────────────────────────
function Toast({ message, type = 'success' }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: type === 'success' ? 'rgba(0,230,122,0.12)' : 'rgba(255,190,0,0.12)',
      border: `1px solid ${type === 'success' ? 'rgba(0,230,122,0.3)' : 'rgba(255,190,0,0.3)'}`,
      borderRadius: 10, padding: '12px 18px', fontSize: 13,
      color: type === 'success' ? 'var(--green)' : 'var(--gold)',
      animation: 'fadeIn 0.2s ease', backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
    }}>
      {type === 'success' ? '✓ ' : '⚡ '}{message}
    </div>
  )
}

function useToast() {
  const [toast, setToast] = useState(null)
  const show = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2200)
  }
  return [toast, show]
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handle = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (tab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onAuth(data.user)
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Account created! Check your email to confirm.')
      }
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">Slot<span>Lab</span></div>
        <div className="auth-sub">Your bonus hunting platform</div>
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Login</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Sign Up</button>
        </div>
        {error && <div className="auth-error">⚠ {error}</div>}
        {success && <div className="auth-success">✓ {success}</div>}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
        </div>
        <button className="primary-btn" onClick={handle} disabled={loading || !email || !password}>
          {loading ? '...' : tab === 'login' ? 'LOGIN' : 'SIGN UP'}
        </button>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardTab({ user }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [user])

  const loadData = async () => {
    setLoading(true)
    const [huntsRes, sessionsRes] = await Promise.all([
      supabase.from('bonus_hunts').select('*, hunt_entries(*)').eq('user_id', user.id),
      supabase.from('opening_sessions').select('*, openings(*)').eq('user_id', user.id),
    ])
    const hunts = huntsRes.data || []
    const sessions = sessionsRes.data || []

    // Compute stats
    let totalHunts = hunts.length
    let totalHuntProfit = 0
    let bestHuntProfit = null
    let worstHuntProfit = null
    let totalOpenings = 0
    let bestOpening = null
    let totalOpeningProfit = 0

    hunts.forEach(h => {
      const entries = h.hunt_entries || []
      const opened = entries.filter(e => e.opened && e.payout != null)
      const won = opened.reduce((s, e) => s + (parseFloat(e.payout) || 0), 0)
      const profit = won - (parseFloat(h.start_balance) || 0)
      totalHuntProfit += profit
      if (bestHuntProfit === null || profit > bestHuntProfit.profit) bestHuntProfit = { name: h.name, profit }
      if (worstHuntProfit === null || profit < worstHuntProfit.profit) worstHuntProfit = { name: h.name, profit }
    })

    sessions.forEach(s => {
      const ops = s.openings || []
      totalOpenings += ops.length
      const won = ops.reduce((sum, o) => sum + (parseFloat(o.payout) || 0), 0)
      const profit = won - (parseFloat(s.start_balance) || 0)
      totalOpeningProfit += profit
      ops.forEach(o => {
        if (!bestOpening || parseFloat(o.payout) > parseFloat(bestOpening.payout)) {
          bestOpening = { ...o, sessionDate: s.date }
        }
      })
    })

    setData({ totalHunts, totalHuntProfit, bestHuntProfit, worstHuntProfit, totalOpenings, bestOpening, totalOpeningProfit, totalSessions: sessions.length })
    setLoading(false)
  }

  if (loading) return <div className="page"><p className="loading-pulse">Loading dashboard...</p></div>

  const d = data
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="section-title">🏠 Dashboard</div>
          <div className="section-sub">Your historical overview</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', marginBottom: 28 }}>
        {[
          ['Total Hunts', d.totalHunts, ''],
          ['Hunt P&L', `${d.totalHuntProfit >= 0 ? '+' : ''}€${fmt(d.totalHuntProfit, 0)}`, d.totalHuntProfit >= 0 ? 'green' : 'red'],
          ['Sessions', d.totalSessions, ''],
          ['Total Openings', d.totalOpenings, ''],
          ['Openings P&L', `${d.totalOpeningProfit >= 0 ? '+' : ''}€${fmt(d.totalOpeningProfit, 0)}`, d.totalOpeningProfit >= 0 ? 'green' : 'red'],
          ['Overall P&L', `${(d.totalHuntProfit + d.totalOpeningProfit) >= 0 ? '+' : ''}€${fmt(d.totalHuntProfit + d.totalOpeningProfit, 0)}`, (d.totalHuntProfit + d.totalOpeningProfit) >= 0 ? 'green' : 'red'],
        ].map(([l, v, c]) => (
          <div key={l} className="stat-box">
            <div className="stat-label">{l}</div>
            <div className={`stat-value ${c}`}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 16 }}>🎯 Hunt Records</div>
          {d.bestHuntProfit ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>BEST HUNT</div>
                <div style={{ fontWeight: 600 }}>{d.bestHuntProfit.name}</div>
                <div style={{ color: 'var(--green)', fontFamily: "'Bebas Neue'", fontSize: 22 }}>+€{fmt(d.bestHuntProfit.profit, 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>WORST HUNT</div>
                <div style={{ fontWeight: 600 }}>{d.worstHuntProfit.name}</div>
                <div style={{ color: 'var(--red)', fontFamily: "'Bebas Neue'", fontSize: 22 }}>€{fmt(d.worstHuntProfit.profit, 0)}</div>
              </div>
            </>
          ) : <div style={{ color: 'var(--muted)', fontSize: 13 }}>No hunts yet</div>}
        </div>

        <div className="card">
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 16 }}>⭐ Best Opening Ever</div>
          {d.bestOpening ? (
            <>
              <div style={{ fontSize: 22, marginBottom: 8 }}>🎰</div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.bestOpening.slot_name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>{d.bestOpening.sessionDate}</div>
              <div style={{ color: 'var(--gold)', fontFamily: "'Bebas Neue'", fontSize: 28 }}>€{fmt(parseFloat(d.bestOpening.payout))}</div>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{d.bestOpening.multiplier}x multiplier</div>
            </>
          ) : <div style={{ color: 'var(--muted)', fontSize: 13 }}>No openings yet</div>}
        </div>
      </div>
    </div>
  )
}

// ── Randomizer ────────────────────────────────────────────────────────────────
function RandomizerTab({ slots, slotsLoading }) {
  const [selectedProviders, setSelectedProviders] = useState([])
  const [volatility, setVolatility] = useState('')
  const [theme, setTheme] = useState('')
  const [minMaxWin, setMinMaxWin] = useState('')
  const [maxMaxWin, setMaxMaxWin] = useState('')
  const [spinning, setSpinning] = useState(false)
  const [spinPhase, setSpinPhase] = useState('idle')
  const [providerOpen, setProviderOpen] = useState(false)
  const [currentSlot, setCurrentSlot] = useState(null)
  const providerRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (providerRef.current && !providerRef.current.contains(e.target)) setProviderOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const providers = [...new Set(slots.map(s => s.provider))].sort()
  const themes = [...new Set(slots.map(s => s.theme).filter(Boolean))].sort()

  const pool = slots.filter(s => {
    if (selectedProviders.length > 0 && !selectedProviders.includes(s.provider)) return false
    if (volatility && s.volatility?.toLowerCase() !== volatility.toLowerCase()) return false
    if (theme && s.theme !== theme) return false
    if (minMaxWin && s.max_win < parseInt(minMaxWin)) return false
    if (maxMaxWin && s.max_win > parseInt(maxMaxWin)) return false
    return true
  })

  const spin = () => {
    if (!pool.length) return
    setSpinning(true)
    setSpinPhase('spinning')
    setCurrentSlot(null)
    const getDelay = (i) => i < 10 ? 55 : i < 18 ? 95 : i < 23 ? 160 : 260
    const tick = (i) => {
      setCurrentSlot(pool[Math.floor(Math.random() * pool.length)])
      if (i >= 26) {
        const final = pool[Math.floor(Math.random() * pool.length)]
        setCurrentSlot(final)
        setSpinPhase('result')
        setSpinning(false)
      } else {
        setTimeout(() => tick(i + 1), getDelay(i))
      }
    }
    tick(0)
  }

  const toggleProvider = (p) => setSelectedProviders(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="section-title">🎰 Slot Randomizer</div>
          <div className="section-sub">{slotsLoading ? 'Loading slots...' : `${slots.length} slots available — filter and spin`}</div>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="filters-row">
          <div className="filter-group" style={{ position: 'relative' }} ref={providerRef}>
            <label>Provider</label>
            <button className="filter-select" style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setProviderOpen(o => !o)}>
              <span>{selectedProviders.length === 0 ? `All (${providers.length})` : `${selectedProviders.length} selected`}</span>
              <span style={{ transition: 'transform 0.2s', transform: providerOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▾</span>
            </button>
            {providerOpen && (
              <div className="provider-dropdown">
                <div style={{ display: 'flex', gap: 8, padding: '4px 4px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 6 }}>
                  <button className="add-btn" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setSelectedProviders([...providers])}>Select All</button>
                  <button className="ghost-btn" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setSelectedProviders([])}>Clear All</button>
                </div>
                {providers.map(p => (
                  <div key={p} className={`provider-item ${selectedProviders.includes(p) ? 'selected' : ''}`} onClick={() => toggleProvider(p)}>
                    <div className={`provider-checkbox ${selectedProviders.includes(p) ? 'checked' : ''}`}>
                      {selectedProviders.includes(p) && <span style={{ color: '#000', fontSize: 9, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13 }}>{p}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="filter-group">
            <label>Volatility</label>
            <select className="filter-select" value={volatility} onChange={e => setVolatility(e.target.value)}>
              <option value="">All</option>
              <option>Low</option><option>Medium</option><option>High</option><option>Very high</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Theme</label>
            <select className="filter-select" value={theme} onChange={e => setTheme(e.target.value)}>
              <option value="">All</option>
              {themes.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Min Max Win</label>
            <input className="filter-input" type="number" placeholder="e.g. 5000" style={{ minWidth: 110 }} value={minMaxWin} onChange={e => setMinMaxWin(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Max Max Win</label>
            <input className="filter-input" type="number" placeholder="e.g. 100000" style={{ minWidth: 110 }} value={maxMaxWin} onChange={e => setMaxMaxWin(e.target.value)} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>{pool.length} slot{pool.length !== 1 ? 's' : ''} in pool</div>
        <button className="spin-btn" onClick={spin} disabled={spinning || !pool.length || slotsLoading}>
          {spinning ? 'SPINNING...' : '🎲 SPIN RANDOM SLOT'}
        </button>
      </div>

      {(spinPhase === 'spinning' || spinPhase === 'result') && currentSlot && (
        <div className={`result-card ${spinPhase === 'result' ? 'result-final' : ''}`} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            {spinPhase === 'spinning' ? '🎰 Spinning...' : '🎯 Result'}
          </div>
          <div className="result-name slot-flip" style={{ fontSize: spinPhase === 'spinning' ? 20 : 32 }}>
            {currentSlot.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, marginBottom: 4 }}>{currentSlot.provider}</div>
          {spinPhase === 'result' && (
            <div className="result-pills">
              <VolBadge v={currentSlot.volatility} />
              <span className="pill"><strong>Max Win</strong>{fmtK(currentSlot.max_win)}x</span>
              <span className="pill"><strong>RTP</strong>{currentSlot.rtp}%</span>
              {currentSlot.theme && <span className="pill"><strong>Theme</strong>{currentSlot.theme}</span>}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 14 }}>Pool ({pool.length})</div>
        {slotsLoading ? (
          <div className="empty-state"><span className="loading-pulse">Loading slots...</span></div>
        ) : (
          <div className="slots-grid">
            {pool.map((s, i) => (
              <div key={i} className="slot-card">
                <span style={{ fontSize: 18 }}>🎰</span>
                <div style={{ minWidth: 0 }}>
                  <div className="slot-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                  <div className="slot-meta">{s.provider} · {fmtK(s.max_win)}x</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Bonus Hunt ────────────────────────────────────────────────────────────────
function BonusHuntTab({ user, slots }) {
  const [hunts, setHunts] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showNewHunt, setShowNewHunt] = useState(false)
  const [newSlot, setNewSlot] = useState({ slotIdx: 0, betSize: '1' })
  const [newHuntForm, setNewHuntForm] = useState({ name: '', startBalance: '500' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [editingName, setEditingName] = useState(null) // huntId
  const [editingNameVal, setEditingNameVal] = useState('')
  const [editingBet, setEditingBet] = useState(null) // entryId
  const [toast, showToast] = useToast()

  useEffect(() => { loadHunts() }, [user])

  const loadHunts = async () => {
    setLoading(true)
    const { data } = await supabase.from('bonus_hunts').select('*, hunt_entries(*)').eq('user_id', user.id).order('created_at', { ascending: false })
    setHunts(data || [])
    setLoading(false)
  }

  const deleteHunt = async (huntId) => {
    if (!confirm('Delete this hunt?')) return
    await supabase.from('hunt_entries').delete().eq('hunt_id', huntId)
    await supabase.from('bonus_hunts').delete().eq('id', huntId)
    await loadHunts()
    setActiveIdx(0)
  }

  const createHunt = async () => {
    setSaving(true)
    await supabase.from('bonus_hunts').insert({ user_id: user.id, name: newHuntForm.name || `Hunt #${hunts.length + 1}`, start_balance: parseFloat(newHuntForm.startBalance) })
    await loadHunts(); setActiveIdx(0); setSaving(false); setShowNewHunt(false)
    showToast('Hunt created!')
  }

  const renameHunt = async (huntId) => {
    if (!editingNameVal.trim()) return
    await supabase.from('bonus_hunts').update({ name: editingNameVal }).eq('id', huntId)
    setHunts(hs => hs.map(h => h.id === huntId ? { ...h, name: editingNameVal } : h))
    setEditingName(null)
    showToast('Name updated!')
  }

  const filteredSlots = slots.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.provider.toLowerCase().includes(search.toLowerCase()))

  const addEntry = async () => {
    const slot = filteredSlots[parseInt(newSlot.slotIdx)]
    if (!slot) return
    const hunt = hunts[activeIdx]
    setSaving(true)
    await supabase.from('hunt_entries').insert({ hunt_id: hunt.id, slot_name: slot.name, slot_emoji: '🎰', slot_provider: slot.provider, slot_volatility: slot.volatility, bet_size: parseFloat(newSlot.betSize), opened: false })
    await loadHunts(); setSaving(false); setShowAdd(false); setSearch('')
    showToast('Slot added!')
  }

  const updatePayout = async (entryId, payoutVal) => {
    const payout = payoutVal ? parseFloat(payoutVal) : null
    await supabase.from('hunt_entries').update({ payout, opened: payout != null }).eq('id', entryId)
    setHunts(hs => hs.map(h => ({ ...h, hunt_entries: h.hunt_entries.map(e => e.id === entryId ? { ...e, payout: payoutVal, opened: payout != null } : e) })))
    if (payout) showToast(`Payout saved — ${(payout / (hunts[activeIdx]?.hunt_entries?.find(e => e.id === entryId)?.bet_size || 1)).toFixed(1)}x`, 'gold')
  }

  const updateBet = async (entryId, betVal) => {
    const bet_size = parseFloat(betVal) || 1
    await supabase.from('hunt_entries').update({ bet_size }).eq('id', entryId)
    setHunts(hs => hs.map(h => ({ ...h, hunt_entries: h.hunt_entries.map(e => e.id === entryId ? { ...e, bet_size } : e) })))
    setEditingBet(null)
    showToast('Bet updated!')
  }

  const toggleOpened = async (entryId, current) => {
    await supabase.from('hunt_entries').update({ opened: !current }).eq('id', entryId)
    setHunts(hs => hs.map(h => ({ ...h, hunt_entries: h.hunt_entries.map(e => e.id === entryId ? { ...e, opened: !current } : e) })))
  }

  const removeEntry = async (entryId) => {
    await supabase.from('hunt_entries').delete().eq('id', entryId)
    setHunts(hs => hs.map(h => ({ ...h, hunt_entries: h.hunt_entries.filter(e => e.id !== entryId) })))
  }

  const hunt = hunts[activeIdx]
  const entries = hunt?.hunt_entries || []
  const startBal = parseFloat(hunt?.start_balance) || 0
  const opened = entries.filter(e => e.opened && e.payout != null)
  const totalWon = opened.reduce((s, e) => s + (parseFloat(e.payout) || 0), 0)
  const avgPayout = opened.length ? (totalWon / opened.length).toFixed(2) : '—'
  const profit = totalWon - startBal
  const remainingSlots = entries.filter(e => !e.opened).length
  const beNeeded = remainingSlots > 0 ? ((startBal - totalWon) / remainingSlots).toFixed(2) : '—'
  const pending = entries.filter(e => !e.opened).length

  if (loading) return <div className="page"><p className="loading-pulse">Loading hunts...</p></div>

  return (
    <div className="page">
      {toast && <Toast {...toast} />}
      <div className="page-header">
        <div>
          <div className="section-title">🎯 Bonus Hunt</div>
          <div className="section-sub">Track your hunts in real time</div>
        </div>
        <button className="add-btn" onClick={() => setShowNewHunt(true)}>+ New Hunt</button>
      </div>

      {hunts.length === 0 ? (
        <div className="empty-state card"><span className="empty-icon">🎯</span><p>No hunts yet. Create your first one!</p></div>
      ) : (
        <>
          <div className="tabs">
            {hunts.map((h, i) => (
              <div key={h.id} className="tab-item">
                {editingName === h.id ? (
                  <input
                    className="form-input"
                    style={{ height: 36, fontSize: 13, padding: '4px 10px', width: 140, marginBottom: 1 }}
                    value={editingNameVal}
                    onChange={e => setEditingNameVal(e.target.value)}
                    onBlur={() => renameHunt(h.id)}
                    onKeyDown={e => { if (e.key === 'Enter') renameHunt(h.id); if (e.key === 'Escape') setEditingName(null) }}
                    autoFocus
                  />
                ) : (
                  <button className={`tab-btn ${i === activeIdx ? 'active' : ''}`} onClick={() => setActiveIdx(i)}
                    onDoubleClick={() => { setEditingName(h.id); setEditingNameVal(h.name) }}>
                    {h.name}
                  </button>
                )}
                <button className="tab-delete" onClick={() => deleteHunt(h.id)}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: -14, marginBottom: 16 }}>Double-click tab to rename</div>

          <div className="stats-grid">
            {[
              ['Start Balance', `€${startBal}`, ''],
              ['Break-Even/Slot', `€${beNeeded}`, ''],
              ['Avg Payout', `€${avgPayout}`, ''],
              ['Total Won', `€${fmt(totalWon, 0)}`, ''],
              ['Result', `${profit >= 0 ? '+' : ''}€${fmt(profit, 0)}`, profit >= 0 ? 'green' : 'red'],
              ['Pending', `${pending}`, ''],
            ].map(([l, v, c]) => (
              <div key={l} className="stat-box"><div className="stat-label">{l}</div><div className={`stat-value ${c}`}>{v}</div></div>
            ))}
          </div>

          {entries.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>
                <span>PROGRESS ({opened.length}/{entries.length})</span>
                <span>{entries.length ? Math.round(opened.length / entries.length * 100) : 0}%</span>
              </div>
              <div className="progress-wrap"><div className="progress-bar" style={{ width: `${entries.length ? opened.length / entries.length * 100 : 0}%` }} /></div>
            </div>
          )}

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{entries.length} entries</span>
              <button className="add-btn" onClick={() => setShowAdd(true)}>+ Add Slot</button>
            </div>
            {entries.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">🎰</span><p>Add slots to your hunt</p></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>Slot</th><th>Bet</th><th>Payout (€)</th><th>Multiplier</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {entries.map(e => {
                      const bet = parseFloat(e.bet_size) || 1
                      const payout = e.payout ? parseFloat(e.payout) : null
                      const multiplier = payout ? (payout / bet).toFixed(1) : null
                      return (
                        <tr key={e.id} style={{ opacity: e.opened ? 0.7 : 1 }}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 18 }}>🎰</span>
                              <div>
                                <div style={{ fontWeight: 500 }}>{e.slot_name}</div>
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.slot_provider}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            {editingBet === e.id ? (
                              <input className="multi-input" type="number" step="0.1" defaultValue={e.bet_size}
                                autoFocus style={{ width: 70 }}
                                onBlur={ev => updateBet(e.id, ev.target.value)}
                                onKeyDown={ev => ev.key === 'Enter' && updateBet(e.id, ev.target.value)} />
                            ) : (
                              <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => setEditingBet(e.id)} title="Click to edit">
                                €{e.bet_size} ✎
                              </span>
                            )}
                          </td>
                          <td>
                            <input className="multi-input" type="number" placeholder="0.00"
                              defaultValue={e.payout || ''}
                              onBlur={ev => { if (ev.target.value !== (e.payout || '')) updatePayout(e.id, ev.target.value) }}
                              style={{ width: 95 }} />
                          </td>
                          <td style={{ color: multiplier ? (parseFloat(multiplier) >= 100 ? 'var(--green)' : 'var(--gold)') : 'var(--muted)', fontFamily: "'Bebas Neue'", fontSize: 18 }}>
                            {multiplier ? `${multiplier}x` : '—'}
                          </td>
                          <td>
                            <button onClick={() => toggleOpened(e.id, e.opened)} style={{ background: e.opened ? 'rgba(0,230,122,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${e.opened ? 'rgba(0,230,122,0.25)' : 'var(--border)'}`, borderRadius: 6, color: e.opened ? 'var(--green)' : 'var(--muted)', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>
                              {e.opened ? '✓ Done' : 'Pending'}
                            </button>
                          </td>
                          <td><button className="danger-btn" onClick={() => removeEntry(e.id)}>✕</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showNewHunt && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNewHunt(false)}>
          <div className="modal">
            <h3>New Hunt</h3>
            <div className="form-group"><label className="form-label">Name</label><input className="form-input" placeholder="Hunt #1" value={newHuntForm.name} onChange={e => setNewHuntForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Starting Balance (€)</label><input className="form-input" type="number" value={newHuntForm.startBalance} onChange={e => setNewHuntForm(f => ({ ...f, startBalance: e.target.value }))} /></div>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setShowNewHunt(false)}>Cancel</button>
              <button className="add-btn" onClick={createHunt} disabled={saving}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <h3>Add Slot</h3>
            <div className="form-group">
              <label className="form-label">Search</label>
              <input className="form-input" placeholder="Slot name or provider..." value={search} autoFocus onChange={e => { setSearch(e.target.value); setNewSlot(s => ({ ...s, slotIdx: 0 })) }} />
            </div>
            <div className="form-group">
              <label className="form-label">Slot ({filteredSlots.length})</label>
              <select className="filter-select" style={{ width: '100%' }} value={newSlot.slotIdx} onChange={e => setNewSlot(s => ({ ...s, slotIdx: e.target.value }))}>
                {filteredSlots.slice(0, 100).map((s, i) => <option key={i} value={i}>{s.name} — {s.provider}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Bet Size (€)</label><input className="form-input" type="number" step="0.1" value={newSlot.betSize} onChange={e => setNewSlot(s => ({ ...s, betSize: e.target.value }))} /></div>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="add-btn" onClick={addEntry} disabled={saving}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Bonus Openings ────────────────────────────────────────────────────────────
function OpeningsTab({ user, slots }) {
  const [sessions, setSessions] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showNewSession, setShowNewSession] = useState(false)
  const [newOpening, setNewOpening] = useState({ slotIdx: 0, payout: '' })
  const [newSession, setNewSession] = useState({ startBalance: '300', betSize: '1' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [editingName, setEditingName] = useState(null)
  const [editingNameVal, setEditingNameVal] = useState('')
  const [toast, showToast] = useToast()

  useEffect(() => { loadSessions() }, [user])

  const loadSessions = async () => {
    setLoading(true)
    const { data } = await supabase.from('opening_sessions').select('*, openings(*)').eq('user_id', user.id).order('created_at', { ascending: false })
    setSessions(data || [])
    setLoading(false)
  }

  const deleteSession = async (sessionId) => {
    if (!confirm('Delete this session?')) return
    await supabase.from('openings').delete().eq('session_id', sessionId)
    await supabase.from('opening_sessions').delete().eq('id', sessionId)
    await loadSessions(); setActiveIdx(0)
  }

  const renameSession = async (sessionId) => {
    if (!editingNameVal.trim()) return
    await supabase.from('opening_sessions').update({ date: editingNameVal }).eq('id', sessionId)
    setSessions(ss => ss.map(s => s.id === sessionId ? { ...s, date: editingNameVal } : s))
    setEditingName(null)
    showToast('Name updated!')
  }

  const createSession = async () => {
    setSaving(true)
    await supabase.from('opening_sessions').insert({ user_id: user.id, date: new Date().toISOString().split('T')[0], start_balance: parseFloat(newSession.startBalance), bet_size: parseFloat(newSession.betSize) })
    await loadSessions(); setActiveIdx(0); setSaving(false); setShowNewSession(false)
    showToast('Session created!')
  }

  const filteredSlots = slots.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.provider.toLowerCase().includes(search.toLowerCase()))

  const addOpening = async () => {
    if (!newOpening.payout) return
    const slot = filteredSlots[parseInt(newOpening.slotIdx)]
    if (!slot) return
    const session = sessions[activeIdx]
    const bet = parseFloat(session.bet_size) || 1
    const payout = parseFloat(newOpening.payout)
    const multiplier = (payout / bet).toFixed(2)
    setSaving(true)
    await supabase.from('openings').insert({ session_id: session.id, slot_name: slot.name, slot_emoji: '🎰', slot_provider: slot.provider, multiplier, payout })
    await loadSessions(); setSaving(false); setShowAdd(false); setNewOpening({ slotIdx: 0, payout: '' }); setSearch('')
    showToast(`${slot.name} — ${multiplier}x`, 'gold')
  }

  const removeOpening = async (id) => {
    await supabase.from('openings').delete().eq('id', id)
    setSessions(ss => ss.map(s => ({ ...s, openings: s.openings.filter(o => o.id !== id) })))
  }

  const session = sessions[activeIdx]
  const ops = session?.openings || []
  const startBal = parseFloat(session?.start_balance) || 0
  const totalWon = ops.reduce((s, o) => s + (parseFloat(o.payout) || 0), 0)
  const avgPayout = ops.length ? (totalWon / ops.length).toFixed(2) : '—'
  const best = ops.length ? ops.reduce((a, b) => parseFloat(b.payout) > parseFloat(a.payout) ? b : a) : null
  const profit = totalWon - startBal

  if (loading) return <div className="page"><p className="loading-pulse">Loading sessions...</p></div>

  return (
    <div className="page">
      {toast && <Toast {...toast} />}
      <div className="page-header">
        <div>
          <div className="section-title">📊 Bonus Openings</div>
          <div className="section-sub">Track your bonus openings and payouts</div>
        </div>
        <button className="add-btn" onClick={() => setShowNewSession(true)}>+ New Session</button>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state card"><span className="empty-icon">📊</span><p>Create your first opening session</p></div>
      ) : (
        <>
          <div className="tabs">
            {sessions.map((s, i) => (
              <div key={s.id} className="tab-item">
                {editingName === s.id ? (
                  <input className="form-input" style={{ height: 36, fontSize: 13, padding: '4px 10px', width: 140, marginBottom: 1 }}
                    value={editingNameVal} onChange={e => setEditingNameVal(e.target.value)}
                    onBlur={() => renameSession(s.id)}
                    onKeyDown={e => { if (e.key === 'Enter') renameSession(s.id); if (e.key === 'Escape') setEditingName(null) }}
                    autoFocus />
                ) : (
                  <button className={`tab-btn ${i === activeIdx ? 'active' : ''}`} onClick={() => setActiveIdx(i)}
                    onDoubleClick={() => { setEditingName(s.id); setEditingNameVal(s.date) }}>
                    {s.date}
                  </button>
                )}
                <button className="tab-delete" onClick={() => deleteSession(s.id)}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: -14, marginBottom: 16 }}>Double-click tab to rename</div>

          <div className="stats-grid">
            {[
              ['Start Balance', `€${startBal}`, ''],
              ['Bet Size', `€${session?.bet_size}`, ''],
              ['Openings', `${ops.length}`, ''],
              ['Avg Payout', `€${avgPayout}`, ''],
              ['Total Won', `€${fmt(totalWon, 0)}`, ''],
              ['Result', `${profit >= 0 ? '+' : ''}€${fmt(profit, 0)}`, profit >= 0 ? 'green' : 'red'],
            ].map(([l, v, c]) => (
              <div key={l} className="stat-box"><div className="stat-label">{l}</div><div className={`stat-value ${c}`}>{v}</div></div>
            ))}
          </div>

          {best && (
            <div style={{ background: 'rgba(255,190,0,0.05)', border: '1px solid rgba(255,190,0,0.13)', borderRadius: 10, padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <span style={{ fontSize: 20 }}>⭐</span>
              <span><strong style={{ color: 'var(--gold)' }}>Best:</strong> {best.slot_name} — <strong style={{ color: 'var(--gold)' }}>€{fmt(parseFloat(best.payout))}</strong> ({best.multiplier}x)</span>
            </div>
          )}

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{ops.length} opening{ops.length !== 1 ? 's' : ''}</span>
              <button className="add-btn" onClick={() => setShowAdd(true)}>+ Add Opening</button>
            </div>
            {ops.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">🎰</span><p>Record your bonuses here</p></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>#</th><th>Slot</th><th>Payout (€)</th><th>Multiplier</th><th></th></tr></thead>
                  <tbody>
                    {ops.map((o, idx) => (
                      <tr key={o.id}>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>🎰</span>
                            <div>
                              <div style={{ fontWeight: 500 }}>{o.slot_name}</div>
                              {best?.id === o.id && <span style={{ fontSize: 10, color: 'var(--gold)' }}>⭐ BEST</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--green)', fontFamily: "'Bebas Neue'", fontSize: 20 }}>€{fmt(parseFloat(o.payout))}</td>
                        <td style={{ color: parseFloat(o.multiplier) >= 100 ? 'var(--green)' : parseFloat(o.multiplier) >= 50 ? 'var(--gold)' : 'var(--text)' }}>{o.multiplier}x</td>
                        <td><button className="danger-btn" onClick={() => removeOpening(o.id)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showNewSession && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNewSession(false)}>
          <div className="modal">
            <h3>New Session</h3>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Start Balance (€)</label><input className="form-input" type="number" value={newSession.startBalance} onChange={e => setNewSession(s => ({ ...s, startBalance: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Bet Size (€)</label><input className="form-input" type="number" step="0.1" value={newSession.betSize} onChange={e => setNewSession(s => ({ ...s, betSize: e.target.value }))} /></div>
            </div>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setShowNewSession(false)}>Cancel</button>
              <button className="add-btn" onClick={createSession} disabled={saving}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <h3>Record Opening</h3>
            <div className="form-group">
              <label className="form-label">Search</label>
              <input className="form-input" placeholder="Slot name or provider..." value={search} autoFocus onChange={e => { setSearch(e.target.value); setNewOpening(s => ({ ...s, slotIdx: 0 })) }} />
            </div>
            <div className="form-group">
              <label className="form-label">Slot</label>
              <select className="filter-select" style={{ width: '100%' }} value={newOpening.slotIdx} onChange={e => setNewOpening(s => ({ ...s, slotIdx: e.target.value }))}>
                {filteredSlots.slice(0, 100).map((s, i) => <option key={i} value={i}>{s.name} — {s.provider}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payout (€)</label>
              <input className="form-input" type="number" step="0.01" placeholder="e.g. 45.50" value={newOpening.payout} onChange={e => setNewOpening(s => ({ ...s, payout: e.target.value }))} />
              {newOpening.payout && session && (
                <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>
                  = {(parseFloat(newOpening.payout) / (parseFloat(session.bet_size) || 1)).toFixed(1)}x multiplier
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="add-btn" onClick={addOpening} disabled={saving || !newOpening.payout}>Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tournament ────────────────────────────────────────────────────────────────
function TournamentTab({ user, slots }) {
  const [tournaments, setTournaments] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [size, setSize] = useState(8)
  const [tournamentName, setTournamentName] = useState('')
  const [editingPos, setEditingPos] = useState(null)
  const [search, setSearch] = useState('')
  const [editingMultiplier, setEditingMultiplier] = useState(null)
  const [multValue, setMultValue] = useState('')
  const [editingName, setEditingName] = useState(null)
  const [editingNameVal, setEditingNameVal] = useState('')
  const [toast, showToast] = useToast()

  useEffect(() => { loadTournaments() }, [user])

  const loadTournaments = async () => {
    setLoading(true)
    const { data } = await supabase.from('tournaments').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setTournaments(data || [])
    setLoading(false)
  }

  const deleteTournament = async (id) => {
    if (!confirm('Delete this tournament?')) return
    await supabase.from('tournaments').delete().eq('id', id)
    await loadTournaments(); setActiveIdx(0)
  }

  const renameTournament = async (id) => {
    if (!editingNameVal.trim()) return
    await supabase.from('tournaments').update({ name: editingNameVal }).eq('id', id)
    setTournaments(ts => ts.map(t => t.id === id ? { ...t, name: editingNameVal } : t))
    setEditingName(null)
    showToast('Name updated!')
  }

  const createTournament = async () => {
    await supabase.from('tournaments').insert({ user_id: user.id, name: tournamentName || `Tournament #${tournaments.length + 1}`, size, bracket: { assignments: {}, scores: {}, multipliers: {} } })
    await loadTournaments(); setActiveIdx(0); setCreating(false); setTournamentName('')
  }

  const updateBracket = async (patch) => {
    const t = tournaments[activeIdx]
    const newBracket = { ...t.bracket, ...patch }
    await supabase.from('tournaments').update({ bracket: newBracket }).eq('id', t.id)
    setTournaments(ts => ts.map((t2, i) => i !== activeIdx ? t2 : { ...t2, bracket: newBracket }))
  }

  const randomize = () => {
    const t = tournaments[activeIdx]
    const shuffled = [...slots].sort(() => Math.random() - 0.5).slice(0, t.size)
    const assignments = {}
    shuffled.forEach((s, i) => { assignments[i] = { name: s.name, emoji: '🎰' } })
    updateBracket({ assignments, scores: {}, multipliers: {} })
    showToast('Slots randomized!')
  }

  const assignSlot = (pos, slot) => {
    const t = tournaments[activeIdx]
    const assignments = { ...(t.bracket?.assignments || {}), [pos]: { name: slot.name, emoji: '🎰' } }
    updateBracket({ assignments })
    setEditingPos(null); setSearch('')
  }

  // Fixed bracket logic: properly get player from any round
  const getPlayer = (bracket, rIdx, mIdx, pIdx) => {
    const assignments = bracket?.assignments || {}
    const scores = bracket?.scores || {}
    if (rIdx === 0) {
      return assignments[mIdx * 2 + pIdx] || null
    }
    const prevKey = `${rIdx - 1}-${mIdx * 2 + pIdx}`
    const winner = scores[prevKey]
    if (!winner) return null
    return getPlayer(bracket, rIdx - 1, mIdx * 2 + pIdx, winner === 'p1' ? 0 : 1)
  }

  const setWinner = (key, player) => {
    const t = tournaments[activeIdx]
    const scores = { ...(t.bracket?.scores || {}), [key]: player }
    // Clear all downstream scores when changing a winner
    const [rIdx, mIdx] = key.split('-').map(Number)
    const rounds = Math.log2(t.size)
    for (let r = rIdx + 1; r < rounds; r++) {
      const downstreamIdx = Math.floor(mIdx / Math.pow(2, r - rIdx))
      delete scores[`${r}-${downstreamIdx}`]
    }
    updateBracket({ scores })
  }

  const undoWinner = (key) => {
    const t = tournaments[activeIdx]
    const scores = { ...(t.bracket?.scores || {}) }
    const [rIdx, mIdx] = key.split('-').map(Number)
    delete scores[key]
    // Clear downstream too
    const rounds = Math.log2(t.size)
    for (let r = rIdx + 1; r < rounds; r++) {
      const downstreamIdx = Math.floor(mIdx / Math.pow(2, r - rIdx))
      delete scores[`${r}-${downstreamIdx}`]
    }
    updateBracket({ scores })
  }

  const saveMultiplier = () => {
    if (!multValue || !editingMultiplier) return
    const t = tournaments[activeIdx]
    const multipliers = { ...(t.bracket?.multipliers || {}), [`${editingMultiplier.key}_${editingMultiplier.player}`]: parseFloat(multValue) }
    updateBracket({ multipliers })
    setEditingMultiplier(null); setMultValue('')
    showToast(`Multiplier set: ${multValue}x`, 'gold')
  }

  const filteredSlots = slots.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.provider.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="page"><p className="loading-pulse">Loading tournaments...</p></div>

  const tournament = tournaments[activeIdx]

  const renderBracket = (t) => {
    const scores = t.bracket?.scores || {}
    const multipliers = t.bracket?.multipliers || {}
    const rounds = Math.log2(t.size)
    const roundNames = { 0: `Round of ${t.size}`, [rounds - 2]: 'Quarter Finals', [rounds - 1]: 'Semi Finals' }
    if (t.size === 4) { roundNames[0] = 'Semi Finals'; roundNames[1] = 'Final' }
    if (t.size === 8) { roundNames[0] = 'Quarter Finals'; roundNames[1] = 'Semi Finals'; roundNames[2] = 'Final' }
    if (t.size === 16) { roundNames[0] = 'Round of 16'; roundNames[1] = 'Quarter Finals'; roundNames[2] = 'Semi Finals'; roundNames[3] = 'Final' }

    return (
      <div className="bracket-wrap">
        <div className="bracket">
          {Array.from({ length: rounds }, (_, rIdx) => {
            const matchCount = t.size / Math.pow(2, rIdx + 1)
            const gap = (Math.pow(2, rIdx + 1) * 44) - 44
            return (
              <div key={rIdx} className="bracket-round">
                <div className="round-label">{roundNames[rIdx] || `Round ${rIdx + 1}`}</div>
                {Array.from({ length: matchCount }, (_, mIdx) => {
                  const p1 = getPlayer(t.bracket, rIdx, mIdx, 0)
                  const p2 = getPlayer(t.bracket, rIdx, mIdx, 1)
                  const key = `${rIdx}-${mIdx}`
                  const winner = scores[key]
                  return (
                    <div key={mIdx} style={{ marginTop: mIdx === 0 ? (rIdx === 0 ? 0 : gap / 2) : gap }}>
                      <div className="matchup">
                        {[p1, p2].map((slot, pi) => {
                          const player = pi === 0 ? 'p1' : 'p2'
                          const isW = winner === player
                          const isL = winner && !isW
                          const mult = multipliers[`${key}_${player}`]
                          return (
                            <div key={pi} className={`matchup-slot ${isW ? 'winner' : ''} ${isL ? 'loser' : ''}`}>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}
                                onClick={() => { if (!slot && rIdx === 0) setEditingPos(mIdx * 2 + pi); else if (!winner && slot) setWinner(key, player) }}>
                                <span style={{ fontSize: 14, flexShrink: 0 }}>{slot?.emoji || '❓'}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {slot?.name || (rIdx === 0 ? 'Click to set' : 'TBD')}
                                  </div>
                                  {mult && <div style={{ fontSize: 10, color: isW ? 'var(--gold)' : 'rgba(255,190,0,0.5)' }}>{mult}x</div>}
                                </div>
                                {isW && <span style={{ fontSize: 11, flexShrink: 0 }}>👑</span>}
                              </div>
                              <div style={{ display: 'flex', gap: 3, flexShrink: 0, marginLeft: 4 }}>
                                {slot && (
                                  <button onClick={() => { setEditingMultiplier({ key, player }); setMultValue(mult?.toString() || '') }}
                                    style={{ background: 'rgba(255,190,0,0.1)', border: '1px solid rgba(255,190,0,0.2)', borderRadius: 4, color: 'var(--gold)', fontSize: 9, padding: '2px 5px', cursor: 'pointer' }}>×</button>
                                )}
                                {isW && (
                                  <button onClick={() => undoWinner(key)}
                                    style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 4, color: 'var(--red)', fontSize: 9, padding: '2px 5px', cursor: 'pointer' }}>↩</button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
          {/* Champion */}
          <div className="bracket-round">
            <div className="round-label">🏆 Champion</div>
            <div style={{ marginTop: (Math.pow(2, rounds - 1) * 44) - 44 }}>
              {(() => {
                const finalKey = `${rounds - 1}-0`
                const w = scores[finalKey]
                const champ = w ? getPlayer(t.bracket, rounds - 1, 0, w === 'p1' ? 0 : 1) : null
                return (
                  <div className="champion-box">
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{champ?.emoji || '❓'}</div>
                    <div className="champion-label">CHAMPION</div>
                    <div className="champion-name">{champ?.name || 'TBD'}</div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {toast && <Toast {...toast} />}
      <div className="page-header">
        <div>
          <div className="section-title">🏆 Tournament</div>
          <div className="section-sub">Elimination brackets between slots</div>
        </div>
        <button className="add-btn" onClick={() => setCreating(true)}>+ New Tournament</button>
      </div>

      {tournaments.length === 0 ? (
        <div className="empty-state card"><span className="empty-icon">🏆</span><p>Create your first tournament!</p></div>
      ) : (
        <>
          <div className="tabs">
            {tournaments.map((t, i) => (
              <div key={t.id} className="tab-item">
                {editingName === t.id ? (
                  <input className="form-input" style={{ height: 36, fontSize: 13, padding: '4px 10px', width: 160, marginBottom: 1 }}
                    value={editingNameVal} onChange={e => setEditingNameVal(e.target.value)}
                    onBlur={() => renameTournament(t.id)}
                    onKeyDown={e => { if (e.key === 'Enter') renameTournament(t.id); if (e.key === 'Escape') setEditingName(null) }}
                    autoFocus />
                ) : (
                  <button className={`tab-btn ${i === activeIdx ? 'active' : ''}`} onClick={() => setActiveIdx(i)}
                    onDoubleClick={() => { setEditingName(t.id); setEditingNameVal(t.name) }}>
                    {t.name}
                  </button>
                )}
                <button className="tab-delete" onClick={() => deleteTournament(t.id)}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: -14, marginBottom: 16 }}>Double-click tab to rename</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="add-btn" onClick={randomize}>🎲 Randomize Slots</button>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Click slot to set winner · ↩ undo · × set multiplier</span>
          </div>
          <div className="card">{tournament && renderBracket(tournament)}</div>
        </>
      )}

      {creating && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCreating(false)}>
          <div className="modal">
            <h3>New Tournament</h3>
            <div className="form-group"><label className="form-label">Name</label><input className="form-input" placeholder="April Tournament" value={tournamentName} onChange={e => setTournamentName(e.target.value)} autoFocus /></div>
            <div className="form-group">
              <label className="form-label">Number of Slots</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {[4, 8, 16].map(n => (
                  <button key={n} onClick={() => setSize(n)} style={{ flex: 1, background: size === n ? 'rgba(255,190,0,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${size === n ? 'rgba(255,190,0,0.4)' : 'var(--border)'}`, borderRadius: 8, color: size === n ? 'var(--gold)' : 'var(--muted)', fontFamily: "'Bebas Neue'", fontSize: 24, padding: '12px', cursor: 'pointer' }}>{n}</button>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setCreating(false)}>Cancel</button>
              <button className="add-btn" onClick={createTournament}>Create</button>
            </div>
          </div>
        </div>
      )}

      {editingPos !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingPos(null)}>
          <div className="modal">
            <h3>Choose Slot</h3>
            <div className="form-group">
              <input className="form-input" placeholder="Search slot..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, maxHeight: 360, overflowY: 'auto' }}>
              {filteredSlots.slice(0, 60).map((s, i) => (
                <div key={i} onClick={() => assignSlot(editingPos, s)}
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,190,0,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                  <span style={{ fontSize: 17 }}>🎰</span>
                  <div><div style={{ fontWeight: 500 }}>{s.name}</div><div style={{ fontSize: 10, color: 'var(--muted)' }}>{s.provider}</div></div>
                </div>
              ))}
            </div>
            <div className="modal-actions"><button className="ghost-btn" onClick={() => setEditingPos(null)}>Close</button></div>
          </div>
        </div>
      )}

      {editingMultiplier && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingMultiplier(null)}>
          <div className="modal">
            <h3>Set Multiplier</h3>
            <div className="form-group">
              <label className="form-label">Multiplier (x)</label>
              <input className="form-input" type="number" step="0.1" placeholder="e.g. 45.5" value={multValue} onChange={e => setMultValue(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && saveMultiplier()} />
            </div>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setEditingMultiplier(null)}>Cancel</button>
              <button className="add-btn" onClick={saveMultiplier} disabled={!multValue}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setCheckingAuth(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
    })
    fetchSlots().then(data => { setSlots(data); setSlotsLoading(false) }).catch(() => setSlotsLoading(false))
    return () => subscription.unsubscribe()
  }, [])

  const logout = async () => { await supabase.auth.signOut(); setUser(null); setShowUserMenu(false) }

  if (checkingAuth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader" style={{ width: 32, height: 32 }} />
    </div>
  )

  if (!user) return <AuthScreen onAuth={setUser} />

  const TABS = [
    { id: 'dashboard', label: '🏠 Dashboard' },
    { id: 'randomizer', label: '🎰 Randomizer' },
    { id: 'hunt', label: '🎯 Bonus Hunt' },
    { id: 'openings', label: '📊 Openings' },
    { id: 'tournament', label: '🏆 Tournament' },
  ]

  return (
    <div>
      <div className="header">
        <div className="logo">Slot<span>Lab</span></div>
        <nav className="nav">
          {TABS.map(t => <button key={t.id} className={`nav-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </nav>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div className="user-pill" onClick={() => setShowUserMenu(o => !o)}>
            <div className="avatar">{user.email[0].toUpperCase()}</div>
            <span>{user.email.split('@')[0]}</span>
            <span style={{ fontSize: 10, marginLeft: 2 }}>▾</span>
          </div>
          {showUserMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowUserMenu(false)} />
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, background: '#0d1119', border: '1px solid rgba(255,190,0,0.2)', borderRadius: 10, padding: 8, minWidth: 180, zIndex: 200 }}>
                <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--muted)', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>{user.email}</div>
                <button onClick={logout} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--red)', fontSize: 13, padding: '8px 12px', cursor: 'pointer', textAlign: 'left', borderRadius: 6 }}>
                  🚪 Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {tab === 'dashboard' && <DashboardTab user={user} />}
      {tab === 'randomizer' && <RandomizerTab slots={slots} slotsLoading={slotsLoading} />}
      {tab === 'hunt' && <BonusHuntTab user={user} slots={slots} />}
      {tab === 'openings' && <OpeningsTab user={user} slots={slots} />}
      {tab === 'tournament' && <TournamentTab user={user} slots={slots} />}
    </div>
  )
}
