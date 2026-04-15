## MODIFIED Requirements

### Requirement: Canonical module inventory

The `src/` directory SHALL contain exactly these modules, each owning a well-defined slice of the runtime:

- `dom.js` — cached `document.getElementById` references, no other state
- `state.js` — mutable session state: cwd, username, theme name, session start, command count
- `output.js` — `print`, `printTable`, `escapeHtml`, `updatePrompt`, `updateStatus`, prompt-echo helper
- `history.js` — command history ring and index pointer
- `themes.js` — theme definitions, theme switching, mode (light/dark) toggle
- `fs.js` — virtual filesystem tree, `resolvePath`, `getNode`, `getAbsPath`, and CRUD helpers
- `persist.js` — two-tier session persistence (`localStorage` + `IndexedDB`), schema versioning, wipe, stats; the sole module permitted to touch browser storage APIs
- `dvr.js` — snapshot timeline, playback timer, transport button wiring, progress UI
- `autocomplete.js` — tab completion and hint display
- `commands.js` — command registry (`register`, `execute`) and every built-in command's implementation, including the `wipe` command
- `boot.js` — boot banner animation and initial prompt, plus the first-boot persistence notice
- `main.js` — entry point that wires the input handler, attaches DVR event listeners, calls `NX.Persist.loadPrefsSync()` before first paint, and kicks off the boot sequence (which in turn triggers `NX.Persist.loadSessionAsync()` after the boot animation)

#### Scenario: Every function in the pre-refactor script has a home
- **WHEN** the refactor is complete
- **THEN** every top-level function that previously lived in `terminal.html`'s `<script>` block resides in exactly one module file under `src/`
- **AND** no function is duplicated across modules
- **AND** `src/` contains no temporary or scratch files (e.g., no `src/all.js` left over from migration)

#### Scenario: Module owns its state
- **WHEN** a module manages state (e.g., `dvr.js` owns `snapshots`, `history.js` owns the history array, `persist.js` owns the debounce timer and storage handles)
- **THEN** that state is declared inside the module's IIFE and exposed only through the module's public API on `NX.<Module>`
- **AND** no other module reaches into that state by any other path

#### Scenario: `persist.js` is the sole storage module
- **WHEN** a reviewer searches `src/` for `localStorage`, `indexedDB`, or `sessionStorage`
- **THEN** every match lands inside `src/persist.js`
- **AND** no other module references these APIs directly
