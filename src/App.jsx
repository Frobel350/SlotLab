import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { SLOTS_DATA, PROVIDERS, VOLATILITIES, THEMES } from './slots'

const fmt = (n, d = 2) => (n ?? 0).toFixed(d)
const fmtK = n => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n

function VolBadge({ v }) {
  const cls = v === 'Very High' ? 'badge-vhigh' : v === 'High' ? 'badge-high' : v === 'Medium' ? 'badge-medium' : 'badge-low'
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
        setSuccess('Conta criada! Verifica o teu email para confirmar.')
      }
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">Slot<span>Lab</span></div>
        <div className="auth-sub">A tua plataforma de bonus hunting</div>
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Entrar</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Criar Conta</button>
        </div>
        {error && <div className="auth-error">⚠ {error}</div>}
        {success && <div className="auth-success">✓ {success}</div>}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" placeholder="teu@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
        </div>
        <button className="primary-btn" onClick={handle} disabled={loading || !email || !password}>
          {loading ? '...' : tab === 'login' ? 'ENTRAR' : 'CRIAR CONTA'}
        </button>
      </div>
    </div>
  )
}

function RandomizerTab() {
  const [filters, setFilters] = useState({ provider: '', volatility: '', theme: '', minMaxWin: '', maxMaxWin: '' })
  const [result, setResult] = useState(null)
  const [spinning, setSpinning] = useState(false)

  const pool = SLOTS_DATA.filter(s => {
    if (filters.provider && s.provider !== filters.provider) return false
    if (filters.volatility && s.volatility !== filters.volatility) return false
    if (filters.theme && s.theme !== filters.theme) return false
    if (filters.minMaxWin && s.max_win < parseInt(filters.minMaxWin)) return false
    if (filters.maxMaxWin && s.max_win > parseInt(filters.maxMaxWin)) return false
    return true
  })

  const spin = () => {
    if (!pool.length) return
    setSpinning(true)
    setTimeout(() => { setResult(pool[Math.floor(Math.random() * pool.length)]); setSpinning(false) }, 600)
  }

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="section-title">🎰 Slot Randomizer</div>
          <div className="section-sub">{SLOTS_DATA.length} slots disponíveis — filtra e sorteia</div>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="filters-row">
          <div className="filter-group">
            <label>Provedor</label>
            <select className="filter-select" value={filters.provider} onChange={e => setF('provider', e.target.value)}>
              <option value="">Todos ({PROVIDERS.length})</option>
              {PROVIDERS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Volatilidade</label>
            <select className="filter-select" value={filters.volatility} onChange={e => setF('volatility', e.target.value)}>
              <option value="">Todas</option>
              {VOLATILITIES.map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Tema</label>
            <select className="filter-select" value={filters.theme} onChange={e => setF('theme', e.target.value)}>
              <option value="">Todos</option>
              {THEMES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Max Win Mín.</label>
            <input className="filter-input" type="number" placeholder="ex: 5000" style={{ minWidth: 120 }} value={filters.minMaxWin} onChange={e => setF('minMaxWin', e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Max Win Máx.</label>
            <input className="filter-input" type="number" placeholder="ex: 100000" style={{ minWidth: 120 }} value={filters.maxMaxWin} onChange={e => setF('maxMaxWin', e.target.value)} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>{pool.length} slot{pool.length !== 1 ? 's' : ''} na pool</div>
        <button className="spin-btn" onClick={spin} disabled={spinning || !pool.length}>
          {spinning ? 'A SORTEAR...' : '🎲 SORTEAR SLOT ALEATÓRIA'}
        </button>
      </div>
      {result && (
        <div className="result-card">
          <span className="result-emoji">{result.emoji}</span>
          <div className="result-name">{result.name}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>{result.provider}</div>
          <div className="result-pills">
            <VolBadge v={result.volatility} />
            <span className="pill"><strong>Max Win</strong>{fmtK(result.max_win)}x</span>
            <span className="pill"><strong>RTP</strong>{result.rtp}%</span>
            <span className="pill"><strong>Tema</strong>{result.theme}</span>
          </div>
        </div>
      )}
      <div className="card">
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 14 }}>Pool ({pool.length})</div>
        <div className="slots-grid">
          {pool.map((s, i) => (
            <div key={i} className="slot-card">
              <span style={{ fontSize: 20 }}>{s.emoji}</span>
              <div style={{ minWidth: 0 }}>
                <div className="slot-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                <div className="slot-meta">{s.provider} · {fmtK(s.max_win)}x</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BonusHuntTab({ user }) {
  const [hunts, setHunts] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showNewHunt, setShowNewHunt] = useState(false)
  const [newSlot, setNewSlot] = useState({ slotIdx: 0, betSize: '1' })
  const [newHuntForm, setNewHuntForm] = useState({ name: '', startBalance: '500' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadHunts() }, [user])

  const loadHunts = async () => {
    setLoading(true)
    const { data } = await supabase.from('bonus_hunts').select('*, hunt_entries(*)').eq('user_id', user.id).order('created_at', { ascending: false })
    setHunts(data || [])
    setLoading(false)
  }

  const createHunt = async () => {
    setSaving(true)
    await supabase.from('bonus_hunts').insert({ user_id: user.id, name: newHuntForm.name || `Hunt #${hunts.length + 1}`, start_balance: parseFloat(newHuntForm.startBalance) })
    await loadHunts(); setActiveIdx(0); setSaving(false); setShowNewHunt(false)
  }

  const addEntry = async () => {
    const slot = SLOTS_DATA[parseInt(newSlot.slotIdx)]
    const hunt = hunts[activeIdx]
    setSaving(true)
    await supabase.from('hunt_entries').insert({ hunt_id: hunt.id, slot_name: slot.name, slot_emoji: slot.emoji, slot_provider: slot.provider, slot_volatility: slot.volatility, bet_size: parseFloat(newSlot.betSize), opened: false })
    await loadHunts(); setSaving(false); setShowAdd(false)
  }

  const updateMultiplier = async (entryId, val) => {
    await supabase.from('hunt_entries').update({ multiplier: val ? parseFloat(val) : null }).eq('id', entryId)
    setHunts(hs => hs.map(h => ({ ...h, hunt_entries: h.hunt_entries.map(e => e.id === entryId ? { ...e, multiplier: val } : e) })))
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
  const totalCost = entries.reduce((s, e) => s + (parseFloat(e.bet_size) || 0) * 100, 0)
  const startBal = parseFloat(hunt?.start_balance) || 0
  const beMul = totalCost > 0 ? ((startBal + totalCost) / totalCost).toFixed(2) : '—'
  const opened = entries.filter(e => e.opened && e.multiplier)
  const totalWon = opened.reduce((s, e) => s + (parseFloat(e.multiplier) || 0) * parseFloat(e.bet_size), 0)
  const avgMul = opened.length ? (opened.reduce((s, e) => s + parseFloat(e.multiplier), 0) / opened.length).toFixed(1) : '—'
  const profit = totalWon - startBal - totalCost
  const pending = entries.filter(e => !e.opened).length

  if (loading) return <div className="page"><p className="loading-pulse">A carregar hunts...</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="section-title">🎯 Bonus Hunt</div>
          <div className="section-sub">Regista e acompanha as tuas hunts em tempo real</div>
        </div>
        <button className="add-btn" onClick={() => setShowNewHunt(true)}>+ Nova Hunt</button>
      </div>
      {hunts.length === 0 ? (
        <div className="empty-state card"><span className="empty-icon">🎯</span><p>Ainda não tens nenhuma hunt. Cria a primeira!</p></div>
      ) : (
        <>
          <div className="tabs">
            {hunts.map((h, i) => <button key={h.id} className={`tab-btn ${i === activeIdx ? 'active' : ''}`} onClick={() => setActiveIdx(i)}>{h.name}</button>)}
          </div>
          <div className="stats-grid">
            {[['Saldo Inicial', `€${startBal}`, ''], ['Custo Total', `€${fmt(totalCost, 0)}`, ''], ['Break-Even', `${beMul}x`, ''], ['Média Atual', `${avgMul}x`, ''], ['Total Ganho', `€${fmt(totalWon, 0)}`, ''], ['Resultado', `${profit >= 0 ? '+' : ''}€${fmt(profit, 0)}`, profit >= 0 ? 'green' : 'red'], ['Por Abrir', `${pending}`, '']].map(([l, v, c]) => (
              <div key={l} className="stat-box"><div className="stat-label">{l}</div><div className={`stat-value ${c}`}>{v}</div></div>
            ))}
          </div>
          {entries.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>
                <span>PROGRESSO ({opened.length}/{entries.length})</span>
                <span>{entries.length ? Math.round(opened.length / entries.length * 100) : 0}%</span>
              </div>
              <div className="progress-wrap"><div className="progress-bar" style={{ width: `${entries.length ? opened.length / entries.length * 100 : 0}%` }} /></div>
            </div>
          )}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{entries.length} entradas</span>
              <button className="add-btn" onClick={() => setShowAdd(true)}>+ Slot</button>
            </div>
            {entries.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">🎰</span><p>Adiciona slots à hunt</p></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>Slot</th><th>Bet</th><th>Multiplier</th><th>Ganho</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {entries.map(e => (
                      <tr key={e.id} style={{ opacity: e.opened ? 0.65 : 1 }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{e.slot_emoji || '🎰'}</span>
                            <div><div style={{ fontWeight: 500 }}>{e.slot_name}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.slot_provider}</div></div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--gold)' }}>€{e.bet_size}</td>
                        <td><input className="multi-input" type="number" placeholder="0" defaultValue={e.multiplier || ''} onBlur={ev => updateMultiplier(e.id, ev.target.value)} /></td>
                        <td>{e.multiplier ? `€${(parseFloat(e.multiplier) * parseFloat(e.bet_size)).toFixed(2)}` : '—'}</td>
                        <td>
                          <button onClick={() => toggleOpened(e.id, e.opened)} style={{ background: e.opened ? 'rgba(0,230,122,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${e.opened ? 'rgba(0,230,122,0.25)' : 'var(--border)'}`, borderRadius: 6, color: e.opened ? 'var(--green)' : 'var(--muted)', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>
                            {e.opened ? '✓ Aberto' : 'Pendente'}
                          </button>
                        </td>
                        <td><button className="danger-btn" onClick={() => removeEntry(e.id)}>✕</button></td>
                      </tr>
                    ))}
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
            <h3>Nova Hunt</h3>
            <div className="form-group"><label className="form-label">Nome</label><input className="form-input" placeholder="Hunt #1" value={newHuntForm.name} onChange={e => setNewHuntForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Saldo Inicial (€)</label><input className="form-input" type="number" value={newHuntForm.startBalance} onChange={e => setNewHuntForm(f => ({ ...f, startBalance: e.target.value }))} /></div>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setShowNewHunt(false)}>Cancelar</button>
              <button className="add-btn" onClick={createHunt} disabled={saving}>Criar</button>
            </div>
          </div>
        </div>
      )}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <h3>Adicionar Slot</h3>
            <div className="form-group">
              <label className="form-label">Slot</label>
              <select className="filter-select" style={{ width: '100%' }} value={newSlot.slotIdx} onChange={e => setNewSlot(s => ({ ...s, slotIdx: e.target.value }))}>
                {SLOTS_DATA.map((s, i) => <option key={i} value={i}>{s.emoji} {s.name} — {s.provider}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Bet Size (€)</label><input className="form-input" type="number" step="0.1" value={newSlot.betSize} onChange={e => setNewSlot(s => ({ ...s, betSize: e.target.value }))} /></div>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setShowAdd(false)}>Cancelar</button>
              <button className="add-btn" onClick={addEntry} disabled={saving}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OpeningsTab({ user }) {
  const [sessions, setSessions] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showNewSession, setShowNewSession] = useState(false)
  const [newOpening, setNewOpening] = useState({ slotIdx: 0, multiplier: '' })
  const [newSession, setNewSession] = useState({ startBalance: '300', betSize: '1' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadSessions() }, [user])

  const loadSessions = async () => {
    setLoading(true)
    const { data } = await supabase.from('opening_sessions').select('*, openings(*)').eq('user_id', user.id).order('created_at', { ascending: false })
    setSessions(data || [])
    setLoading(false)
  }

  const createSession = async () => {
    setSaving(true)
    await supabase.from('opening_sessions').insert({ user_id: user.id, date: new Date().toISOString().split('T')[0], start_balance: parseFloat(newSession.startBalance), bet_size: parseFloat(newSession.betSize) })
    await loadSessions(); setActiveIdx(0); setSaving(false); setShowNewSession(false)
  }

  const addOpening = async () => {
    if (!newOpening.multiplier) return
    const slot = SLOTS_DATA[parseInt(newOpening.slotIdx)]
    const session = sessions[activeIdx]
    setSaving(true)
    await supabase.from('openings').insert({ session_id: session.id, slot_name: slot.name, slot_emoji: slot.emoji, slot_provider: slot.provider, slot_volatility: slot.volatility, multiplier: parseFloat(newOpening.multiplier) })
    await loadSessions(); setSaving(false); setShowAdd(false); setNewOpening({ slotIdx: 0, multiplier: '' })
  }

  const removeOpening = async (id) => {
    await supabase.from('openings').delete().eq('id', id)
    setSessions(ss => ss.map(s => ({ ...s, openings: s.openings.filter(o => o.id !== id) })))
  }

  const session = sessions[activeIdx]
  const ops = session?.openings || []
  const bet = parseFloat(session?.bet_size) || 1
  const totalWon = ops.reduce((s, o) => s + parseFloat(o.multiplier) * bet, 0)
  const avgMul = ops.length ? (ops.reduce((s, o) => s + parseFloat(o.multiplier), 0) / ops.length).toFixed(1) : '—'
  const best = ops.length ? ops.reduce((a, b) => parseFloat(b.multiplier) > parseFloat(a.multiplier) ? b : a) : null
  const profit = totalWon - parseFloat(session?.start_balance || 0)

  if (loading) return <div className="page"><p className="loading-pulse">A carregar sessões...</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="section-title">📊 Bonus Openings</div>
          <div className="section-sub">Regista multiplicadores e acompanha a tua sessão</div>
        </div>
        <button className="add-btn" onClick={() => setShowNewSession(true)}>+ Nova Sessão</button>
      </div>
      {sessions.length === 0 ? (
        <div className="empty-state card"><span className="empty-icon">📊</span><p>Cria a tua primeira sessão de openings</p></div>
      ) : (
        <>
          <div className="tabs">
            {sessions.map((s, i) => <button key={s.id} className={`tab-btn ${i === activeIdx ? 'active' : ''}`} onClick={() => setActiveIdx(i)}>{s.date}</button>)}
          </div>
          <div className="stats-grid">
            {[['Saldo Inicial', `€${session?.start_balance}`, ''], ['Bet', `€${session?.bet_size}`, ''], ['Openings', `${ops.length}`, ''], ['Média Multi', `${avgMul}x`, ''], ['Total Ganho', `€${fmt(totalWon, 0)}`, ''], ['Resultado', `${profit >= 0 ? '+' : ''}€${fmt(profit, 0)}`, profit >= 0 ? 'green' : 'red']].map(([l, v, c]) => (
              <div key={l} className="stat-box"><div className="stat-label">{l}</div><div className={`stat-value ${c}`}>{v}</div></div>
            ))}
          </div>
          {best && (
            <div style={{ background: 'rgba(255,190,0,0.05)', border: '1px solid rgba(255,190,0,0.13)', borderRadius: 10, padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <span style={{ fontSize: 20 }}>⭐</span>
              <span><strong style={{ color: 'var(--gold)' }}>Best:</strong> {best.slot_name} — <strong style={{ color: 'var(--gold)' }}>{best.multiplier}x</strong> (€{fmt(parseFloat(best.multiplier) * bet)})</span>
            </div>
          )}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{ops.length} opening{ops.length !== 1 ? 's' : ''}</span>
              <button className="add-btn" onClick={() => setShowAdd(true)}>+ Registar</button>
            </div>
            {ops.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">🎰</span><p>Regista os teus bonuses aqui</p></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>#</th><th>Slot</th><th>Multiplier</th><th>Payout</th><th></th></tr></thead>
                  <tbody>
                    {ops.map((o, idx) => (
                      <tr key={o.id}>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{o.slot_emoji || '🎰'}</span>
                            <div>
                              <div style={{ fontWeight: 500 }}>{o.slot_name}</div>
                              {best?.id === o.id && <span style={{ fontSize: 10, color: 'var(--gold)' }}>⭐ BEST</span>}
                            </div>
                          </div>
                        </td>
                        <td><span style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: parseFloat(o.multiplier) >= 100 ? 'var(--green)' : parseFloat(o.multiplier) >= 50 ? 'var(--gold)' : 'var(--text)' }}>{o.multiplier}x</span></td>
                        <td style={{ color: 'var(--green)' }}>€{fmt(parseFloat(o.multiplier) * bet)}</td>
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
            <h3>Nova Sessão</h3>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Saldo Inicial (€)</label><input className="form-input" type="number" value={newSession.startBalance} onChange={e => setNewSession(s => ({ ...s, startBalance: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Bet Size (€)</label><input className="form-input" type="number" step="0.1" value={newSession.betSize} onChange={e => setNewSession(s => ({ ...s, betSize: e.target.value }))} /></div>
            </div>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setShowNewSession(false)}>Cancelar</button>
              <button className="add-btn" onClick={createSession} disabled={saving}>Criar</button>
            </div>
          </div>
        </div>
      )}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <h3>Registar Opening</h3>
            <div className="form-group">
              <label className="form-label">Slot</label>
              <select className="filter-select" style={{ width: '100%' }} value={newOpening.slotIdx} onChange={e => setNewOpening(s => ({ ...s, slotIdx: e.target.value }))}>
                {SLOTS_DATA.map((s, i) => <option key={i} value={i}>{s.emoji} {s.name} — {s.provider}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Multiplicador (x)</label><input className="form-input" type="number" step="0.1" placeholder="ex: 45.5" value={newOpening.multiplier} onChange={e => setNewOpening(s => ({ ...s, multiplier: e.target.value }))} /></div>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setShowAdd(false)}>Cancelar</button>
              <button className="add-btn" onClick={addOpening} disabled={saving || !newOpening.multiplier}>Registar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TournamentTab({ user }) {
  const [tournaments, setTournaments] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [size, setSize] = useState(8)
  const [tournamentName, setTournamentName] = useState('')
  const [editingPos, setEditingPos] = useState(null)

  useEffect(() => { loadTournaments() }, [user])

  const loadTournaments = async () => {
    setLoading(true)
    const { data } = await supabase.from('tournaments').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setTournaments(data || [])
    setLoading(false)
  }

  const createTournament = async () => {
    await supabase.from('tournaments').insert({ user_id: user.id, name: tournamentName || `Torneio #${tournaments.length + 1}`, size, bracket: { assignments: {}, scores: {} } })
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
    const shuffled = [...SLOTS_DATA].sort(() => Math.random() - 0.5).slice(0, t.size)
    const assignments = {}
    shuffled.forEach((s, i) => { assignments[i] = { name: s.name, emoji: s.emoji } })
    updateBracket({ assignments, scores: {} })
  }

  const assignSlot = (pos, slot) => {
    const t = tournaments[activeIdx]
    const assignments = { ...(t.bracket?.assignments || {}), [pos]: { name: slot.name, emoji: slot.emoji } }
    updateBracket({ assignments })
    setEditingPos(null)
  }

  const setWinner = (key, player) => {
    const t = tournaments[activeIdx]
    const scores = { ...(t.bracket?.scores || {}), [key]: player }
    updateBracket({ scores })
  }

  if (loading) return <div className="page"><p className="loading-pulse">A carregar torneios...</p></div>

  const tournament = tournaments[activeIdx]

  const renderBracket = (t) => {
    const assignments = t.bracket?.assignments || {}
    const scores = t.bracket?.scores || {}
    const rounds = Math.log2(t.size)
    const roundNames = ['Eliminatórias', 'Oitavos', 'Quartos', 'Meias-Final', 'Final']

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
                <div className="round-label">{roundNames[rIdx] || `Ronda ${rIdx + 1}`}</div>
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
                          return (
                            <div key={pi} className={`matchup-slot ${isW ? 'winner' : ''} ${isL ? 'loser' : ''}`}
                              onClick={() => {
                                if (!slot && rIdx === 0) setEditingPos(mIdx * 2 + pi)
                                else if (!winner && slot) setWinner(key, player)
                              }}>
                              <span style={{ fontSize: 16 }}>{slot?.emoji || '❓'}</span>
                              <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{slot?.name || (rIdx === 0 ? 'Clica para definir' : 'Aguarda...')}</span>
                              {isW && <span>👑</span>}
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
            <div className="round-label">🏆 Campeão</div>
            <div style={{ paddingTop: Math.pow(2, rounds - 1) * 90 / 2 - 44 }}>
              {(() => {
                const w = scores[`${rounds - 1}-0`]
                const champ = w ? getP(rounds - 1, 0, w === 'p1' ? 0 : 1) : null
                return (
                  <div className="champion-box">
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{champ?.emoji || '❓'}</div>
                    <div className="champion-label">CAMPEÃO</div>
                    <div className="champion-name">{champ?.name || 'Por decidir'}</div>
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
          <div className="section-sub">Brackets de eliminação entre slots</div>
        </div>
        <button className="add-btn" onClick={() => setCreating(true)}>+ Novo Torneio</button>
      </div>
      {tournaments.length === 0 ? (
        <div className="empty-state card"><span className="empty-icon">🏆</span><p>Cria o teu primeiro torneio!</p></div>
      ) : (
        <>
          <div className="tabs">
            {tournaments.map((t, i) => <button key={t.id} className={`tab-btn ${i === activeIdx ? 'active' : ''}`} onClick={() => setActiveIdx(i)}>{t.name}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="add-btn" onClick={randomize}>🎲 Sortear Slots</button>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Clica nas slots para votar o vencedor</span>
          </div>
          <div className="card">{tournament && renderBracket(tournament)}</div>
        </>
      )}
      {creating && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCreating(false)}>
          <div className="modal">
            <h3>Novo Torneio</h3>
            <div className="form-group"><label className="form-label">Nome</label><input className="form-input" placeholder="Torneio de Abril" value={tournamentName} onChange={e => setTournamentName(e.target.value)} /></div>
            <div className="form-group">
              <label className="form-label">Nº de Slots</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {[4, 8, 16].map(n => (
                  <button key={n} onClick={() => setSize(n)} style={{ flex: 1, background: size === n ? 'rgba(255,190,0,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${size === n ? 'rgba(255,190,0,0.4)' : 'var(--border)'}`, borderRadius: 8, color: size === n ? 'var(--gold)' : 'var(--muted)', fontFamily: "'Bebas Neue'", fontSize: 24, padding: '12px', cursor: 'pointer' }}>{n}</button>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setCreating(false)}>Cancelar</button>
              <button className="add-btn" onClick={createTournament}>Criar</button>
            </div>
          </div>
        </div>
      )}
      {editingPos !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingPos(null)}>
          <div className="modal">
            <h3>Escolher Slot</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, maxHeight: 360, overflowY: 'auto' }}>
              {SLOTS_DATA.map((s, i) => (
                <div key={i} onClick={() => assignSlot(editingPos, s)} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,190,0,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                  <span style={{ fontSize: 17 }}>{s.emoji}</span>
                  <div><div style={{ fontWeight: 500 }}>{s.name}</div><div style={{ fontSize: 10, color: 'var(--muted)' }}>{s.provider}</div></div>
                </div>
              ))}
            </div>
            <div className="modal-actions"><button className="ghost-btn" onClick={() => setEditingPos(null)}>Fechar</button></div>
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setCheckingAuth(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const logout = async () => { await supabase.auth.signOut(); setUser(null) }

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
        <div className="user-pill" onClick={logout} title="Clica para sair">
          <div className="avatar">{user.email[0].toUpperCase()}</div>
          <span>{user.email.split('@')[0]}</span>
        </div>
      </div>
      {tab === 'randomizer' && <RandomizerTab />}
      {tab === 'hunt' && <BonusHuntTab user={user} />}
      {tab === 'openings' && <OpeningsTab user={user} />}
      {tab === 'tournament' && <TournamentTab user={user} />}
    </div>
  )
}
