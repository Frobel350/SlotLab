export const VOLATILITIES = ["low", "medium", "high", "very high"]

export async function fetchSlots() {
  const allSlots = []
  let page = 1
  let lastPage = 1

  while (page <= lastPage) {
    const res = await fetch(
      `https://slotslaunch.com/api/games?page=${page}&per_page=150&published=1&type[]=2`,
      { headers: { 'Accept': 'application/json' } }
    )
    const data = await res.json()
    lastPage = data.meta.last_page
    allSlots.push(...data.data)
    page++
    if (page > 10) break // max 1500 slots
  }

  return allSlots.map(s => ({
    id: s.id,
    name: s.name,
    provider: s.provider,
    volatility: s.volatility ? s.volatility.charAt(0).toUpperCase() + s.volatility.slice(1) : 'Medium',
    max_win: s.max_win_per_spin || 0,
    rtp: s.rtp || 0,
    emoji: '🎰',
    theme: s.themes?.[0]?.name || 'Other',
    image: s.thumb || null,
    slug: s.slug,
  }))
}

export const SLOTS_DATA = [] // será preenchido via API
export const PROVIDERS = []
export const THEMES = []
