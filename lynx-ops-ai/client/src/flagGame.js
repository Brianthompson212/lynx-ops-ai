export const GAME_EVENT_LABELS = {
  flagPull: 'Flag pull / tackle', td: 'Touchdown (TD)', extraPoint: 'Extra point', adjustment: 'Score adjustment',
}

export function makeGame() {
  return { id: crypto.randomUUID(), name: 'Game', opponent: 'Opponent', date: new Date().toLocaleDateString('en-CA'), events: [] }
}

export function gameScore(game) {
  return (game.events || []).reduce((score, event) => {
    if (!event.voided) score[event.side] += event.points
    return score
  }, { own: 0, opponent: 0 })
}

export function saveGameEvent(game, input, players, clock) {
  if (!Object.hasOwn(GAME_EVENT_LABELS, input.type) || !['own', 'opponent'].includes(input.side)) throw new Error('Choose a valid category and team.')
  const points = input.type === 'flagPull' ? 0 : Number(input.points)
  if (input.type !== 'flagPull' && String(input.points).trim() === '') throw new Error('Enter a point value.')
  if (!Number.isInteger(points) || Math.abs(points) > 999 || (input.type !== 'adjustment' && points < 0)) throw new Error('Enter whole points from 0 to 999, or a negative value for an adjustment.')
  const previous = (game.events || []).find((event) => event.id === input.id)
  const hasCredit = input.side === 'own' && input.type !== 'adjustment'
  const playerId = hasCredit ? input.playerId || '' : ''
  const assistId = hasCredit ? input.assistId || '' : ''
  if (playerId && playerId === assistId) throw new Error('Choose a different player for the assist.')
  const findName = (id) => {
    if (!id) return ''
    const player = players.find((p) => p.id === id)
    if (player) return `${player.name}${player.number ? ` #${player.number}` : ''}`
    if (id === previous?.playerId) return previous.playerName
    if (id === previous?.assistId) return previous.assistName
    throw new Error('Choose a player from this team.')
  }
  const event = {
    id: previous?.id || crypto.randomUUID(), type: input.type, side: input.side, points,
    playerId, assistId, playerName: findName(playerId), assistName: findName(assistId),
    note: String(input.note || '').trim().slice(0, 300),
    clock: previous?.clock ?? clock, createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(), voided: previous?.voided || false,
  }
  const next = { ...game, events: previous ? game.events.map((item) => item.id === event.id ? event : item) : [...(game.events || []), event] }
  if (Object.values(gameScore(next)).some((score) => score < 0)) throw new Error('That change would make a score negative. Adjust any related score corrections first.')
  return next
}

export function toggleGameEvent(game, eventId) {
  const next = { ...game, events: game.events.map((event) => event.id === eventId ? { ...event, voided: !event.voided, updatedAt: new Date().toISOString() } : event) }
  if (Object.values(gameScore(next)).some((score) => score < 0)) throw new Error('That change would make a score negative. Adjust any related score corrections first.')
  return next
}

export function gameStats(game, players) {
  const empty = (id, name, player) => ({ id, name, flagPull: 0, flagPullAssist: 0, td: 0, tdAssist: 0, extraPoint: 0, extraPointAssist: 0, points: 0, fieldSeconds: player?.fieldSeconds || 0, benchSeconds: player?.benchSeconds || 0 })
  const rows = new Map(players.map((p) => [p.id, empty(p.id, `${p.name}${p.number ? ` #${p.number}` : ''}`, p)]))
  const totals = empty('total', 'Team totals')
  for (const event of game.events || []) {
    if (event.voided || event.side !== 'own' || event.type === 'adjustment') continue
    totals[event.type]++
    totals.points += event.points
    if (event.assistId) totals[`${event.type}Assist`]++
    for (const [id, name, assist] of [[event.playerId, event.playerName, false], [event.assistId, event.assistName, true]]) {
      if (!id) continue
      if (!rows.has(id)) rows.set(id, empty(id, name || 'Former player'))
      const row = rows.get(id)
      row[`${event.type}${assist ? 'Assist' : ''}`]++
      if (!assist) row.points += event.points
    }
  }
  return { rows: [...rows.values()], totals }
}

export function archiveGame(team) {
  const current = team.game || makeGame()
  const saved = { ...current, endedAt: new Date().toISOString(), clock: team.clock, players: team.players.map((p) => ({ ...p })) }
  return { ...team, game: makeGame(), gameHistory: [...(team.gameHistory || []), saved], clock: 0, timerRunning: false, timerUpdatedAt: null,
    players: team.players.map((p) => ({ ...p, fieldSeconds: 0, benchSeconds: 0 })) }
}
