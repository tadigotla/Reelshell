## Why

Today, every browser reload wipes the terminal: the user starts at `guest@~`, default theme, empty history, default font size, empty virtual filesystem, empty DVR timeline. The user has said they want a reload to "pick up where they left off, max extent possible" — which means the session should feel continuous across reloads of `terminal.html`. With `modularize-core` landed, every piece of session state is now reachable through a clean module API (`NX.State`, `NX.FS`, `NX.History`, `NX.Themes`, `NX.DVR`), so a single `Persist` module can own serialization without touching any other module.

The user has also set a soft privacy bar: no telemetry, no network, no external anything, and a hard guarantee that nothing persisted ever leaves the device. No specific adversary model — but a meaningful privacy posture anyway, plus a visible escape hatch so the user always has a big red button.

## What Changes

- Add a new `src/persist.js` module exposing `NX.Persist`. It owns all read/write against the browser's storage APIs; no other module touches `localStorage` or `indexedDB` directly.
- Introduce a two-tier storage model:
  - **Tier 1 — prefs** (synchronous `localStorage`, ~1 KB): theme name, mode (light/dark), font size, username, cwd, recording-enabled flag. Read before first paint so the terminal boots straight into the user's theme and mode with no flash-of-default.
  - **Tier 2 — session** (async IndexedDB, bounded): command history (bounded to last 500 entries), virtual filesystem tree, DVR snapshot timeline (bounded to last 200 snapshots), current output DOM (the live screen), session start timestamp, command count. Hydrated asynchronously after first paint, replacing the boot-default state once ready.
- Introduce a schema version constant. Every persisted record includes the version; on load, a version mismatch triggers a "graceful reset to defaults" (not a crash, not a migration in v1).
- Add a new `wipe` command that clears Tier 1 + Tier 2 storage after a `y/n` confirmation and reloads the terminal to a pristine state. No arguments, no partial wipe.
- Extend `sysinfo` to include a persistence block: tiers armed (`prefs`, `session`), current bytes used per tier, schema version, last-saved timestamp.
- Add a one-line first-boot banner notice after the existing boot sequence: `PERSISTENCE: ENABLED  ·  type 'wipe' to clear`. Shown once per fresh-install boot (tracked via a Tier 1 `firstBootSeen` flag).
- Add a strict `<meta http-equiv="Content-Security-Policy">` tag to `terminal.template.html` locking `default-src 'self'`, `connect-src 'none'`, `img-src 'self' data:`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `font-src 'self'`, `form-action 'none'`. This makes "nothing leaves the device" a browser-enforced invariant, not a hope.
- Wire save hooks at the right seams (idempotent, debounced where needed):
  - Tier 1 writes: synchronous on every mutation (theme change, mode toggle, font drag, username change, `cd`, record toggle). These are tiny and cheap.
  - Tier 2 writes: debounced 500 ms after any command completes (history + FS + DVR + current output all flushed in one IDB transaction).
- Persistence is **on by default** (user's explicit choice: "don't start over"), but visible in `sysinfo`, wipe-able via `wipe`, and all data stays same-origin under the open `terminal.html`'s origin.

## Capabilities

### New Capabilities
- `session-persistence`: the contract for what is saved, where, when, and how it's reloaded. Covers the two tiers, schema versioning, the `wipe` command, the first-boot notice, and the `sysinfo` persistence block.
- `privacy-boundary`: the hard guarantees around data locality — CSP lockdown, no network code paths, explicit user-visible wipe mechanism, no telemetry. A small but important capability spec that future changes will have to respect.

### Modified Capabilities
- `modular-source`: adds `persist.js` to the canonical module inventory and its slot in `MODULE_ORDER`. The module inventory requirement in `modular-source/spec.md` currently enumerates 11 modules; after this change it enumerates 12.

## Impact

- **Code:** New file `src/persist.js` (~200–300 lines). Small save-hook additions to `state.js`, `themes.js`, `fs.js`, `history.js`, `dvr.js` — each adds a single `NX.Persist.queueSave()` call after a mutation. `commands.js` gains one new command (`wipe`). `boot.js` gains the one-line persistence notice. `main.js` gains two lines: sync-load Tier 1 before DOM render, async-load Tier 2 after boot completes.
- **Storage:** `localStorage` uses ~1 KB under key `nexterm:prefs:v1`. IndexedDB uses a database `nexterm` with one object store `session`, one record per field keyed by name. Worst-case footprint is ~1–5 MB for a very long session (200 snapshots + large FS).
- **Security / privacy:** CSP meta tag locks network egress to nothing. Nothing in the runtime ever opens a `fetch`, `XMLHttpRequest`, `WebSocket`, or `EventSource`. The `wipe` command is a hard reset.
- **Compatibility:** The user's existing open sessions have no persisted data. First load after upgrade triggers the first-boot banner once and proceeds as normal. No migration needed.
- **Testing:** Manual smoke-test matrix extends to cover reload scenarios (open terminal, mutate state in every way, reload, verify everything restored; then wipe, verify everything reset).
- **Dependencies:** `modularize-core` must be archived first — this change assumes the `NX.*` module namespace exists and is stable.
