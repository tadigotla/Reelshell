# session-persistence Specification

## Purpose
TBD - created by archiving change persistent-session. Update Purpose after archive.

## Requirements
### Requirement: Session state survives browser reload

Nexterm SHALL persist session state across browser reloads of `terminal.html` so that the user can reload the page and continue where they left off. The persisted state SHALL include, at minimum: active theme, active mode (light/dark), font size, username, current working directory, recording-enabled flag, command history, virtual filesystem contents, DVR snapshot timeline, current output display, session start timestamp, and command count.

#### Scenario: User reloads after mutating state
- **WHEN** the user changes theme, changes mode, drags the font knob, changes username, navigates the virtual filesystem, creates files, runs several commands, and then reloads the page
- **THEN** after the boot sequence completes, the terminal reflects all of those mutations — the same theme, mode, font, user, cwd, FS contents, command history, DVR timeline, and visible screen
- **AND** the user can continue typing commands without re-creating any state

#### Scenario: User reloads without mutating anything
- **WHEN** the user opens `terminal.html` for the first time, runs no commands, then reloads
- **THEN** the terminal loads with default theme, default mode, default font, default user, cwd `~`, default virtual filesystem, and empty history — no error occurs

### Requirement: Tier 1 prefs load synchronously before first paint

The following session fields SHALL be stored in synchronous browser storage (`localStorage`) under the key `nexterm:prefs:v1` and SHALL be read and applied before the first rendered frame after page load: theme name, mode, font size, username, current working directory, recording-enabled flag, and the `firstBootSeen` flag. No user-visible "flash of default values" SHALL occur between first paint and Tier 1 hydration.

#### Scenario: Returning user with light mode and amber theme reloads
- **WHEN** the user previously set amber theme and light mode, then reloads
- **THEN** the very first painted frame already shows the amber theme and light mode chassis
- **AND** the terminal does not briefly flash the default green-on-dark palette before switching

#### Scenario: localStorage is unavailable or throws
- **WHEN** `localStorage.getItem` throws (disabled by browser, private mode with restrictions)
- **THEN** the terminal catches the error, proceeds with default Tier 1 values, and continues booting
- **AND** a single `console.warn` is emitted (not thrown), so the user still sees a working terminal

### Requirement: Tier 2 session loads asynchronously after boot

The following session fields SHALL be stored in `IndexedDB` under database `nexterm`, object store `session`: command history (bounded), virtual filesystem tree, DVR snapshot timeline (bounded), current output HTML (`currentScreen`), session start timestamp, command count. These SHALL be loaded asynchronously after the boot animation completes and SHALL replace the terminal's default in-memory state once available.

#### Scenario: Boot animation plays while IDB loads in background
- **WHEN** the page loads
- **THEN** the boot animation begins immediately, using defaults for Tier 2 state
- **AND** once the IDB read completes, the FS tree, history, DVR timeline, and visible output are replaced with the persisted values without interrupting the boot animation

#### Scenario: IDB read fails
- **WHEN** the IDB open or read fails (quota exceeded, database corrupt, browser denies access)
- **THEN** the terminal catches the error, continues with default Tier 2 state, and prints nothing user-visible beyond a `console.warn`
- **AND** the `wipe` command remains available to recover from a truly broken state

#### Scenario: Boot banner is replaced by persisted screen
- **WHEN** Tier 2 loads successfully for a returning user
- **THEN** after the boot animation finishes, the output element's inner HTML is replaced with the `currentScreen` field from storage
- **AND** the boot banner is no longer visible; the user sees the screen they left

### Requirement: Tier 1 saves are synchronous on mutation

Every mutation to a Tier 1 field SHALL trigger a synchronous write of the full Tier 1 payload to `localStorage` at the time of the mutation. The one exception is the font-knob drag handler, which SHALL write with a 200 ms trailing-edge debounce to avoid thrashing during a drag gesture.

#### Scenario: User changes theme
- **WHEN** the user runs `theme amber`
- **THEN** immediately after the theme is applied to the DOM, `localStorage['nexterm:prefs:v1']` is updated with the new theme name
- **AND** if the user reloads one second later, the theme is restored

#### Scenario: User drags the font knob
- **WHEN** the user drags the font knob, firing many pointer-move events in rapid succession
- **THEN** at most one `localStorage` write occurs per 200 ms window
- **AND** the final font size (at drag end) is always persisted

### Requirement: Tier 2 saves are debounced on mutation

Every mutation to a Tier 2 field SHALL call `NX.Persist.queueSessionSave()`, which SHALL schedule a single IndexedDB write with a 500 ms trailing-edge debounce. All fields SHALL be written in one IDB transaction per debounce-fire, not one transaction per field.

#### Scenario: Rapid command execution debounces into one save
- **WHEN** the user runs a command that mutates the FS, pushes history, and takes a snapshot (all in the same tick)
- **THEN** a single IDB transaction writes history, FS, DVR timeline, and current screen together
- **AND** no other IDB transaction is issued for that command

#### Scenario: User reloads mid-debounce
- **WHEN** the user mutates state, then reloads within the 500 ms debounce window before the scheduled save fires
- **THEN** the mutations from that window may be lost
- **AND** all earlier saved state is intact

### Requirement: Bounded storage caps

Command history SHALL be capped at 500 most-recent entries. DVR snapshots SHALL be capped at 200 most-recent snapshots. Caps SHALL be enforced by the respective modules (`history.js`, `dvr.js`) at push time, not by the persistence module at save time. The virtual filesystem SHALL NOT have a hard cap in v1, on the assumption that user creation volume is low and `wipe` is available as an escape hatch.

