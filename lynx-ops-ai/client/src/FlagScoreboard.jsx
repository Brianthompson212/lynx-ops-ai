import { useState } from 'react'
import { GAME_EVENT_LABELS, gameScore, gameStats, saveGameEvent, toggleGameEvent, archiveGame } from './flagGame'
import { duration, activePlayerIds } from './flagFootball'
import FlagDialog from './FlagDialog'

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
  const [finishing, setFinishing] = useState(false)
  const [nextOpponent, setNextOpponent] = useState('')
  const [keepLineup, setKeepLineup] = useState(true)
  const [message, setMessage] = useState('')
  const active = activePlayerIds(team)
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
      updateGame(next); setDraft(null); setError(''); setMessage(draft.id ? 'Play updated.' : draft.type === 'flagPull' ? 'Flag pull recorded.' : 'Score added.')
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

  const creditPlayers = [...players].sort((a, b) => Number(active.has(b.id)) - Number(active.has(a.id)))
  for (const [id, name] of [[draft?.playerId, draft?.playerName], [draft?.assistId, draft?.assistName]]) {
    if (id && !creditPlayers.some((p) => p.id === id)) creditPlayers.push({ id, name: name || 'Former player' })
  }

  return <section className="ff-scoring" aria-label="Scoreboard and game stats">
    <div className="ff-score-heading">
      <h3>{archived ? 'Saved game' : 'Live scoreboard'}</h3>
      <label>Saved games<select aria-label="Scoreboard game" value={archived ? game.id : ''} onChange={(e) => {
        setSelectedGameId(e.target.value); setMessage(''); setDraft(null); setCorrection(null); setError('')
      }}><option value="">Live game</option>{(team.gameHistory || []).slice().reverse().map((g) => <option key={g.id} value={g.id}>{g.date} · {g.name} vs {g.opponent}</option>)}</select></label>
    </div>
    {archived && <div className="ff-notice">Viewing a saved game. <button type="button" onClick={() => { setSelectedGameId(''); setMessage(''); setShowStats(false); setShowLog(false) }}>Back to live game</button></div>}
    <div className="ff-score-display">
      {['own', 'opponent'].map((side, index) => <div key={side}>
        {index === 1 && <span className="ff-sr-only">versus</span>}
        <span>{side === 'own' ? team.name : game.opponent || 'Opponent'}</span>
        <strong aria-label={side === 'own' ? team.name + ' score' : 'Opponent score'}>{score[side]}</strong>
        <button type="button" onClick={() => beginEvent('td', side)}>{archived ? 'Add missed score' : '+ Score'}</button>
      </div>)}
    </div>
    <div className="ff-quick-actions">
      <button type="button" className="ff-primary" onClick={() => beginEvent('flagPull')}>+ Flag pull</button>
      <button type="button" onClick={() => { setError(''); setCorrection({ side: 'own', total: score.own, note: '' }) }}>Fix score</button>
      {!archived && <button type="button" onClick={() => { setNextOpponent(''); setKeepLineup(true); setFinishing(true) }}>End game / Next game</button>}
    </div>
    {message && <p role="status" className="ff-notice">{message}</p>}
    <div className="ff-row">
      <button type="button" aria-expanded={showLog} onClick={() => setShowLog(!showLog)}>Recent plays ({game.events.filter((e) => !e.voided).length})</button>
      <button type="button" aria-expanded={showStats} onClick={() => setShowStats(!showStats)}>Player stats</button>
      <button type="button" onClick={downloadStats}>Download report</button>
    </div>
    {error && !draft && !correction && <p className="ff-error" role="alert">{error}</p>}
    {draft && <FlagDialog title={draft.id ? 'Edit play' : draft.type === 'flagPull' ? 'Who pulled the flag?' : (draft.side === 'own' ? team.name : game.opponent || 'Opponent') + ' scored!'} onClose={() => { setDraft(null); setError('') }}>
      {error && <p className="ff-error" role="alert">{error}</p>}
      {draft.type !== 'flagPull' && draft.type !== 'adjustment' && <div className="ff-choice-grid" aria-label="Scoring play">
        {[['td', 6, 'Touchdown', '+6'], ['extraPoint', 1, 'Extra point', '+1'], ['extraPoint', 2, 'Extra point', '+2']].map(([type, points, label, amount]) => <button key={amount} type="button" aria-pressed={draft.type === type && Number(draft.points) === points} onClick={() => setDraft({ ...draft, type, points })}><strong>{amount}</strong><span>{label}</span></button>)}
      </div>}
      {draft.side === 'own' && draft.type !== 'adjustment' && <>
        {draft.type !== 'flagPull' && <h4>Who scored?</h4>}
        <div className="ff-player-picks" aria-label="Choose player">
          {creditPlayers.map((p) => <button type="button" key={p.id} aria-pressed={draft.playerId === p.id} onClick={() => setDraft({ ...draft, playerId: p.id, assistId: draft.assistId === p.id ? '' : draft.assistId })}><strong>{p.number ? '#' + p.number + ' ' : ''}{p.name}</strong><small>{!archived && active.has(p.id) ? 'On field' : !p.available ? 'Not playing today' : ''}</small></button>)}
          <button type="button" aria-pressed={!draft.playerId} onClick={() => setDraft({ ...draft, playerId: '' })}>Credit later</button>
        </div>
      </>}
      <details className="ff-game-settings"><summary>More details · assist, note, or custom points</summary><div className="ff-dialog-fields">
        {draft.side === 'own' && draft.type !== 'adjustment' && <label>Assist (optional)<select value={draft.assistId} onChange={(e) => setDraft({ ...draft, assistId: e.target.value })}><option value="">No assist</option>{creditPlayers.filter((p) => p.id !== draft.playerId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
        <label>Play type<select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value, points: e.target.value === 'td' ? 6 : e.target.value === 'extraPoint' ? 1 : 0 })}>{Object.entries(GAME_EVENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Team<select value={draft.side} onChange={(e) => setDraft({ ...draft, side: e.target.value, playerId: '', assistId: '' })}><option value="own">{team.name}</option><option value="opponent">{game.opponent || 'Opponent'}</option></select></label>
        {draft.type !== 'flagPull' && <label>Points<input type="number" inputMode="numeric" step="1" value={draft.points} onChange={(e) => setDraft({ ...draft, points: e.target.value })} /></label>}
        <label>Note (optional)<input maxLength={300} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label>
      </div></details>
      <footer className="ff-dialog-footer"><button type="button" onClick={() => { setDraft(null); setError('') }}>Cancel</button><button type="button" className="ff-primary" onClick={saveEvent}>{draft.id ? 'Save changes' : draft.type === 'flagPull' ? 'Save flag pull' : 'Add ' + draft.points + ' points'}</button></footer>
    </FlagDialog>}
    {correction && <FlagDialog title="Fix the score" onClose={() => { setCorrection(null); setError('') }}>
      {error && <p className="ff-error" role="alert">{error}</p>}
      <div className="ff-switch">{['own', 'opponent'].map((side) => <button type="button" key={side} aria-pressed={correction.side === side} onClick={() => setCorrection({ ...correction, side, total: score[side] })}>{side === 'own' ? team.name : game.opponent || 'Opponent'}</button>)}</div>
      <label>What should their score be?<input type="number" inputMode="numeric" min="0" max="999" step="1" value={correction.total} onChange={(e) => setCorrection({ ...correction, total: e.target.value })} /></label>
      <p className="ff-hint">Call reversed? Remove that play from Recent plays to fix both the score and player stats.</p>
      <button type="button" onClick={() => { setCorrection(null); setShowLog(true); setError('') }}>Find a play to reverse</button>
      <footer className="ff-dialog-footer"><button type="button" onClick={() => { setCorrection(null); setError('') }}>Cancel</button><button type="button" className="ff-primary" onClick={correctScore}>Save score</button></footer>
    </FlagDialog>}
    {finishing && <FlagDialog title="Ready for the next game?" onClose={() => setFinishing(false)}>
      <p className="ff-final-score">{team.name} {score.own} – {score.opponent} {game.opponent}</p>
      <p>We’ll save this game’s score, player stats, and playing time in Saved games.</p>
      <p>The next game starts at 0–0 with a stopped clock and fresh stats. Your roster, plays, and drive cards stay ready.</p>
      <label>Next opponent (optional)<input value={nextOpponent} maxLength={60} placeholder="Opponent name" onChange={(e) => setNextOpponent(e.target.value)} /></label>
      <label className="ff-check"><input type="checkbox" checked={keepLineup} onChange={(e) => setKeepLineup(e.target.checked)} />Keep my current lineup</label>
      <button type="button" onClick={downloadStats}>Download this game’s report</button>
      <footer className="ff-dialog-footer"><button type="button" onClick={() => setFinishing(false)}>Keep playing</button><button type="button" className="ff-primary" onClick={() => {
        updateTeam((current) => archiveGame(current, { opponent: nextOpponent, keepLineup })); setFinishing(false); setDraft(null); setCorrection(null); setError(''); setShowStats(false); setShowLog(false); setMessage('Game saved. Ready for kickoff! Start the clock when play begins.')
      }}>Save game & reset</button></footer>
    </FlagDialog>}
    {showLog && <div className="ff-panel"><h4>Recent plays · correct a call</h4>
      {!game.events.length && <p>No plays yet. Tap a team’s score button or record a flag pull.</p>}
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
    <details className="ff-game-settings"><summary>Game details · opponent, date &amp; name</summary><div className="ff-row">
      <label>Game label<input value={game.name} maxLength={80} onChange={(e) => updateGame({ name: e.target.value })} /></label><label>Opponent name<input value={game.opponent} maxLength={60} onChange={(e) => updateGame({ opponent: e.target.value })} /></label><label>Game date<input type="date" value={game.date} onChange={(e) => updateGame({ date: e.target.value })} /></label>
    </div></details>
  </section>
}
