import test from 'node:test'
import assert from 'node:assert/strict'
import { makeGame, gameScore, gameStats, saveGameEvent, toggleGameEvent, archiveGame } from '../src/flagGame.js'
import { makeTeam, makePlayer } from '../src/flagFootball.js'

const players = [makePlayer('Avery', '1'), makePlayer('Blake', '2')]
const credited = { side: 'own', playerId: players[0].id, assistId: players[1].id }

test('TD, conversions and flag pulls credit players and category-specific assists without duplicate points', () => {
  let game = makeGame()
  for (const [type, points] of [['td', 6], ['extraPoint', 2], ['flagPull', 0]]) game = saveGameEvent(game, { ...credited, type, points }, players, 30)
  assert.deepEqual(gameScore(game), { own: 8, opponent: 0 })
  const { rows, totals } = gameStats(game, players)
  assert.equal(rows[0].td, 1)
  assert.equal(rows[0].extraPoint, 1)
  assert.equal(rows[0].flagPull, 1)
  assert.equal(rows[0].points, 8)
  assert.equal(rows[1].tdAssist, 1)
  assert.equal(rows[1].extraPointAssist, 1)
  assert.equal(rows[1].flagPullAssist, 1)
  assert.equal(rows[1].points, 0)
  assert.equal(totals.points, 8)
})

test('removing and restoring a call updates score and all player credits', () => {
  let game = saveGameEvent(makeGame(), { ...credited, type: 'td', points: 6 }, players, 12)
  const id = game.events[0].id
  game = toggleGameEvent(game, id)
  assert.equal(gameScore(game).own, 0)
  assert.equal(gameStats(game, players).rows[0].td, 0)
  assert.equal(gameStats(game, players).rows[1].tdAssist, 0)
  assert.equal(game.events.length, 1)
  game = toggleGameEvent(game, id)
  assert.equal(gameScore(game).own, 6)
  assert.equal(gameStats(game, players).rows[1].tdAssist, 1)
})

test('editing a scoring play replaces points and credits while retaining its timestamp', () => {
  let game = saveGameEvent(makeGame(), { ...credited, type: 'td', points: 6 }, players, 12)
  game = saveGameEvent(game, { ...game.events[0], type: 'extraPoint', points: 1, playerId: players[1].id, assistId: players[0].id }, players, 99)
  assert.equal(game.events.length, 1)
  assert.equal(game.events[0].clock, 12)
  assert.equal(gameScore(game).own, 1)
  const { rows } = gameStats(game, players)
  assert.equal(rows[0].td, 0)
  assert.equal(rows[1].tdAssist, 0)
  assert.equal(rows[1].extraPoint, 1)
  assert.equal(rows[0].extraPointAssist, 1)
})

test('opponent scoring and manual corrections do not inflate own player stats', () => {
  let game = saveGameEvent(makeGame(), { ...credited, type: 'td', points: 6 }, players, 1)
  game = saveGameEvent(game, { ...credited, side: 'opponent', type: 'td', points: 6 }, players, 2)
  game = saveGameEvent(game, { ...credited, type: 'adjustment', points: -2, note: 'Changed call' }, players, 3)
  assert.deepEqual(gameScore(game), { own: 4, opponent: 6 })
  assert.equal(gameStats(game, players).rows[0].points, 6)
  assert.equal(game.events[1].playerId, '')
  assert.equal(game.events[2].assistId, '')
  assert.throws(() => toggleGameEvent(game, game.events[0].id), /negative/)
  assert.throws(() => saveGameEvent(game, { side: 'own', type: 'adjustment', points: -5 }, players, 4), /negative/)
})

test('blank, fractional and invalid credits are rejected', () => {
  const game = makeGame()
  for (const points of ['', ' ', 1.5, -6, 'nonsense']) assert.throws(() => saveGameEvent(game, { ...credited, type: 'td', points }, players, 0))
  assert.throws(() => saveGameEvent(game, { ...credited, type: 'td', points: 6, assistId: players[0].id }, players, 0), /different/)
  assert.throws(() => saveGameEvent(game, { ...credited, type: 'td', points: 6, playerId: 'other-team' }, players, 0), /this team/)
})

test('unassigned stats can be credited later, and removed players retain historical credit', () => {
  let game = saveGameEvent(makeGame(), { side: 'own', type: 'flagPull', points: 0 }, players, 0)
  assert.equal(gameStats(game, players).totals.flagPull, 1)
  assert.equal(gameStats(game, players).rows[0].flagPull, 0)
  game = saveGameEvent(game, { ...game.events[0], ...credited }, players, 0)
  const snapshot = JSON.parse(JSON.stringify(game))
  assert.equal(gameStats(snapshot, []).rows.find((row) => row.id === players[0].id).flagPull, 1)
  game = saveGameEvent(game, { ...game.events[0], note: 'Reviewed credit' }, [], 0)
  assert.equal(game.events[0].playerName, 'Avery #1')
})

test('finish game preserves stats and time, and starts fresh without touching roster or playbook', () => {
  const team = makeTeam('Gold')
  team.players = players.map((p) => ({ ...p, fieldSeconds: 20, benchSeconds: 10 }))
  team.clock = 30
  team.game = saveGameEvent(team.game, { ...credited, type: 'td', points: 6 }, team.players, 15)
  const next = archiveGame(team)
  assert.equal(next.gameHistory.length, 1)
  assert.equal(gameScore(next.gameHistory[0]).own, 6)
  assert.equal(next.gameHistory[0].players[0].fieldSeconds, 20)
  assert.equal(next.gameHistory[0].clock, 30)
  assert.equal(next.clock, 0)
  assert.equal(next.players[0].fieldSeconds, 0)
  assert.equal(gameScore(next.game).own, 0)
  assert.notEqual(next.game.id, team.game.id)
  assert.equal(next.formations, team.formations)
  assert.equal(next.plays, team.plays)
  assert.equal(makeTeam('Purple').game.events.length, 0)
})
import { settleTeamClock, setTeamClockRunning, assignPlayer } from '../src/flagFootball.js'

test('running clock survives reload, credits playing time and stops only explicitly', () => {
  let team = makeTeam('Gold')
  team.players = [makePlayer('Avery'), makePlayer('Blake')]
  team = assignPlayer(team, team.formationIds.offense, 'Q', team.players[0].id)
  team = setTeamClockRunning(team, true, 1000)
  team = settleTeamClock(JSON.parse(JSON.stringify(team)), 61500)
  assert.equal(team.clock, 60)
  assert.equal(team.players[0].fieldSeconds, 60)
  assert.equal(team.players[1].benchSeconds, 60)
  assert.equal(settleTeamClock(team, 61999).clock, 60)
  assert.equal(settleTeamClock(team, 62000).clock, 61)
  team = setTeamClockRunning(team, false, 63000)
  assert.equal(team.clock, 62)
  assert.equal(settleTeamClock(team, 999999).clock, 62)
  team = setTeamClockRunning(team, true, 1000000)
  assert.equal(settleTeamClock(team, 1003000).clock, 65)
})

test('team clocks are independent and finishing a game stops its timer', () => {
  const first = setTeamClockRunning(makeTeam('Gold'), true, 1000)
  const second = makeTeam('Purple')
  assert.equal(settleTeamClock(first, 21000).clock, 20)
  assert.equal(settleTeamClock(second, 21000).clock, 0)
  const finished = archiveGame(settleTeamClock(first, 21000))
  assert.equal(finished.gameHistory[0].clock, 20)
  assert.equal(finished.timerRunning, false)
  assert.equal(settleTeamClock(finished, 30000).clock, 0)
})
