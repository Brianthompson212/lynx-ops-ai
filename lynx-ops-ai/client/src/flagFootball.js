import { makeGame } from './flagGame.js'

export const FLAG_STORAGE_KEY = 'lynx-flag-football-v1'
export const OFFENSE_ROLES = ['X', 'Y', 'Z', 'C', 'Q']
export const DEFENSE_ROLES = ['FS', 'SS', 'RCB', 'LCB', 'RLB', 'LLB']
export const ROUTE_COLORS = ['#ffd54a', '#6de4ff', '#ff9ab5', '#a9ef82', '#d2b4ff', '#ffffff']

export function makeFormation(name, side, roles) {
  const allowed = side === 'offense' ? OFFENSE_ROLES : DEFENSE_ROLES
  if (roles.length !== 5 || new Set(roles).size !== 5 || roles.some((role) => !allowed.includes(role))) throw new Error('A 5v5 formation must have five unique positions.')
  const locations = side === 'offense'
    ? [[12, 63], [32, 63], [88, 63], [50, 63], [50, 83]]
    : [[50, 23], [28, 30], [84, 52], [16, 52], [67, 45], [34, 45]]
  const allRoles = side === 'offense' ? OFFENSE_ROLES : DEFENSE_ROLES
  return {
    id: crypto.randomUUID(), name, side,
    spots: roles.map((role) => ({ role, x: locations[allRoles.indexOf(role)][0], y: locations[allRoles.indexOf(role)][1] })),
  }
}

export function makeTeam(name) {
  const offense = makeFormation('Base offense', 'offense', OFFENSE_ROLES)
  return {
    id: crypto.randomUUID(), name, players: [], formations: [offense],
    side: 'offense', formationIds: { offense: offense.id, defense: '' }, assignments: {},
    plays: [], selectedPlayId: '', drives: [], selectedDriveId: '', selectedEntryId: '', clock: 0,
    game: makeGame(), gameHistory: [],
  }
}

export function makeBoard() {
  const teams = [makeTeam('Team 1'), makeTeam('Team 2')]
  return { version: 1, teams, selectedTeamId: teams[0].id }
}

export function makePlayer(name, number = '') {
  return { id: crypto.randomUUID(), name, number, available: true, roles: [], fieldSeconds: 0, benchSeconds: 0 }
}

export function activePlayerIds(team) {
  const formation = team.formations.find((item) => item.id === team.formationIds[team.side])
  const assignments = team.assignments[formation?.id] || {}
  return new Set((formation?.spots || []).map(({ role }) => assignments[role]).filter((id) => team.players.some((p) => p.id === id && p.available)))
}

// Every formation has one player per spot and a player can occupy only one spot.
export function assignPlayer(team, formationId, role, playerId) {
  const formation = team.formations.find((item) => item.id === formationId)
  if (!formation?.spots.some((spot) => spot.role === role)) return team
  if (playerId && !team.players.some((p) => p.id === playerId && p.available)) return team
  const next = { ...(team.assignments[formationId] || {}) }
  Object.keys(next).forEach((key) => { if (next[key] === playerId) delete next[key] })
  if (playerId) next[role] = playerId
  else delete next[role]
  return { ...team, assignments: { ...team.assignments, [formationId]: next } }
}

export function tickTeam(team, seconds) {
  const active = activePlayerIds(team)
  return {
    ...team, clock: team.clock + seconds,
    players: team.players.map((p) => !p.available ? p : {
      ...p,
      fieldSeconds: p.fieldSeconds + (active.has(p.id) ? seconds : 0),
      benchSeconds: p.benchSeconds + (active.has(p.id) ? 0 : seconds),
    }),
  }
}

// Persist the time anchor so navigation, browser throttling and reloads cannot pause a game.
export function settleTeamClock(team, now = Date.now()) {
  if (!team.timerRunning || !Number.isFinite(team.timerUpdatedAt)) return team
  const seconds = Math.max(0, Math.floor((now - team.timerUpdatedAt) / 1000))
  if (!seconds) return team
  return { ...tickTeam(team, seconds), timerUpdatedAt: team.timerUpdatedAt + seconds * 1000 }
}

export function setTeamClockRunning(team, running, now = Date.now()) {
  const settled = settleTeamClock(team, now)
  return { ...settled, timerRunning: running, timerUpdatedAt: running && team.timerRunning ? settled.timerUpdatedAt : now }
}

export function selectPlay(team, playId, entryId = '') {
  const play = team.plays.find((item) => item.id === playId)
  const formation = team.formations.find((item) => item.id === play?.formationId)
  if (!formation) return team
  return { ...team, selectedPlayId: playId, selectedEntryId: entryId, side: formation.side,
    formationIds: { ...team.formationIds, [formation.side]: formation.id } }
}

export function makePlay(team, formationId) {
  const formation = team.formations.find((f) => f.id === formationId)
  if (!formation || team.plays.length >= 20) return null
  const number = Array.from({ length: 20 }, (_, i) => i + 1).find((n) => !team.plays.some((p) => p.number === n))
  return { id: crypto.randomUUID(), number, name: `Play ${number}`, formationId, spots: formation.spots.map((s) => ({ ...s })), routes: {}, notes: '' }
}

export function makeDriveEntry(play) {
  return { id: crypto.randomUUID(), playId: play.id, action: '', actionMeaning: '', motion: '', target: play.spots[0].role, routes: {} }
}

export function callLabel(play, entry) {
  return [play?.name || 'Missing play', entry?.action, entry?.motion ? `${entry.motion} ${entry.target}`.trim() : ''].filter(Boolean).join(', ')
}

export function duration(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function openUploads() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('lynx-flag-uploads', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('files')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function putUpload(id, file) {
  const db = await openUploads()
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('files', 'readwrite')
      transaction.objectStore('files').put(file, id)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error || new Error('Upload cancelled'))
    })
  } finally { db.close() }
}

export async function getUpload(id) {
  const db = await openUploads()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('files').objectStore('files').get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally { db.close() }
}
