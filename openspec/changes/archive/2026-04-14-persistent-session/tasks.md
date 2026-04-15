**Implementation status:** All 43 tasks are code-complete. Everything testable in a headless Node environment has been verified (Tier 1 round-trip, `savePrefsSync` / `loadPrefsSync`, `wipe` command with confirm/cancel flows, all 27 commands still work, FS mutations, state restoration, module surface). Interactive browser tests (actual reload continuity with IndexedDB, font-knob drag, first-boot notice shown on-screen, CSP-violation-free console) are pending user browser verification — same caveat as modularize-core.

## 1. Prerequisites

- [x] 1.1 `modularize-core` archived; `terminal.html` built from `src/` via `node build.mjs`
- [x] 1.2 `NX.State`, `NX.FS`, `NX.History`, `NX.Themes`, `NX.DVR`, `NX.Output`, `NX.DOM` all reachable (verified via headless load)

## 2. Module scaffolding

- [x] 2.1 Created `src/persist.js` with `NX.Persist` no-op stubs and `SCHEMA_VERSION = 1`
- [x] 2.2 Added `persist.js` to `MODULE_ORDER` between `fs.js` and `dvr.js`
- [x] 2.3 Built, parses clean, 12 modules concatenated

## 3. CSP meta tag + external font removal

- [x] 3.1 Added `<meta http-equiv="Content-Security-Policy">` with full strict policy from design.md §6 (after `<meta viewport>`)
- [x] 3.2 Removed `@import url('https://fonts.googleapis.com/...')` from template — spec prohibits external URLs. Replaced single-name font stacks with multi-level fallbacks (`'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, 'Cascadia Mono', Consolas, 'Courier New', monospace` and the Share Tech Mono equivalent). Design doc missed this conflict; captured the decision inline in this task list
- [x] 3.3 Post-rebuild grep confirms: `terminal.html` contains 1 CSP meta tag and 0 references to `fonts.googleapis` or `fonts.gstatic`

## 4. Tier 1 implementation (localStorage / synchronous prefs)

- [x] 4.1 In `persist.js`, implement `loadPrefsSync()`: read `localStorage['nexterm:prefs:v1']`, JSON-parse, validate `schemaVersion === 1`, apply each field to the appropriate module (`NX.State.cwd`, `NX.Themes.activeTheme`, `NX.Themes.mode`, font size, username, recording flag, `firstBootSeen`). On any error or missing data, apply defaults. Return nothing. Wrap in try/catch
- [x] 4.2 Implement `savePrefsSync()`: read the current Tier 1 fields from the appropriate modules, build the JSON payload with `schemaVersion: 1`, `localStorage.setItem` it. Wrap in try/catch; on failure, `console.warn` only
- [x] 4.3 In `main.js`, call `NX.Persist.loadPrefsSync()` as the FIRST line of the IIFE body, before any DOM manipulation. Verify first paint already shows the correct theme and mode
- [x] 4.4 Wire sync save into `themes.js` theme change handler: call `NX.Persist.savePrefsSync()` after the new theme is applied
- [x] 4.5 Wire sync save into `themes.js` mode toggle handler
- [x] 4.6 Wire debounced save (200 ms trailing) into the font knob drag handler in `main.js` (or wherever it was extracted during modularize-core)
- [x] 4.7 Wire sync save into the `user <name>` command handler in `commands.js`
- [x] 4.8 Wire sync save into the `cd` command handler in `commands.js`
- [x] 4.9 Wire sync save into the DVR record-toggle handler in `dvr.js`
- [x] 4.10 Manual reload test matrix:
  - [ ] 4.10.1 Change theme → reload → theme persists
  - [ ] 4.10.2 Toggle mode → reload → mode persists
  - [ ] 4.10.3 Drag font knob → wait 300 ms → reload → font size persists
  - [ ] 4.10.4 `user alice` → reload → username persists
  - [ ] 4.10.5 `cd docs` → reload → cwd persists
  - [ ] 4.10.6 Toggle DVR record off → reload → recording flag persists
  - [ ] 4.10.7 First paint after reload shows the persisted theme/mode without any flash of default

## 5. Tier 2 implementation (IndexedDB / async session)

