import { useEffect, useRef, useState } from 'react'
import { FLAG_STORAGE_KEY, OFFENSE_ROLES, DEFENSE_ROLES, ROUTE_COLORS, makeBoard, makeTeam, makePlayer, makeFormation, makePlay, makeDriveEntry, activePlayerIds, assignPlayer, settleTeamClock, setTeamClockRunning, selectPlay, callLabel, duration, putUpload, getUpload } from './flagFootball'
import './flagFootball.css'
import FlagScoreboard from './FlagScoreboard'
import FlagDialog from './FlagDialog'
import { makeGame } from './flagGame'

function readBoard() {
  try {
    const raw = localStorage.getItem(FLAG_STORAGE_KEY)
    if (!raw) return { board: makeBoard(), error: '' }
    const board = JSON.parse(raw)
    if (board.version !== 1 || !board.teams?.length || !board.teams.every((team) => Array.isArray(team.players) && Array.isArray(team.formations) && Array.isArray(team.plays) && Array.isArray(team.drives) && team.formationIds && team.assignments)) throw new Error('Invalid board')
    board.teams = board.teams.map((team) => settleTeamClock({ ...team, game: team.game || makeGame(), gameHistory: team.gameHistory || [] }))
    return { board, error: '' }
  } catch {
    return { board: null, error: 'Your saved flag football board could not be read. It has not been overwritten. Reload or restore browser data before continuing.' }
  }
}

function Attachment({ attachment }) {
  const [source, setSource] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let disposed = false
    let url = ''
    setSource('')
    setError('')
    if (attachment) getUpload(attachment.id).then((file) => {
      if (!file) throw new Error('Missing upload')
      if (!disposed) { url = URL.createObjectURL(file); setSource(url) }
    }).catch(() => { if (!disposed) setError('This upload is unavailable in this browser. Please upload it again.') })
    return () => { disposed = true; if (url) URL.revokeObjectURL(url) }
  }, [attachment])
  if (!attachment) return null
  return <div className="ff-attachment">
    {error ? <p role="alert">{error}</p> : !source ? <p>Loading reference…</p> : <>
      {attachment.type.startsWith('image/') ? <img src={source} alt={`Original play: ${attachment.name}`} /> : <object data={source} type="application/pdf" aria-label={attachment.name}><p>Use the link below to open this PDF.</p></object>}
      <a href={source} target="_blank" rel="noreferrer">Open {attachment.name}</a>
    </>}
  </div>
}

