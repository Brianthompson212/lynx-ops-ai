# Flag football 5v5

In Coach tools, open **Sub Board → Flag Football**. The other sports retain their existing boards.

## Set up a team

- Two independent teams are provided initially. Rename them or add more under **Teams & players**.
- Add players with jersey numbers, or import an existing flag football roster from the roster manager. Importing again adds only players not previously imported; it does not reset assignments or timers.
- Position tags describe where a player can play. They are advisory, so a coach can still assign any available player.
- Unchecking **Available** removes the player from all saved formation assignments and stops counting their time.

## Formations and substitutions

- Offense uses X, Y, Z, C, and Q. Create additional offensive formations and move their starting positions on the field.
- Create defensive formations by selecting exactly five of FS, SS, RCB, LCB, RLB, and LLB. There is no assumed default defensive lineup.
- Each formation remembers its own assignments. Switching formations highlights unfilled positions.
- Tap a position and then a bench player, or use the assignment dropdown. Substituting replaces the outgoing player; assigning someone already on the field vacates their previous spot.
- The game clock tracks cumulative playing and bench time for available players in the active formation. It pauses when switching teams, opening another flag football tab, or leaving the board. Reloading restores saved totals with the clock paused.

## Plays and drive cards

- Create up to 20 numbered plays per team, using the current formation. Plays copy the formation's starting positions and maintain their own route drawings.
- Upload PNG, JPEG, WebP, or PDF references, up to 15 MB each. Uploads are reference documents: routes are drawn manually by selecting a position and tapping each bend and endpoint on the field. No automatic image tracing is performed.
- **Move starting positions** edits the selected play, or the formation if no play is selected. **Undo point** and **Clear route** apply to the selected position.
- Browse the playbook to open a play or append it to the selected drive card.
- Drive cards contain ordered entries and can repeat the same numbered play with different calls. For example, action **Fire** defaults to the meaning **Fake handoff**, and motion code **Mustard** with target **X** displays **Play 1, Fire, Mustard X**.
- Select **Show on field** and **Draw call movement** to add dashed movements for an entry without changing the base play's solid routes. Movements are coach-defined; a call's name alone does not generate a route.
- **Run this drive** opens its first entry; **Next play** advances through the saved order. Removing an entry preserves its base play. Plays used by drive cards cannot be deleted until their entries are removed.

## Storage and checks

Boards are stored in localStorage under `lynx-flag-football-v1`; image/PDF blobs use IndexedDB `lynx-flag-uploads`. This version saves on the current browser/device only, without account sync. Clearing website data removes the saved boards and uploads. Production and localhost have separate storage.

Validation commands: `npm test`, `npm run lint`, and `npm run build` from this client directory.
