import test from 'node:test'
import assert from 'node:assert/strict'
import { makeBoard, makePlayer, makeFormation, makePlay, makeDriveEntry, assignPlayer, activePlayerIds, tickTeam, selectPlay, callLabel, OFFENSE_ROLES } from '../src/flagFootball.js'

test('5v5 formations reject six positions and duplicate roles', () => {
  assert.throws(() => makeFormation('Invalid', 'defense', ['FS', 'SS', 'RCB', 'LCB', 'RLB', 'LLB']))
  assert.throws(() => makeFormation('Invalid', 'offense', ['X', 'X', 'Z', 'C', 'Q']))
  const formation = makeFormation('Two safeties', 'defense', ['FS', 'SS', 'RCB', 'LCB', 'RLB'])
  assert.equal(formation.spots.length, 5)
})

test('substitution replaces a player without changing routes; moving an active player vacates their old spot', () => {
  let team = makeBoard().teams[0]
  const players = ['A', 'B', 'C'].map((name) => makePlayer(name))
  team.players = players
  const formationId = team.formationIds.offense
  const play = makePlay(team, formationId)
  play.routes.X = [{ x: 12, y: 30 }]
  team.plays = [play]
  team = assignPlayer(team, formationId, 'X', players[0].id)
  team = assignPlayer(team, formationId, 'Y', players[1].id)
  team = assignPlayer(team, formationId, 'X', players[2].id)
  assert.deepEqual([...activePlayerIds(team)].sort(), [players[1].id, players[2].id].sort())
  assert.deepEqual(team.plays[0].routes.X, [{ x: 12, y: 30 }])
  team = assignPlayer(team, formationId, 'Q', players[1].id)
  assert.equal(team.assignments[formationId].Y, undefined)
  assert.equal(team.assignments[formationId].Q, players[1].id)
  assert.equal(assignPlayer(team, formationId, 'FS', players[0].id), team)
})

test('offense, defensive formations and teams retain independent assignments', () => {
  const board = makeBoard()
  let team = board.teams[0]
  const player = makePlayer('A')
  team.players = [player]
  const defense = makeFormation('Zone', 'defense', ['FS', 'RCB', 'LCB', 'RLB', 'LLB'])
  team.formations.push(defense)
  team.formationIds.defense = defense.id
  team = assignPlayer(team, team.formationIds.offense, 'Q', player.id)
  team = assignPlayer(team, defense.id, 'FS', player.id)
  assert.equal(team.assignments[team.formationIds.offense].Q, player.id)
  assert.equal(team.assignments[defense.id].FS, player.id)
  assert.deepEqual(board.teams[1].players, [])
  assert.deepEqual(board.teams[1].assignments, {})
  assert.notEqual(team.formations[0].id, board.teams[1].formations[0].id)
})

test('timer counts only the current formation and excludes absent players', () => {
  let team = makeBoard().teams[0]
  team.players = ['Active', 'Bench', 'Absent'].map((name) => makePlayer(name))
  team.players[2].available = false
  team = assignPlayer(team, team.formationIds.offense, 'X', team.players[0].id)
  const next = tickTeam(team, 12)
  assert.equal(next.clock, 12)
  assert.equal(next.players[0].fieldSeconds, 12)
  assert.equal(next.players[0].benchSeconds, 0)
  assert.equal(next.players[1].benchSeconds, 12)
  assert.equal(next.players[2].benchSeconds, 0)
  assert.equal(assignPlayer(team, team.formationIds.offense, 'Y', team.players[2].id), team)
})

test('playbook caps at 20 unique numbers and reuses a removed number', () => {
  const team = makeBoard().teams[0]
  for (let i = 0; i < 20; i++) team.plays.push(makePlay(team, team.formationIds.offense))
  assert.equal(makePlay(team, team.formationIds.offense), null)
  team.plays.splice(4, 1)
  assert.equal(makePlay(team, team.formationIds.offense).number, 5)
  assert.equal(new Set(team.plays.map((p) => p.number)).size, 19)
})

test('drive variants keep call routes independent and select the right formation', () => {
  const team = makeBoard().teams[0]
  const formation = makeFormation('Trips', 'offense', OFFENSE_ROLES)
  team.formations.push(formation)
  const play = makePlay(team, formation.id)
  team.plays.push(play)
  const first = makeDriveEntry(play)
  const second = makeDriveEntry(play)
  first.action = 'Fire'; first.motion = 'Mustard'; first.target = 'X'
  first.routes.X = [{ x: 50, y: 63 }]
  assert.equal(callLabel(play, first), 'Play 1, Fire, Mustard X')
  assert.deepEqual(second.routes, {})
  assert.deepEqual(play.routes, {})
  const selected = selectPlay(team, play.id, first.id)
  assert.equal(selected.selectedEntryId, first.id)
  assert.equal(selected.formationIds.offense, formation.id)
  assert.equal(selected.side, 'offense')
  play.spots[0].x = 22
  assert.equal(formation.spots[0].x, 12)
})