function Field({ formation, assignments, players, play, entry, selectedRole, setSelectedRole, editMode, onPoint, compact = false }) {
  const spots = play?.spots || formation?.spots || []
  const routes = play?.routes || {}
  return <svg className={`ff-field ${compact ? 'ff-field-mini' : ''}`} viewBox="0 0 600 560" role={compact ? 'img' : 'group'} aria-label={compact ? `${play?.name} diagram` : '5v5 football field with positions and routes'} onClick={compact ? undefined : (event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    onPoint({ x: Math.max(7, Math.min(93, (event.clientX - bounds.left) / bounds.width * 100)), y: Math.max(9, Math.min(92, (event.clientY - bounds.top) / bounds.height * 100)) })
  }}>
    <defs>{ROUTE_COLORS.map((color, i) => <marker key={color} id={`ff-arrow-${compact ? play?.id : 'live'}-${i}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill={color} /></marker>)}</defs>
    <rect width="600" height="560" rx="16" fill="#125345" />
    <rect x="15" y="15" width="570" height="530" rx="8" fill="none" stroke="#b6d4b1" strokeWidth="2" />
    <rect x="16" y="16" width="568" height="46" fill="#35215a" />
    <text x="300" y="45" textAnchor="middle" fill="#f5dc72" fontSize="20" letterSpacing="7">LYNX • 5V5</text>
    {[110, 175, 240, 305, 370, 435, 500].map((y, i) => <g key={y} opacity=".45"><line x1="16" x2="584" y1={y} y2={y} stroke="white" /><text x="28" y={y - 7} fill="white" fontSize="13">{(i + 1) * 5}</text>{[220, 380].map((x) => <line key={x} x1={x} x2={x} y1={y - 7} y2={y + 7} stroke="white" />)}</g>)}
    <line x1="16" x2="584" y1="342" y2="342" stroke="#f8d351" strokeWidth="3" strokeDasharray="9 7" />
    {!compact && <text x="580" y="334" textAnchor="end" fill="#ffe49c" fontSize="12">LINE OF SCRIMMAGE</text>}
    {spots.map((spot, index) => {
      const points = [{ x: spot.x, y: spot.y }, ...(routes[spot.role] || [])]
      return points.length > 1 && <polyline key={spot.role} points={points.map((p) => `${p.x * 6},${p.y * 5.6}`).join(' ')} fill="none" stroke={ROUTE_COLORS[index]} strokeWidth="4" strokeLinejoin="round" markerEnd={`url(#ff-arrow-${compact ? play?.id : 'live'}-${index})`} opacity={!compact && selectedRole && selectedRole !== spot.role ? .4 : 1} />
    })}
    {!compact && Object.entries(entry?.routes || {}).map(([role, route]) => {
      const spot = spots.find((s) => s.role === role)
      if (!spot || !route.length) return null
      const index = spots.indexOf(spot)
      return <polyline key={role} points={[spot, ...route].map((p) => `${p.x * 6},${p.y * 5.6}`).join(' ')} fill="none" stroke={ROUTE_COLORS[index]} strokeWidth="4" strokeDasharray="8 6" markerEnd={`url(#ff-arrow-live-${index})`} />
    })}
    {spots.map((spot, index) => {
      const player = players.find((p) => p.id === assignments[spot.role] && p.available)
      const selected = !compact && selectedRole === spot.role
      return <g key={spot.role} transform={`translate(${spot.x * 6} ${spot.y * 5.6})`} role={compact ? undefined : 'button'} tabIndex={compact ? undefined : 0} aria-label={`${spot.role}: ${player?.name || 'Unfilled'}`} onKeyDown={compact ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedRole(spot.role) } }} onClick={compact ? undefined : (e) => { e.stopPropagation(); setSelectedRole(spot.role) }} style={{ cursor: compact ? 'inherit' : 'pointer' }}>
        <circle r={selected ? 24 : 21} fill={player || compact ? '#291645' : '#3c4850'} stroke={selected ? '#fff' : ROUTE_COLORS[index]} strokeWidth={selected ? 4 : 3} />
        <text textAnchor="middle" y="5" fill="white" fontWeight="800" fontSize="15">{spot.role}</text>
        {!compact && <><rect x="-50" y="26" width="100" height="24" rx="6" fill="#162e29" /><text textAnchor="middle" y="42" fill="white" fontSize="12">{player ? `${player.number ? `#${player.number} ` : ''}${player.name.length > 12 ? `${player.name.slice(0, 11)}…` : player.name}` : 'Assign player'}</text></>}
      </g>
    })}
    {!compact && editMode !== 'view' && <text x="300" y="535" fill="white" textAnchor="middle" fontSize="13">{editMode === 'position' ? 'Tap a position, then tap its new location' : 'Tap a position, then tap route points'}</text>}
  </svg>
}

export default function FlagFootballBoard({ rosters }) {
  const [initial] = useState(readBoard)
  const [board, setBoard] = useState(initial.board)
  const [saveError, setSaveError] = useState(initial.error)
  const [notice, setNotice] = useState('')
  const [tab, setTab] = useState('field')
  const [selectedRole, setSelectedRole] = useState('')
  const [subRole, setSubRole] = useState('')
  const [editMode, setEditMode] = useState('view')
  const [teamName, setTeamName] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [playerNumber, setPlayerNumber] = useState('')
  const [rosterKey, setRosterKey] = useState('')
  const [formationName, setFormationName] = useState('')
  const [formationRoles, setFormationRoles] = useState([])
  const [driveName, setDriveName] = useState('')
  const [uploading, setUploading] = useState(false)
  const uploadInput = useRef(null)
  const team = board?.teams.find((t) => t.id === board.selectedTeamId) || board?.teams[0]
  const teamId = team?.id
  const formation = team?.formations.find((f) => f.id === team.formationIds[team.side])
  const play = team?.plays.find((p) => p.id === team.selectedPlayId)
  const drive = team?.drives.find((d) => d.id === team.selectedDriveId)
  const entry = drive?.entries.find((e) => e.id === team.selectedEntryId)
  const assignments = team?.assignments[formation?.id] || {}
  const active = team ? activePlayerIds(team) : new Set()
  const rosterKeys = Object.keys(rosters).filter((key) => key.startsWith('flagFootball:'))

  useEffect(() => {
    if (!board) return
    try { localStorage.setItem(FLAG_STORAGE_KEY, JSON.stringify(board)); setSaveError('') }
    catch { setSaveError('Changes could not be saved in this browser. Keep this page open and free browser storage before continuing.') }
  }, [board])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now()
      setBoard((current) => {
        if (!current) return current
        const teams = current.teams.map((t) => settleTeamClock(t, now))
        return teams.some((t, i) => t !== current.teams[i]) ? { ...current, teams } : current
      })
    }, 250)
    return () => window.clearInterval(timer)
  }, [])

  const updateTeam = (change, id = teamId) => {
    const now = Date.now()
    setBoard((current) => ({ ...current, teams: current.teams.map((t) => {
      if (t.id !== id) return t
      const settled = settleTeamClock(t, now)
      return typeof change === 'function' ? change(settled) : { ...settled, ...change }
    }) }))
  }
  const updatePlay = (change) => updateTeam((t) => ({ ...t, plays: t.plays.map((p) => p.id === play?.id ? { ...p, ...change } : p) }))
  const updateEntry = (change) => updateTeam((t) => ({ ...t, drives: t.drives.map((d) => d.id === drive?.id ? { ...d, entries: d.entries.map((e) => e.id === entry?.id ? { ...e, ...change } : e) } : d) }))
  const resetInteraction = () => { setSelectedRole(''); setSubRole(''); setEditMode('view'); setNotice('') }
  const showPlay = (id, entryId = '') => { updateTeam((t) => selectPlay(t, id, entryId)); resetInteraction(); setTab('field') }
  const changeSide = (side) => { updateTeam({ side, selectedPlayId: '', selectedEntryId: '' }); resetInteraction(); setFormationRoles([]) }
  const changeFormation = (id) => { updateTeam({ formationIds: { ...team.formationIds, [team.side]: id }, selectedPlayId: '', selectedEntryId: '' }); resetInteraction() }
  const changeTab = (next) => { setTab(next); setEditMode('view') }

  function addFormation() {
    const roles = team.side === 'offense' ? OFFENSE_ROLES : DEFENSE_ROLES.filter((r) => formationRoles.includes(r))
    if (!formationName.trim() || roles.length !== 5) return
    const next = makeFormation(formationName.trim(), team.side, roles)
    updateTeam((t) => ({ ...t, formations: [...t.formations, next], formationIds: { ...t.formationIds, [t.side]: next.id }, selectedPlayId: '', selectedEntryId: '' }))
    setFormationName(''); setFormationRoles([]); resetInteraction()
  }

  function addPlay() {
    if (!formation || team.plays.length >= 20) return

    const next = makePlay(team, formation.id)
    updateTeam((t) => ({ ...t, plays: [...t.plays, next], selectedPlayId: next.id, selectedEntryId: '' }))
    setTab('field'); setEditMode('route'); setSelectedRole(formation.spots[0].role)
    setNotice('New play created. Tap field points to draw the selected position’s route. Upload a reference below if you have one.')
  }

  function onPoint(point) {
    if (!selectedRole || !formation || editMode === 'view') return
    if (editMode === 'position') {
      const move = (spots) => spots.map((s) => s.role === selectedRole ? { ...s, ...point } : s)
      if (play) updatePlay({ spots: move(play.spots) })
      else updateTeam((t) => ({ ...t, formations: t.formations.map((f) => f.id === formation.id ? { ...f, spots: move(f.spots) } : f) }))
    } else if (editMode === 'route' && play) {
      const route = play.routes[selectedRole] || []
      if (route.length < 30) updatePlay({ routes: { ...play.routes, [selectedRole]: [...route, point] } })
    } else if (editMode === 'call' && entry) {
      const routes = entry.routes || {}
      if ((routes[selectedRole]?.length || 0) < 30) updateEntry({ routes: { ...routes, [selectedRole]: [...(routes[selectedRole] || []), point] } })
    }
  }

  function trimRoute(clear) {
    const target = editMode === 'call' ? entry : play
    if (!selectedRole || !target) return
    const routes = { ...(target.routes || {}), [selectedRole]: clear ? [] : (target.routes?.[selectedRole] || []).slice(0, -1) }
    if (editMode === 'call') updateEntry({ routes })
    else updatePlay({ routes })
  }

  async function uploadReference(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !play) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(file.type) || file.size > 15 * 1024 * 1024) {
      setNotice('Choose a PNG, JPG, WebP, or PDF up to 15 MB.'); return
    }
    const attachment = { id: crypto.randomUUID(), name: file.name, type: file.type }
    const targetTeam = teamId
    const targetPlay = play.id
    setUploading(true)
    try {
      await putUpload(attachment.id, file)
      updateTeam((t) => ({ ...t, plays: t.plays.map((p) => p.id === targetPlay ? { ...p, attachment } : p) }), targetTeam)
      setNotice('Reference saved. Draw its routes by position on the field; the upload is not automatically traced.')
    } catch { setNotice('The upload could not be saved. Try again or free browser storage.') }
    finally { setUploading(false) }
  }

  function importRoster() {
    if (!rosterKey) return
    const source = rosters[rosterKey] || []
    updateTeam((t) => {
      const incoming = source.filter((p) => !t.players.some((existing) => existing.sourceId === `${rosterKey}:${p.id}`))
        .map((p) => ({ ...makePlayer(p.name, p.number), sourceId: `${rosterKey}:${p.id}` }))
      return { ...t, players: [...t.players, ...incoming] }
    })
    setNotice('Roster added to this team. Previously imported players were kept with their assignments and timers.')
  }

  if (!board || !team) return <p role="alert" className="ff-error">{saveError}</p>
  const unfilled = (formation?.spots || []).filter((s) => !active.has(assignments[s.role]))
  const selectedPlayer = team.players.find((p) => p.id === assignments[selectedRole])
  return <section className="ff-board" aria-label="Flag football 5v5 coaching board">
    <header className="ff-header">
      <div><p className="eyebrow">LYNX SIDELINE</p><h2>Flag Football <span className="ff-badge">5v5</span></h2><p>Your sideline. Ready for the next play.</p></div>
      <label>Active team<select aria-label="Active flag football team" value={team.id} onChange={(e) => { setBoard((b) => ({ ...b, selectedTeamId: e.target.value })); resetInteraction(); setPlayerName(''); setPlayerNumber(''); setRosterKey(''); setFormationName(''); setFormationRoles([]); setDriveName('') }}>{board.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    </header>
    <div className="ff-toolbar"><div className="ff-clock"><span>{team.name} · {team.timerRunning ? 'Running' : 'Stopped'}</span><strong>{duration(team.clock)}</strong><button type="button" onClick={() => updateTeam((t) => setTeamClockRunning(t, !t.timerRunning))}>{team.timerRunning ? 'Stop timer' : 'Start timer'}</button></div>
      {board.teams.filter((t) => t.id !== team.id && t.timerRunning).map((t) => <span key={t.id}>{t.name} timer running · {duration(t.clock)} <button type="button" onClick={() => updateTeam((current) => setTeamClockRunning(current, false), t.id)}>Stop {t.name} timer</button></span>)}
    </div>
    <FlagScoreboard key={team.id} team={team} updateTeam={updateTeam} />
    <p className="ff-storage">Saved on this device. The clock keeps running until you stop it or end the game.</p>
    {saveError && <p role="alert" className="ff-error">{saveError}</p>}
    {notice && <p role="status" className="ff-notice">{notice}</p>}
    <nav className="ff-tabs" aria-label="Flag football views">{[['field', 'Sideline'], ['playbook', `Playbook · ${team.plays.length}/20`], ['drives', 'Drive cards'], ['team', 'Roster']].map(([key, label]) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => changeTab(key)}>{label}</button>)}</nav>

    {tab === 'field' && <>
      <div className="ff-toolbar">
        <div className="ff-switch">{['offense', 'defense'].map((side) => <button key={side} type="button" aria-pressed={team.side === side} onClick={() => changeSide(side)}>{side === 'offense' ? 'Offense' : 'Defense'}</button>)}</div>
        <label>Formation<select value={formation?.id || ''} onChange={(e) => changeFormation(e.target.value)}><option value="" disabled>Choose five defensive positions</option>{team.formations.filter((f) => f.side === team.side).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
      </div>
      <details className="ff-panel" open={!formation ? true : undefined}><summary>Create {team.side === 'offense' ? 'an offensive' : 'a defensive'} formation</summary><div className="ff-row"><label>Formation name<input value={formationName} maxLength={50} onChange={(e) => setFormationName(e.target.value)} placeholder={team.side === 'defense' ? 'e.g. Two safeties' : 'e.g. Trips right'} /></label>{team.side === 'defense' ? <fieldset><legend>Choose exactly five positions ({formationRoles.length}/5)</legend><div className="ff-checks">{DEFENSE_ROLES.map((role) => <label key={role}><input type="checkbox" checked={formationRoles.includes(role)} disabled={formationRoles.length === 5 && !formationRoles.includes(role)} onChange={(e) => setFormationRoles(e.target.checked ? [...formationRoles, role] : formationRoles.filter((r) => r !== role))} />{role}</label>)}</div></fieldset> : <p>X · Y · Z · C · Q</p>}<button type="button" disabled={!formationName.trim() || (team.side === 'defense' && formationRoles.length !== 5)} onClick={addFormation}>Save formation</button></div></details>
      <div className="ff-toolbar"><label>Show play<select value={play?.id || ''} onChange={(e) => e.target.value ? showPlay(e.target.value) : (updateTeam({ selectedPlayId: '', selectedEntryId: '' }), resetInteraction())}><option value="">Formation only</option>{team.plays.filter((p) => team.formations.find((f) => f.id === p.formationId)?.side === team.side).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button type="button" disabled={!formation || team.plays.length >= 20} onClick={addPlay}>+ Create play</button>{entry && <button type="button" onClick={() => {
        const index = drive.entries.findIndex((e) => e.id === entry.id)
        const next = drive.entries[index + 1]
        if (next) showPlay(next.playId, next.id)
      }} disabled={drive.entries.at(-1)?.id === entry.id}>Next play →</button>}</div>
      <div className="ff-call"><span>{entry ? drive.name : formation?.name || 'Set up your defense'}</span><h3>{play ? callLabel(play, entry) : 'Formation board'}</h3>{entry?.note && <p>{entry.note}</p>}{entry?.action && <small>{entry.actionMeaning || 'Action call'}</small>}{entry?.motion && <small>Motion check: {entry.motion} → {entry.target}</small>}{entry && (entry.action || entry.motion) && !Object.values(entry.routes || {}).some((r) => r.length) && <p>Call movements have not been drawn yet. Use “Draw call movement” to define them.</p>}</div>
      <div className="ff-game-grid">
        <div>
          <Field formation={formation} assignments={assignments} players={team.players} play={play} entry={entry} selectedRole={selectedRole} setSelectedRole={(role) => { setSelectedRole(role); if (editMode === 'view') setSubRole(role) }} editMode={editMode} onPoint={onPoint} />
          <details className="ff-edit-tools"><summary>Edit field & routes</summary><div className="ff-tools"><label>Editing mode<select aria-label="Field tool" value={editMode} onChange={(e) => { setEditMode(e.target.value) }}><option value="view">Select & substitute</option><option value="position">Move starting positions</option><option value="route" disabled={!play}>Draw base route</option><option value="call" disabled={!entry}>Draw call movement</option></select></label><label>Position<select aria-label="Selected field position" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}><option value="">Select position</option>{formation?.spots.map((s) => <option key={s.role}>{s.role}</option>)}</select></label>{['route', 'call'].includes(editMode) && <><button type="button" disabled={!selectedRole} onClick={() => trimRoute(false)}>Undo point</button><button type="button" disabled={!selectedRole} onClick={() => trimRoute(true)}>Clear route</button></>}</div></details>
          <p className="ff-hint">{editMode === 'view' ? 'Tap a position on the field to make a substitution.' : editMode === 'position' ? `Tap a position, then its new location. Changes apply to ${play ? 'this play' : 'this formation'}.` : 'Tap a position, then tap each bend and endpoint on the field. Solid lines are base routes; dashed lines are call movements.'}</p>
        </div>
        <aside className="ff-panel ff-lineup"><h3>On field <span>{active.size}/5</span></h3>{!formation && <p>Create a defensive formation above to place five positions.</p>}{unfilled.length > 0 && <p className="ff-warning">Unfilled: {unfilled.map((s) => s.role).join(', ')}</p>}{formation?.spots.map((spot, i) => <label key={spot.role} className={`ff-position-row ${selectedRole === spot.role ? 'is-selected' : ''}`} style={{ '--role-color': ROUTE_COLORS[i] }}><strong>{spot.role}</strong><select aria-label={`Assign ${spot.role}`} value={team.players.some((p) => p.id === assignments[spot.role] && p.available) ? assignments[spot.role] : ''} onFocus={() => setSelectedRole(spot.role)} onChange={(e) => updateTeam((t) => assignPlayer(t, formation.id, spot.role, e.target.value))}><option value="">Unfilled</option>{team.players.filter((p) => p.available).map((p) => <option key={p.id} value={p.id}>{p.name}{p.number ? ` #${p.number}` : ''}{active.has(p.id) ? ' · on field' : ''}</option>)}</select></label>)}
          <h3>Bench <span>{team.players.filter((p) => p.available && !active.has(p.id)).length}</span></h3><p className="ff-hint">{selectedRole ? `Choose a replacement for ${selectedRole}${selectedPlayer ? ` (${selectedPlayer.name})` : ''}.` : 'Select a field position to make a substitution.'}</p>
          <div className="ff-bench">{team.players.filter((p) => p.available && !active.has(p.id)).sort((a, b) => b.benchSeconds - a.benchSeconds).map((p) => <button type="button" key={p.id} disabled={!selectedRole || !formation} onClick={() => updateTeam((t) => assignPlayer(t, formation.id, selectedRole, p.id))}><strong>{p.number ? `#${p.number} ` : ''}{p.name}</strong><small>{p.roles.length ? p.roles.join(' · ') : 'Any position'}</small><small>In {duration(p.fieldSeconds)} · Sit {duration(p.benchSeconds)}</small></button>)}</div>{team.players.length === 0 && <button type="button" onClick={() => changeTab('team')}>Add your players</button>}
        </aside>
      </div>
      {play && <details className="ff-panel"><summary>{play.name} · Play notes & reference</summary><div className="ff-row"><button type="button" disabled={uploading} onClick={() => uploadInput.current?.click()}>{uploading ? 'Saving upload…' : play.attachment ? 'Replace reference' : 'Upload play image or PDF'}</button><input hidden ref={uploadInput} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={uploadReference} /><p className="ff-hint">Up to 15 MB. Upload the original, then draw the routes by position.</p></div><label>Play notes<textarea rows={2} maxLength={2000} value={play.notes} onChange={(e) => updatePlay({ notes: e.target.value })} placeholder="Reads, timing, coaching cues…" /></label><Attachment attachment={play.attachment} /></details>}
      <details className="ff-panel"><summary>Playing time for {team.name}</summary><div className="ff-time-list">{team.players.map((p) => <div key={p.id}><strong>{p.name}</strong><span>{!p.available ? 'Absent' : active.has(p.id) ? 'On field' : 'Bench'}</span><span>In {duration(p.fieldSeconds)}</span><span>Sit {duration(p.benchSeconds)}</span></div>)}</div></details>
    </>}

    {tab === 'playbook' && <section><div className="ff-section-title"><div><h3>{team.name} playbook</h3><p>Up to 20 plays. Routes follow positions when players change.</p></div><button type="button" disabled={!formation || team.plays.length >= 20} onClick={addPlay}>+ Create play</button></div>{team.plays.length === 0 && <p className="ff-empty">Create your first play from the current formation, then upload a reference or draw its routes.</p>}<div className="ff-play-grid">{team.plays.slice().sort((a, b) => a.number - b.number).map((p) => <article key={p.id} className="ff-play-card"><button type="button" className="ff-preview" onClick={() => showPlay(p.id)}><Field compact formation={team.formations.find((f) => f.id === p.formationId)} play={p} assignments={{}} players={[]} /><strong>{p.name}</strong><span>{team.formations.find((f) => f.id === p.formationId)?.name}</span><small>{Object.values(p.routes).some((r) => r.length) ? 'Routes ready' : 'Routes not drawn'}{p.attachment ? ' · Reference uploaded' : ''}</small></button><div className="ff-row"><button type="button" onClick={() => { if (!drive) { changeTab('drives'); setNotice('Create a drive card, then add plays to it.'); return } const next = makeDriveEntry(p); updateTeam((t) => ({ ...t, drives: t.drives.map((d) => d.id === drive.id ? { ...d, entries: [...d.entries, next] } : d) })); setNotice(`${p.name} added to ${drive.name}.`) }}>Add to {drive?.name || 'drive card'}</button><button type="button" className="ff-delete" onClick={() => {
        if (team.drives.some((d) => d.entries.some((e) => e.playId === p.id))) { setNotice('Remove this play from its drive cards before deleting it.'); return }
        if (window.confirm(`Delete ${p.name}?`)) updateTeam((t) => ({ ...t, plays: t.plays.filter((item) => item.id !== p.id), selectedPlayId: t.selectedPlayId === p.id ? '' : t.selectedPlayId }))
      }}>Delete</button></div></article>)}</div></section>}

    {tab === 'drives' && <section><div className="ff-section-title"><div><h3>Drive cards</h3><p>Repeat a play with different calls. Each entry keeps its own call movements.</p></div></div><div className="ff-row"><label>New drive name<input value={driveName} maxLength={60} placeholder="Opening drive" onChange={(e) => setDriveName(e.target.value)} /></label><button type="button" disabled={!driveName.trim()} onClick={() => { const next = { id: crypto.randomUUID(), name: driveName.trim(), entries: [] }; updateTeam((t) => ({ ...t, drives: [...t.drives, next], selectedDriveId: next.id, selectedEntryId: '' })); setDriveName('') }}>Create drive card</button><label>Saved drive<select value={drive?.id || ''} onChange={(e) => updateTeam({ selectedDriveId: e.target.value, selectedEntryId: '' })}><option value="">Choose drive</option>{team.drives.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label></div>{drive && <><div className="ff-row"><label>Drive name<input value={drive.name} maxLength={60} onChange={(e) => updateTeam((t) => ({ ...t, drives: t.drives.map((d) => d.id === drive.id ? { ...d, name: e.target.value } : d) }))} /></label><label>Add numbered play<select aria-label="Add play to drive" value="" onChange={(e) => { if (!e.target.value) return; const next = makeDriveEntry(team.plays.find((p) => p.id === e.target.value)); updateTeam((t) => ({ ...t, drives: t.drives.map((d) => d.id === drive.id ? { ...d, entries: [...d.entries, next] } : d) })) }}><option value="">Choose a play to add</option>{team.plays.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button type="button" disabled={!drive.entries.length} onClick={() => showPlay(drive.entries[0].playId, drive.entries[0].id)}>Run this drive →</button></div>{!drive.entries.length && <p className="ff-empty">Add plays in the order you want to call them.</p>}<ol className="ff-drive-list">{drive.entries.map((item, index) => {
        const base = team.plays.find((p) => p.id === item.playId)
        const setItem = (change) => updateTeam((t) => ({ ...t, drives: t.drives.map((d) => d.id === drive.id ? { ...d, entries: d.entries.map((e) => e.id === item.id ? { ...e, ...change } : e) } : d) }))
        const move = (offset) => updateTeam((t) => ({ ...t, drives: t.drives.map((d) => { if (d.id !== drive.id) return d; const entries = [...d.entries]; [entries[index], entries[index + offset]] = [entries[index + offset], entries[index]]; return { ...d, entries } }) }))
        return <li key={item.id} className="ff-panel"><div className="ff-section-title"><h4>{index + 1}. {callLabel(base, item)}</h4><div className="ff-row"><button type="button" aria-label={`Move entry ${index + 1} up`} disabled={index === 0} onClick={() => move(-1)}>↑</button><button type="button" aria-label={`Move entry ${index + 1} down`} disabled={index === drive.entries.length - 1} onClick={() => move(1)}>↓</button><button type="button" onClick={() => showPlay(item.playId, item.id)}>Show on field</button></div></div><div className="ff-call-inputs"><label>Action code<input value={item.action} maxLength={40} placeholder="Fire" onChange={(e) => setItem({ action: e.target.value, actionMeaning: e.target.value.toLowerCase() === 'fire' ? 'Fake handoff' : item.actionMeaning })} /></label><label>Action meaning<input value={item.actionMeaning} maxLength={120} placeholder="Fake handoff" onChange={(e) => setItem({ actionMeaning: e.target.value })} /></label><label>Motion code<input value={item.motion} maxLength={40} placeholder="Mustard" onChange={(e) => setItem({ motion: e.target.value })} /></label><label>Motion position<select value={item.target} onChange={(e) => setItem({ target: e.target.value })}>{base?.spots.map((s) => <option key={s.role}>{s.role}</option>)}</select></label></div><div className="ff-row"><label>Sideline note<input value={item.note || ''} maxLength={200} placeholder="e.g. Check the corner before the snap" onChange={(e) => setItem({ note: e.target.value })} /></label><button type="button" className="ff-delete" onClick={() => updateTeam((t) => ({ ...t, selectedEntryId: t.selectedEntryId === item.id ? '' : t.selectedEntryId, drives: t.drives.map((d) => d.id === drive.id ? { ...d, entries: d.entries.filter((e) => e.id !== item.id) } : d) }))}>Remove entry</button></div></li>
      })}</ol><button type="button" className="ff-delete" onClick={() => { if (window.confirm(`Delete drive card ${drive.name}? The plays will stay in your playbook.`)) updateTeam((t) => ({ ...t, drives: t.drives.filter((d) => d.id !== drive.id), selectedDriveId: '', selectedEntryId: '' })) }}>Delete drive card</button></>}</section>}

    {tab === 'team' && <section><div className="ff-row"><label>Team name<input value={team.name} maxLength={60} onChange={(e) => updateTeam({ name: e.target.value })} /></label><label>New team<input value={teamName} maxLength={60} placeholder="e.g. Lynx Gold" onChange={(e) => setTeamName(e.target.value)} /></label><button type="button" disabled={!teamName.trim()} onClick={() => { const next = makeTeam(teamName.trim()); setBoard((b) => ({ ...b, teams: [...b.teams, next], selectedTeamId: next.id })); setTeamName(''); resetInteraction() }}>Add team</button></div><div className="ff-panel"><h3>{team.name} roster</h3><div className="ff-row"><label>Player name<input value={playerName} maxLength={60} onChange={(e) => setPlayerName(e.target.value)} placeholder="Player name" /></label><label>Jersey #<input value={playerNumber} maxLength={4} onChange={(e) => setPlayerNumber(e.target.value)} /></label><button type="button" disabled={!playerName.trim()} onClick={() => { updateTeam((t) => ({ ...t, players: [...t.players, makePlayer(playerName.trim(), playerNumber.trim())] })); setPlayerName(''); setPlayerNumber('') }}>Add player</button></div>{rosterKeys.length > 0 && <div className="ff-row"><label>Existing flag football roster<select value={rosterKey} onChange={(e) => setRosterKey(e.target.value)}><option value="">Choose roster</option>{rosterKeys.map((key) => <option key={key} value={key}>{key.slice('flagFootball:'.length).replace(':', ' · ')}</option>)}</select></label><button type="button" disabled={!rosterKey} onClick={importRoster}>Add roster players</button></div>}<p className="ff-hint">Mark players available for today. Position tags help you choose subs; you can assign any available player.</p>{team.players.map((p) => {
      const updatePlayer = (change) => updateTeam((t) => ({ ...t, players: t.players.map((player) => player.id === p.id ? { ...player, ...change } : player) }))
      return <article className="ff-player-editor" key={p.id}><div className="ff-row"><label>Name<input aria-label={`Name for ${p.name}`} value={p.name} maxLength={60} onChange={(e) => updatePlayer({ name: e.target.value })} /></label><label>Jersey #<input aria-label={`Jersey for ${p.name}`} value={p.number} maxLength={4} onChange={(e) => updatePlayer({ number: e.target.value })} /></label><label className="ff-check"><input type="checkbox" checked={p.available} onChange={(e) => {
        const available = e.target.checked
        updateTeam((t) => ({ ...t, players: t.players.map((player) => player.id === p.id ? { ...player, available } : player), assignments: available ? t.assignments : Object.fromEntries(Object.entries(t.assignments).map(([id, lineup]) => [id, Object.fromEntries(Object.entries(lineup).filter(([, playerId]) => playerId !== p.id))])) }))
      }} />Available</label><button type="button" className="ff-delete" onClick={() => { if (window.confirm(`Remove ${p.name} from ${team.name}?`)) updateTeam((t) => ({ ...t, players: t.players.filter((player) => player.id !== p.id), assignments: Object.fromEntries(Object.entries(t.assignments).map(([id, lineup]) => [id, Object.fromEntries(Object.entries(lineup).filter(([, playerId]) => playerId !== p.id))])) })) }}>Remove</button></div><fieldset><legend>Can play</legend><div className="ff-checks">{[...OFFENSE_ROLES, ...DEFENSE_ROLES].map((role) => <label key={role}><input type="checkbox" checked={p.roles.includes(role)} onChange={(e) => updatePlayer({ roles: e.target.checked ? [...p.roles, role] : p.roles.filter((r) => r !== role) })} />{role}</label>)}</div></fieldset></article>
    })}</div></section>}
    {subRole && formation && <FlagDialog title={'Substitute · ' + subRole} onClose={() => setSubRole('')}>
      <p>{team.players.find((p) => p.id === assignments[subRole])?.name || 'Open position'} · Choose who goes in.</p>
      <div className="ff-player-picks">{team.players.filter((p) => p.available).sort((a, b) => Number(active.has(a.id)) - Number(active.has(b.id)) || b.benchSeconds - a.benchSeconds).map((p) => <button type="button" key={p.id} aria-pressed={assignments[subRole] === p.id} onClick={() => {
        updateTeam((t) => assignPlayer(t, formation.id, subRole, p.id)); setNotice(p.name + ' is in at ' + subRole + '.'); setSubRole('')
      }}><strong>{p.number ? '#' + p.number + ' ' : ''}{p.name}</strong><small>{active.has(p.id) ? 'On field · moves to this spot' : 'Bench · ' + duration(p.benchSeconds) + ' total rest'}</small></button>)}</div>
      {!team.players.some((p) => p.available) && <p>Add available players in Roster to set your lineup.</p>}
      <button type="button" onClick={() => setSubRole('')}>Cancel</button>
    </FlagDialog>}
  </section>
}
