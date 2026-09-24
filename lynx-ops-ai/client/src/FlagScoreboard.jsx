import { useState } from 'react'
import { GAME_EVENT_LABELS, gameScore, gameStats, saveGameEvent, toggleGameEvent, archiveGame } from './flagGame'
import { duration } from './flagFootball'

const statColumns = [
  ['flagPull', 'Flag pulls'], ['flagPullAssist', 'Pull assists'], ['td', 'TDs'], ['tdAssist', 'TD assists'],
  ['extraPoint', 'Extra points made'], ['extraPointAssist', 'XP assists'], ['points', 'Points'],
]

export default function FlagScoreboard({ team, updateTeam }) {
  const [selectedGameId, setSelectedGameId] = useState('')
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [showStats, setShowStats] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [correction, setCorrection] = useState(null)
  const game = (team.gameHistory || []).find((g) => g.id === selectedGameId) || team.game
  const archived = game.id !== team.game.id
  const players = archived ? game.players : team.players
  const score = gameScore(game)
  const stats = gameStats(game, players)

  function updateGame(change) {
    updateTeam((current) => {
      const transform = (g) => typeof change === 'function' ? change(g) : { ...g, ...change }
      return archived
        ? { ...current, gameHistory: current.gameHistory.map((g) => g.id === game.id ? transform(g) : g) }
        : { ...current, game: transform(current.game) }
    })
  }

  function beginEvent(type, side = 'own', points) {
    setError(''); setCorrection(null)
    setDraft({ type, side, points: points ?? (type === 'td' ? 6 : type === 'extraPoint' ? 1 : 0), playerId: '', assistId: '', note: '' })
  }

  function saveEvent() {
    try {
      const next = saveGameEvent(game, draft, players, archived ? game.clock : team.clock)
      updateGame(next); setDraft(null); setError('')
    } catch (err) { setError(err.message) }
  }

  function correctScore() {
    try {
      const target = Number(correction.total)
      if (String(correction.total).trim() === '' || !Number.isInteger(target) || target < 0 || target > 999) throw new Error('Enter the corrected score from 0 to 999.')
      const next = saveGameEvent(game, { type: 'adjustment', side: correction.side, points: target - score[correction.side], note: correction.note || 'Manual score correction' }, players, archived ? game.clock : team.clock)
      updateGame(next); setCorrection(null); setError('')
    } catch (err) { setError(err.message) }
  }

  function downloadStats() {
    const lines = [
      `${team.name} — ${game.name} (${game.date})`, `${team.name} ${score.own} – ${game.opponent} ${score.opponent}`,
      '', 'PLAYER STATS', 'Assists are tracked separately and do not add scoreboard points.',
      ...[...stats.rows, stats.totals].map((row) => `${row.name}: ${statColumns.map(([key, label]) => `${label} ${row[key]}`).join(' | ')}${row.id !== 'total' ? ` | In ${duration(row.fieldSeconds)} | Sit ${duration(row.benchSeconds)}` : ''}`),
      '', 'GAME LOG (removed entries excluded from totals)',
      ...game.events.map((event) => `${duration(event.clock)} | ${event.voided ? 'REMOVED | ' : ''}${event.side === 'own' ? team.name : game.opponent} | ${GAME_EVENT_LABELS[event.type]} | ${event.points} points | Credit: ${event.playerName || 'Unassigned'} | Assist: ${event.assistName || 'None'}${event.note ? ` | ${event.note}` : ''}`),
    ]
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url; link.download = `lynx-game-stats-${game.date}.txt`; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const creditPlayers = [...players]
  for (const [id, name] of [[draft?.playerId, draft?.playerName], [draft?.assistId, draft?.assistName]]) {
    if (id && !creditPlayers.some((p) => p.id === id)) creditPlayers.push({ id, name: name || 'Former player' })
  }

  return <section className="ff-scoring" aria-label="Scoreboard and game stats">
    <div className="ff-score-heading">
      <h3>{archived ? 'Saved game' : 'Live scoreboard'}</h3>
      <label>Game<select aria-label="Scoreboard game" value={archived ? game.id : ''} onChange={(e) => {
        setSelectedGameId(e.target.value); setDraft(null); setCorrection(null); setError('')
      }}><option value="">Current game</option>{(team.gameHistory || []).slice().reverse().map((g) => <option key={g.id} value={g.id}>{g.date} · {g.name} vs {g.opponent}</option>)}</select></label>
    </div>
    <div className="ff-score-display" aria-live="polite">
      <div><span>{team.name}</span><strong aria-label={`${team.name} score`}>{score.own}</strong></div>
      <span className="ff-score-vs">vs</span>
      <div><span>{game.opponent || 'Opponent'}</span><strong aria-label="Opponent score">{score.opponent}</strong></div>
    </div>
    <div className="ff-score-actions">
      <button type="button" onClick={() => beginEvent('flagPull')}>+ Flag pull / tackle</button>
      <button type="button" onClick={() => beginEvent('td')}>+ TD</button>
      <button type="button" onClick={() => beginEvent('extraPoint', 'own', 1)}>+ 1-point conversion</button>
      <button type="button" onClick={() => beginEvent('extraPoint', 'own', 2)}>+ 2-point conversion</button>
      <button type="button" onClick={() => beginEvent('td', 'opponent')}>+ Opponent score</button>
      <button type="button" onClick={() => { setDraft(null); setError(''); setCorrection({ side: 'own', total: score.own, note: '' }) }}>Correct score</button>
    </div>
    <div className="ff-row">
      <button type="button" aria-expanded={showLog} onClick={() => setShowLog(!showLog)}>Game log ({game.events.filter((e) => !e.voided).length})</button>
      <button type="button" aria-expanded={showStats} onClick={() => setShowStats(!showStats)}>Player stats</button>
      <button type="button" onClick={downloadStats}>Download post-game report</button>
    </div>
    {error && <p className="ff-error" role="alert">{error}</p>}
    {draft && <div className="ff-panel" role="group" aria-label="Record game event">
      <h4>{draft.id ? 'Edit game entry' : 'Record game entry'}</h4>
      <div className="ff-row">
        <label>Category<select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value, points: e.target.value === 'td' ? 6 : e.target.value === 'extraPoint' ? 1 : 0 })}>{Object.entries(GAME_EVENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Credit team<select value={draft.side} onChange={(e) => setDraft({ ...draft, side: e.target.value, playerId: '', assistId: '' })}><option value="own">{team.name}</option><option value="opponent">{game.opponent || 'Opponent'}</option></select></label>
        {draft.type !== 'flagPull' && <label>Points<input type="number" step="1" min={draft.type === 'adjustment' ? -999 : 0} max="999" value={draft.points} onChange={(e) => setDraft({ ...draft, points: e.target.value })} /></label>}
      </div>
      {draft.side === 'own' && draft.type !== 'adjustment' && <div className="ff-row">
        <label>Player credit<select value={draft.playerId} onChange={(e) => setDraft({ ...draft, playerId: e.target.value, assistId: e.target.value === draft.assistId ? '' : draft.assistId })}><option value="">Unassigned / credit later</option>{creditPlayers.map((p) => <option key={p.id} value={p.id}>{p.name}{p.number ? ` #${p.number}` : ''}</option>)}</select></label>
        <label>Assist credit<select value={draft.assistId} onChange={(e) => setDraft({ ...draft, assistId: e.target.value })}><option value="">No assist</option>{creditPlayers.filter((p) => p.id !== draft.playerId).map((p) => <option key={p.id} value={p.id}>{p.name}{p.number ? ` #${p.number}` : ''}</option>)}</select></label>
      </div>}
      <label>Note / correction reason<input maxLength={300} value={draft.note} placeholder="e.g. TD overturned, penalty, credit changed" onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label>
      <p className="ff-hint">{draft.type === 'adjustment' ? 'Score adjustments change only the scoreboard. Edit or remove the original event to change player stats too.' : 'Player credit and assists count once per event. Assists do not add extra points to the score.'}</p>
      <div className="ff-row"><button type="button" onClick={saveEvent}>{draft.id ? 'Save changes' : 'Save entry'}</button><button type="button" onClick={() => { setDraft(null); setError('') }}>Cancel</button></div>
    </div>}
    {correction && <div className="ff-panel" role="group" aria-label="Correct scoreboard">
      <h4>Correct scoreboard</h4><div className="ff-row"><label>Team to correct<select value={correction.side} onChange={(e) => setCorrection({ ...correction, side: e.target.value, total: score[e.target.value] })}><option value="own">{team.name}</option><option value="opponent">{game.opponent || 'Opponent'}</option></select></label>
        <label>Corrected score<input type="number" min="0" max="999" step="1" value={correction.total} onChange={(e) => setCorrection({ ...correction, total: e.target.value })} /></label></div>
      <label>Correction reason<input maxLength={300} value={correction.note} placeholder="Penalty or changed call" onChange={(e) => setCorrection({ ...correction, note: e.target.value })} /></label>
      <p className="ff-hint">This changes only the score. To reverse a TD or extra point and its player credit, use Remove in the game log.</p>
      <div className="ff-row"><button type="button" onClick={correctScore}>Save corrected score</button><button type="button" onClick={() => { setCorrection(null); setError('') }}>Cancel</button></div>
    </div>}
    {showLog && <div className="ff-panel"><h4>Game log · edit, remove, or restore a call</h4>
      {!game.events.length && <p>No entries yet. Record a score or flag pull above.</p>}
      <ol className="ff-game-log">{game.events.slice().reverse().map((event) => <li className={event.voided ? 'ff-voided' : ''} key={event.id}>
        <div><strong>{GAME_EVENT_LABELS[event.type]} · {event.side === 'own' ? team.name : game.opponent} {event.voided ? '· Removed' : ''}</strong>
          <p>{duration(event.clock)} · {event.points > 0 ? '+' : ''}{event.points} points{event.playerId ? ` · ${event.playerName}` : event.side === 'own' && event.type !== 'adjustment' ? ' · Credit unassigned' : ''}{event.assistId ? ` · Assist: ${event.assistName}` : ''}</p>{event.note && <p>{event.note}</p>}</div>
        <div className="ff-row"><button type="button" aria-label={`Edit ${GAME_EVENT_LABELS[event.type]} at ${duration(event.clock)}`} onClick={() => { setDraft({ ...event }); setCorrection(null); setError('') }}>Edit</button>
          <button type="button" aria-label={`${event.voided ? 'Restore' : 'Remove'} ${GAME_EVENT_LABELS[event.type]} at ${duration(event.clock)}`} onClick={() => {
            try { updateGame(toggleGameEvent(game, event.id)); setDraft(null); setError('') } catch (err) { setError(err.message) }
          }}>{event.voided ? 'Restore' : 'Remove'}</button></div>
      </li>)}</ol>
    </div>}
    {showStats && <div className="ff-panel"><h4>{team.name} · {game.name} player stats</h4><p className="ff-hint">Extra points made counts successful conversions; Points uses their actual value. Unassigned events appear in team totals. Score-only adjustments are excluded from player stats.</p>
      <div className="ff-stats-scroll" tabIndex="0" role="region" aria-label="Player statistics table"><table className="ff-stats-table"><thead><tr><th scope="col">Player</th>{statColumns.map(([key, label]) => <th scope="col" key={key}>{label}</th>)}<th scope="col">Time in</th><th scope="col">Time sitting</th></tr></thead>
        <tbody>{stats.rows.map((row) => <tr key={row.id}><th scope="row">{row.name}</th>{statColumns.map(([key]) => <td key={key}>{row[key]}</td>)}<td>{duration(row.fieldSeconds)}</td><td>{duration(row.benchSeconds)}</td></tr>)}</tbody>
        <tfoot><tr><th scope="row">Team totals</th>{statColumns.map(([key]) => <td key={key}>{stats.totals[key]}</td>)}<td>—</td><td>—</td></tr></tfoot></table></div>
    </div>}
    <details className="ff-game-settings"><summary>Game details &amp; {archived ? 'saved result' : 'finish game'}</summary><div className="ff-row">
      <label>Game label<input value={game.name} maxLength={80} onChange={(e) => updateGame({ name: e.target.value })} /></label><label>Opponent name<input value={game.opponent} maxLength={60} onChange={(e) => updateGame({ opponent: e.target.value })} /></label><label>Game date<input type="date" value={game.date} onChange={(e) => updateGame({ date: e.target.value })} /></label>
    </div>{!archived && <><p className="ff-hint">Finish saves this game’s score, stats, and playing times, then starts a fresh game. Rosters, formations, and plays stay ready.</p><button type="button" onClick={() => {
      if (!window.confirm('Save this game and start a new one with scores, stats, and timers at zero?')) return
      updateTeam(archiveGame); setDraft(null); setCorrection(null); setError(''); setShowStats(false); setShowLog(false)
    }}>Finish game &amp; start next</button></>}</details>
  </section>
}
