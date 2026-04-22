const TOKEN = 'IvuIag2bF5MsL0X9GXOX9tia1ygZCFKKB6NPo8qzaI6f4yhvja'
const HOST = 'slot-lab.vercel.app'

export async function fetchSlots() {
  const allSlots = []
  let page = 1
  let lastPage = 1

  while (page <= lastPage && page <= 20) {
    const res = await fetch(
      `https://slotslaunch.com/api/games?token=${TOKEN}&page=${page}&per_page=150&published=1`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': HOST
        }
      }
    )
    if (!res.ok) break
    const data = await res.json()
    lastPage = data.meta?.last_page || 1
    allSlots.push(...(data.data || []))
    page++
  }

  return allSlots.map(s => ({
    id: s.id,
    name: s.name,
    provider: s.provider || 'Unknown',
    volatility: s.volatility ? s.volatility.charAt(0).toUpperCase() + s.volatility.slice(1) : 'Medium',
    max_win: s.max_win_per_spin || 0,
    rtp: s.rtp || 0,
    emoji: '🎰',
    theme: s.themes?.[0]?.name || 'Other',
    image: s.thumb || null,
    slug: s.slug,
  }))
}

export const PROVIDERS = []
export const VOLATILITIES = ["Low", "Medium", "High", "Very high"]
export const THEMES = []