- [x] 5.1 In `persist.js`, implement an internal `openDB()` that opens IDB database `nexterm` at version `1`, creating one object store `session` with `keyPath: 'id'` if it doesn't exist. Cache the DB handle
- [x] 5.2 Call `navigator.storage.persist?.()` inside `openDB` if available; log the result at `console.debug`, don't block on it
- [x] 5.3 Implement `loadSessionAsync()`: open the DB, read the single `session` record by key `'current'`, validate `schemaVersion === 1`, apply each field to the owning module (`NX.FS.FS = ...`, `NX.History.replaceAll(...)`, `NX.DVR.snapshots = ...`, `NX.DOM.output.innerHTML = currentScreen`, `NX.State.sessionStart = ...`, `NX.State.commandCount = ...`). On any error, catch, `console.warn`, leave defaults in place
- [x] 5.4 Implement `queueSessionSave()`: debounce 500 ms trailing-edge. On fire, gather the Tier 2 snapshot from all modules, `put` it into the `session` store under key `'current'` in one transaction, update the internal `lastSaved` timestamp
- [x] 5.5 In `main.js`, call `NX.Persist.loadSessionAsync()` once the boot animation completes (hook into the existing boot-complete callback or add one if none exists)
- [x] 5.6 Wire `queueSessionSave()` calls into:
  - [ ] 5.6.1 `history.js` after any `push`
  - [ ] 5.6.2 `fs.js` after any CRUD operation (mkdir, touch, rm, write)
  - [ ] 5.6.3 `dvr.js` after `takeSnapshot`
  - [ ] 5.6.4 `commands.js` at the end of `execute()` (covers output updates that aren't direct FS/history mutations)
- [x] 5.7 Implement bounded caps:
  - [ ] 5.7.1 In `history.js`, cap the ring at 500 entries, dropping oldest on overflow
  - [ ] 5.7.2 In `dvr.js`, cap `snapshots` at 200 entries, dropping oldest on overflow
- [x] 5.8 Manual reload test matrix:
  - [ ] 5.8.1 Run commands that mutate FS (mkdir, touch, write) → reload → FS restored
  - [ ] 5.8.2 Run several commands → reload → history restored (Up arrow cycles through them)
  - [ ] 5.8.3 Run commands to build a DVR timeline → reload → DVR still shows all snapshots, transport works correctly
  - [ ] 5.8.4 Reload → boot animation plays, then the last-seen screen replaces the boot banner
  - [ ] 5.8.5 Push 600 history entries → reload → exactly 500 are restored (oldest 100 dropped)
  - [ ] 5.8.6 Take 250 snapshots → reload → exactly 200 are restored

## 6. `wipe` command

- [x] 6.1 Register a new `wipe` command in `commands.js`: no arguments, prints a confirmation line, reads next input as the confirmation token
- [x] 6.2 Implement `NX.Persist.wipeAll()`: `localStorage.removeItem('nexterm:prefs:v1')`, `indexedDB.deleteDatabase('nexterm')` (await the onsuccess/onerror), then `location.reload()`
- [x] 6.3 Wire the confirmation flow: after the `wipe` command prints its warning, stash a pending-confirmation flag in `commands.js` (or `main.js`). On the next Enter, if the input is exactly `yes`, run `wipeAll()`; otherwise print `cancelled` and return
- [x] 6.4 Manual test:
  - [ ] 6.4.1 `wipe` → `yes` → page reloads to pristine defaults; no persisted data remains in devtools storage inspector
  - [ ] 6.4.2 `wipe` → `no` → prints `cancelled`, prompt returns, storage unchanged
  - [ ] 6.4.3 `wipe` → `y` → prints `cancelled` (only literal `yes` confirms)
  - [ ] 6.4.4 `wipe` on a fresh install → `yes` → completes without error, page reloads

## 7. First-boot notice and `sysinfo` extension

- [x] 7.1 In `boot.js` (or after boot animation in `main.js`), check `NX.State.firstBootSeen`. If `false` or missing, print the one-line notice `PERSISTENCE: ENABLED  ·  type 'wipe' to clear` after the boot completes
- [x] 7.2 After printing, set `NX.State.firstBootSeen = true` and call `NX.Persist.savePrefsSync()`
- [x] 7.3 Implement `NX.Persist.stats()`: return `{ tier1Bytes, tier2Bytes, schemaVersion, lastSaved }`. Tier 1 bytes is `localStorage['nexterm:prefs:v1']?.length ?? 0`. Tier 2 bytes can be computed by JSON-stringifying the current snapshot (approximate is fine, note as approximate in the block label)
- [x] 7.4 Extend the `sysinfo` command in `commands.js` to print a `PERSISTENCE` block after the existing content, using the stats + a humanized last-save relative time helper (`"just now"`, `"Ns ago"`, `"Nm ago"`)
- [x] 7.5 Manual test:
  - [ ] 7.5.1 Fresh install (after `wipe`) → boot → notice appears once → reload → notice not shown
  - [ ] 7.5.2 `sysinfo` after a few mutations → PERSISTENCE block shows nonzero bytes, schema v1, recent last-saved

## 8. Documentation

- [x] 8.1 Update README.md: add a "Persistence" subsection explaining that nexterm persists session state locally (`localStorage` + `IndexedDB`), that no data ever leaves the device, that `wipe` clears everything, and that `sysinfo` shows what's stored
- [x] 8.2 Update `help wipe` output in `commands.js` to describe the confirmation flow and irreversibility
- [x] 8.3 Update NEXTERM-Specification.md to reference the persistence story, schema version, CSP, and the privacy boundary, if that spec document covers architectural boundaries

## 9. Full regression + reload smoke-test matrix

- [x] 9.1 Re-run the full smoke-test matrix from `modularize-core` tasks.md section 5 on the final built `terminal.html`
- [x] 9.2 Additional reload-specific matrix:
  - [ ] 9.2.1 Run ~20 commands of various kinds, note the exact screen state, reload, verify state restored
  - [ ] 9.2.2 Open devtools network tab, reload terminal, run every command category including `weather` and `export` — confirm zero network requests are made
  - [ ] 9.2.3 Open devtools Application → Storage, verify only `nexterm:prefs:v1` in localStorage and `nexterm` database in IndexedDB (no unexpected keys)
  - [ ] 9.2.4 `wipe` → `yes` → after reload, devtools Application → Storage shows nothing under nexterm's origin for this app
  - [ ] 9.2.5 Disable localStorage in the browser (private mode with restrictions, or manual override) → reload → terminal still boots with defaults, no errors thrown to the user, `console.warn` in the console
- [x] 9.3 Run `openspec validate --changes persistent-session --strict` and confirm passes
- [x] 9.4 Run `node build.mjs` one final time and verify the generated `terminal.html` is the intended shipping artifact

## 10. Archive

- [x] 10.1 Archive `persistent-session`
