import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { fetchSlots } from './slots'

const fmt = (n, d = 2) => (n ?? 0).toFixed(d)
const fmtK = n => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n

function VolBadge({ v }) {
  const cls = v === 'Very High' || v === 'Very high' ? 'badge-vhigh' : v === 'High' ? 'badge-high' : v === 'Medium' ? 'badge-medium' : 'badge-low'
  return <span className={`badge ${cls}`}>{v}</span>
}

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

function RandomizerTab({ slots, slotsLoading }) {
  const [selectedProviders, setSelectedProviders] = useState([])
  const [volatility, setVolatility] = useState('')
  const [theme, setTheme] = useState('')
  const [minMaxWin, setMinMaxWin] = useState('')
  const [maxMaxWin, setMaxMaxWin] = useState('')
  const [result, setResult] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [spinPhase, setSpinPhase] = useState('idle')
  const [providerOpen, setProviderOpen] = useState(false)
  const [currentSlot, setCurrentSlot] = useState(null)

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
    setResult(null)
    let count = 0
    const total = 20
    const interval = setInterval(() => {
      setCurrentSlot(pool[Math.floor(Math.random() * pool.length)])
      count++
      if (count >= total) {
        clearInterval(interval)
        const final = pool[Math.floor(Math.random() * pool.length)]
        setCurrentSlot(final)
        setResult(final)
        setSpinPhase('result')
        setSpinning(false)
      }
    }, 80)
  }

  const toggleProvider = (p) => {
    setSelectedProviders(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

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
          <div className="filter-group" style={{ position: 'relative' }}>
            <label>Provider</label>
            <button className="filter-select" style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setProviderOpen(o => !o)}>
              <span>{selectedProviders.length === 0 ? `All (${providers.length})` : `${selectedProviders.length} selected`}</span>
              <span>▾</span>
            </button>
            {providerOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: '#0d1119', border: '1px solid rgba(255,190,0,0.2)', borderRadius: 8, minWidth: 240, maxHeight: 300, overflowY: 'auto', padding: 8 }}>
                <div style={{ display: 'flex', gap: 8, padding: '4px 4px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 6 }}>
                  <button className="add-btn" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setSelectedProviders([...providers])}>Select All</button>
                  <button className="ghost-btn" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setSelectedProviders([])}>Clear All</button>
                </div>
                {providers.map(p => (
                  <div key={p} onClick={() => toggleProvider(p)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', cursor: 'pointer', borderRadius: 6, background: selectedProviders.includes(p) ? 'rgba(255,190,0,0.1)' : 'transparent' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${selectedProviders.includes(p) ? 'var(--gold)' : 'rgba(255,255,255,0.3)'}`, background: selectedProviders.includes(p) ? 'var(--gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {selectedProviders.includes(p) && <span style={{ color: '#000', fontSize: 10, fontWeight: 700 }}>✓</span>}
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
            <input className="filter-input" type="number" placeholder="e.g. 5000" style={{ minWidth: 120 }} value={minMaxWin} onChange={e => setMinMaxWin(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Max Max Win</label>
            <input className="filter-input" type="number" placeholder="e.g. 100000" style={{ minWidth: 120 }} value={maxMaxWin} onChange={e => setMaxMaxWin(e.target.value)} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>{pool.length} slot{pool.length !== 1 ? 's' : ''} in pool</div>
        <button className="spin-btn" onClick={spin} disabled={spinning || !pool.length || slotsLoading}>
          {spinning ? 'SPINNING...' : '🎲 SPIN RANDOM SLOT'}
        </button>
      </div>

      {(spinPhase === 'spinning' || spinPhase === 'result') && currentSlot && (
        <div className="result-card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            {spinPhase === 'spinning' ? '🎰 Spinning...' : '🎯 Result'}
          </div>
          <div className="result-name" style={{ fontSize: spinPhase === 'spinning' ? 22 : 30 }}>{currentSlot.name}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>{currentSlot.provider}</div>
          {spinPhase === 'result' && (
            <div className="result-pills">
              <VolBadge v={currentSlot.volatility} />
              <span className="pill"><strong>Max Win</strong>{fmtK(currentSlot.max_win)}x</span>
              <span className="pill"><strong>RTP</strong>{currentSlot.rtp}%</span>
              <span className="pill"><strong>Theme</strong>{currentSlot.theme}</span>
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
            {pool.slice(0, 200).map((s, i) => (
              <div key={i} className="slot-card">
                <span style={{ fontSize: 20 }}>🎰</span>
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
  }

  const filteredSlots = slots.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.provider.toLowerCase().includes(search.toLowerCase()))

  const addEntry = async () => {
    const slot = filteredSlots[parseInt(newSlot.slotIdx)]
    if (!slot) return
    const hunt = hunts[activeIdx]
    setSaving(true)
    await supabase.from('hunt_entries').insert({ hunt_id: hunt.id, slot_name: slot.name, slot_emoji: slot.emoji, slot_provider: slot.provider, slot_volatility: slot.volatility, slot_image: slot.image || null, bet_size: parseFloat(newSlot.betSize), opened: false })
    await loadHunts(); setSaving(false); setShowAdd(false); setSearch('')
  }

  const updatePayout = async (entryId, payoutVal) => {
    const payout = payoutVal ? parseFloat(payoutVal) : null
    await supabase.from('hunt_entries').update({ payout, opened: payout != null }).eq('id', entryId)
    setHunts(hs => hs.map(h => ({ ...h, hunt_entries: h.hunt_entries.map(e => e.id === entryId ? { ...e, payout: payoutVal, opened: payout != null } : e) })))
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
              <div key={h.id} style={{ display: 'flex', alignItems: 'center' }}>
                <button className={`tab-btn ${i === activeIdx ? 'active' : ''}`} onClick={() => setActiveIdx(i)}>{h.name}</button>
                <button onClick={() => deleteHunt(h.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,68,68,0.5)', cursor: 'pointer', fontSize: 12, padding: '0 4px', marginLeft: -4 }}>✕</button>
              </div>
            ))}
          </div>

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
                              <div><div style={{ fontWeight: 500 }}>{e.slot_name}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.slot_provider}</div></div>
                            </div>
                          </td>
                          <td style={{ color: 'var(--gold)' }}>€{e.bet_size}</td>
                          <td>
                            <input className="multi-input" type="number" placeholder="0.00" defaultValue={e.payout || ''} onBlur={ev => updatePayout(e.id, ev.target.value)} style={{ width: 100 }} />
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
              <input className="form-input" placeholder="Slot name or provider..." value={search} onChange={e => { setSearch(e.target.value); setNewSlot(s => ({ ...s, slotIdx: 0 })) }} />
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
    await loadSessions()
    setActiveIdx(0)
  }

  const createSession = async () => {
    setSaving(true)
    await supabase.from('opening_sessions').insert({ user_id: user.id, date: new Date().toISOString().split('T')[0], start_balance: parseFloat(newSession.startBalance), bet_size: parseFloat(newSession.betSize) })
    await loadSessions(); setActiveIdx(0); setSaving(false); setShowNewSession(false)
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
    await supabase.from('openings').insert({ session_id: session.id, slot_name: slot.name, slot_emoji: slot.emoji, slot_provider: slot.provider, slot_volatility: slot.volatility, slot_image: slot.image || null, multiplier, payout })
    await loadSessions(); setSaving(false); setShowAdd(false); setNewOpening({ slotIdx: 0, payout: '' }); setSearch('')
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
              <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                <button className={`tab-btn ${i === activeIdx ? 'active' : ''}`} onClick={() => setActiveIdx(i)}>{s.date}</button>
                <button onClick={() => deleteSession(s.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,68,68,0.5)', cursor: 'pointer', fontSize: 12, padding: '0 4px', marginLeft: -4 }}>✕</button>
              </div>
            ))}
          </div>

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
              <input className="form-input" placeholder="Slot name or provider..." value={search} onChange={e => { setSearch(e.target.value); setNewOpening(s => ({ ...s, slotIdx: 0 })) }} />
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
    await loadTournaments()
    setActiveIdx(0)
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
    shuffled.forEach((s, i) => { assignments[i] = { name: s.name, emoji: s.emoji } })
    updateBracket({ assignments, scores: {}, multipliers: {} })
  }

  const assignSlot = (pos, slot) => {
    const t = tournaments[activeIdx]
    const assignments = { ...(t.bracket?.assignments || {}), [pos]: { name: slot.name, emoji: slot.emoji } }
    updateBracket({ assignments })
    setEditingPos(null); setSearch('')
  }

  const setWinner = (key, player) => {
    const t = tournaments[activeIdx]
    const scores = { ...(t.bracket?.scores || {}), [key]: player }
    updateBracket({ scores })
  }

  const undoWinner = (key) => {
    const t = tournaments[activeIdx]
    const scores = { ...(t.bracket?.scores || {}) }
    delete scores[key]
    updateBracket({ scores })
  }

  const saveMultiplier = () => {
    if (!multValue || !editingMultiplier) return
    const t = tournaments[activeIdx]
    const multipliers = { ...(t.bracket?.multipliers || {}), [`${editingMultiplier.key}_${editingMultiplier.player}`]: parseFloat(multValue) }
    updateBracket({ multipliers })
    setEditingMultiplier(null)
    setMultValue('')
  }

  const filteredSlots = slots.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.provider.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="page"><p className="loading-pulse">Loading tournaments...</p></div>

  const tournament = tournaments[activeIdx]

  const renderBracket = (t) => {
    const assignments = t.bracket?.assignments || {}
    const scores = t.bracket?.scores || {}
    const multipliers = t.bracket?.multipliers || {}
    const rounds = Math.log2(t.size)
    const roundNames = ['Round of ' + t.size, 'Quarter Finals', 'Semi Finals', 'Final']

    const getP = (rIdx, mIdx, pIdx) => {
      if (rIdx === 0) return assignments[mIdx * 2 + pIdx] || null
      const key = `${rIdx - 1}-${mIdx * 2 + pIdx}`
      const w = scores[key]
      if (!w) return null
      return getP(rIdx - 1, mIdx * 2 + pIdx, w === 'p1' ? 0 : 1)
    }

    return (
      <div className="bracket-wrap">
        <div className="bracket">
          {Array.from({ length: rounds }, (_, rIdx) => {
            const matchCount = t.size / Math.pow(2, rIdx + 1)
            const spacing = Math.pow(2, rIdx) * 90 - 90
            return (
              <div key={rIdx} className="bracket-round">
                <div className="round-label">{roundNames[rIdx] || `Round ${rIdx + 1}`}</div>
                {Array.from({ length: matchCount }, (_, mIdx) => {
                  const p1 = getP(rIdx, mIdx, 0)
                  const p2 = getP(rIdx, mIdx, 1)
                  const key = `${rIdx}-${mIdx}`
                  const winner = scores[key]
                  return (
                    <div key={mIdx} style={{ paddingTop: mIdx === 0 ? (rIdx === 0 ? 0 : spacing / 2) : spacing }}>
                      <div className="matchup">
                        {[p1, p2].map((slot, pi) => {
                          const player = pi === 0 ? 'p1' : 'p2'
                          const isW = winner === player
                          const isL = winner && winner !== player
                          const mult = multipliers[`${key}_${player}`]
                          return (
                            <div key={pi} className={`matchup-slot ${isW ? 'winner' : ''} ${isL ? 'loser' : ''}`}>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => {
                                if (!slot && rIdx === 0) setEditingPos(mIdx * 2 + pi)
                                else if (!winner && slot) setWinner(key, player)
                              }}>
                                <span style={{ fontSize: 14 }}>{slot?.emoji || '❓'}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {slot?.name || (rIdx === 0 ? 'Click to set' : 'TBD')}
                                  </div>
                                  {mult && <div style={{ fontSize: 10, color: isW ? 'var(--gold)' : 'var(--muted)' }}>{mult}x</div>}
                                </div>
                                {isW && <span style={{ fontSize: 12 }}>👑</span>}
                              </div>
                              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                                {slot && (
                                  <button onClick={() => { setEditingMultiplier({ key, player }); setMultValue(mult || '') }}
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
          <div className="bracket-round">
            <div className="round-label">🏆 Champion</div>
            <div style={{ paddingTop: Math.pow(2, rounds - 1) * 90 / 2 - 44 }}>
              {(() => {
                const w = scores[`${rounds - 1}-0`]
                const champ = w ? getP(rounds - 1, 0, w === 'p1' ? 0 : 1) : null
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
              <div key={t.id} style={{ display: 'flex', alignItems: 'center' }}>
                <button className={`tab-btn ${i === activeIdx ? 'active' : ''}`} onClick={() => setActiveIdx(i)}>{t.name}</button>
                <button onClick={() => deleteTournament(t.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,68,68,0.5)', cursor: 'pointer', fontSize: 12, padding: '0 4px', marginLeft: -4 }}>✕</button>
              </div>
            ))}
          </div>
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
            <div className="form-group"><label className="form-label">Name</label><input className="form-input" placeholder="April Tournament" value={tournamentName} onChange={e => setTournamentName(e.target.value)} /></div>
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

export default function App() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('randomizer')
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
    fetchSlots().then(data => {
      setSlots(data)
      setSlotsLoading(false)
    }).catch(() => setSlotsLoading(false))
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
      {tab === 'randomizer' && <RandomizerTab slots={slots} slotsLoading={slotsLoading} />}
      {tab === 'hunt' && <BonusHuntTab user={user} slots={slots} />}
      {tab === 'openings' && <OpeningsTab user={user} slots={slots} />}
      {tab === 'tournament' && <TournamentTab user={user} slots={slots} />}
    </div>
  )
}