#### Scenario: History exceeds cap
- **WHEN** the user has 500 entries in command history and runs a new command
- **THEN** the oldest entry is dropped, the new entry is pushed, and the cap remains 500

#### Scenario: DVR exceeds cap
- **WHEN** the user has 200 snapshots in the DVR timeline and runs a new command while recording is enabled
- **THEN** the oldest snapshot is dropped, the new snapshot is pushed, and the cap remains 200

### Requirement: Schema versioning with graceful reset

Every persisted record (Tier 1 and Tier 2) SHALL include a `schemaVersion` integer matching the `NX.Persist.SCHEMA_VERSION` constant baked into the build. On load, if a stored record's version does not match the current constant, the loader SHALL treat that record as if it did not exist and SHALL proceed with defaults. Stale data SHALL NOT be partially applied.

#### Scenario: Upgrade to a new schema version
- **WHEN** the build's `SCHEMA_VERSION` is bumped from 1 to 2 and a user with v1 data reloads
- **THEN** the loader sees a version mismatch in both tiers and skips the stored records
- **AND** the terminal boots with defaults as if it were a fresh install
- **AND** no error is shown to the user

#### Scenario: No migrations in v1
- **WHEN** v1 ships
- **THEN** the implementation does not include any migration code paths — only the graceful reset behavior

### Requirement: `wipe` command clears persisted state

Nexterm SHALL provide a built-in `wipe` command that, after an explicit `yes` confirmation, clears the Tier 1 `localStorage` key, deletes the Tier 2 IndexedDB database, and reloads the page. Any input other than `yes` on the confirmation line SHALL cancel the wipe and return the user to the prompt without modifying any storage.

#### Scenario: User wipes
- **WHEN** the user runs `wipe` and types `yes` at the confirmation prompt
- **THEN** `localStorage.removeItem('nexterm:prefs:v1')` is called
- **AND** `indexedDB.deleteDatabase('nexterm')` is called
- **AND** the page is reloaded
- **AND** after reload, the terminal is in a pristine default state

#### Scenario: User cancels wipe
- **WHEN** the user runs `wipe` and types anything other than `yes` at the confirmation prompt
- **THEN** no storage is modified
- **AND** the terminal prints `cancelled` and returns to the prompt

#### Scenario: Wipe with no prior state
- **WHEN** the user runs `wipe` on a fresh install with nothing stored, confirms with `yes`
- **THEN** the operations complete without error (removing a nonexistent localStorage key is a no-op; deleting a nonexistent IDB database is a no-op)
- **AND** the page reloads and the terminal is in a pristine default state

### Requirement: First-boot persistence notice

The first successful boot on a device with no prior Tier 1 data SHALL display a one-line notice after the boot animation: `PERSISTENCE: ENABLED  ·  type 'wipe' to clear`. The notice SHALL then set a `firstBootSeen: true` flag in Tier 1 so that subsequent boots do not re-display it.

#### Scenario: Fresh install boot
- **WHEN** a user opens `terminal.html` for the first time on a device with no `nexterm:prefs:v1` key
- **THEN** after the boot animation, the terminal prints the one-line notice
- **AND** the `firstBootSeen` flag is set to `true` and persisted to Tier 1

#### Scenario: Returning user
- **WHEN** a user with `firstBootSeen: true` in Tier 1 reloads
- **THEN** the notice is not shown
- **AND** the terminal proceeds directly into the restored session

### Requirement: `sysinfo` surfaces persistence state

The existing `sysinfo` command SHALL include a `PERSISTENCE` block showing: overall status (`ENABLED`), Tier 1 byte count, Tier 2 byte count, schema version, and a human-readable "last saved" indicator (e.g., `2s ago`, `just now`, `1m ago`).

#### Scenario: User runs `sysinfo`
- **WHEN** the user runs `sysinfo` after mutating some state
- **THEN** the output includes a `PERSISTENCE` block with the current byte totals, schema version, and last-save time
- **AND** the byte totals change across successive `sysinfo` calls as state grows

### Requirement: Single module owns storage

All reads from and writes to `localStorage` and `IndexedDB` SHALL be performed exclusively inside `src/persist.js` (the `NX.Persist` module). No other source module SHALL import, reference, or call the `localStorage` or `indexedDB` browser APIs directly.

#### Scenario: Adding a new persisted field
- **WHEN** a future change adds a new field that should persist
- **THEN** the implementer extends `NX.Persist`'s serialization logic in `persist.js`
- **AND** the module that owns the data calls `NX.Persist.queueSessionSave()` (or `NX.Persist.savePrefsSync()`) after mutating it
- **AND** the data-owning module does not touch `localStorage` or `indexedDB` directly

#### Scenario: Privacy audit
- **WHEN** a reviewer searches the source tree for storage API calls
- **THEN** every hit lands inside `src/persist.js`
- **AND** no module other than `persist.js` contains the strings `localStorage`, `indexedDB`, or `sessionStorage`

### Requirement: `navigator.storage.persist()` best effort

During initial Tier 2 setup, `NX.Persist` SHALL call `navigator.storage.persist()` if the API is available, to request that the browser not evict the IndexedDB database under storage pressure. A denial or absence of the API SHALL NOT affect correctness — persistence continues working, just evictable.

#### Scenario: Browser grants persistence
- **WHEN** the browser grants the `navigator.storage.persist()` request
- **THEN** the IDB database is marked as "persistent" and will not be evicted under normal storage pressure

#### Scenario: Browser denies or lacks the API
- **WHEN** the browser denies the request or does not support `navigator.storage`
- **THEN** the terminal continues booting and saving normally, with no visible error
