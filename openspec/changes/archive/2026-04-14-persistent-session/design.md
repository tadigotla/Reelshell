## Context

After `modularize-core` lands, nexterm's runtime state is cleanly partitioned across modules: `NX.State` holds the small scalars (cwd, user, theme name, session counters), `NX.FS.FS` holds the virtual filesystem tree, `NX.History` holds the command history ring, `NX.DVR` holds the snapshot timeline and recording flag, and `NX.Themes` owns the active theme + light/dark mode. None of these currently survive a browser reload. The user's ask is straightforward: reload should pick up where they left off "to max extent possible," without introducing any network or telemetry pathway.

The user has explicitly said:
- No specific threat model (so we don't need encryption or passphrases)
- Persist theme, username, font size, command history at minimum — more if feasible
- Single-file shipping is not sacred, but the shipped artifact must still be double-clickable
- Privacy is a matter of default posture, not adversarial defense — the escape hatch (`wipe`, CSP) is the real story

Two soft constraints from the prior `modularize-core` work:
- All storage access must live in exactly one module (`src/persist.js`), so privacy review is local
- Modules other than `persist.js` can trigger a save, but cannot pick a storage backend or format

## Goals / Non-Goals

**Goals:**
- Reload continuity: theme, mode, font, cwd, username, command history, FS contents, DVR timeline, current screen — everything — survives a reload when possible
- Zero flash-of-default: the very first painted frame after reload shows the user's persisted theme/mode/font, not the shipped defaults
- Bounded storage: no unbounded growth; history and snapshots are capped
- Schema-versioned: a future spec change can ship with a version bump and a clean reset instead of a broken re-hydrate
- Hard privacy posture: CSP meta tag enforces "nothing leaves the device," `wipe` command gives the user a one-shot reset, `sysinfo` surfaces what's stored
- Zero network code anywhere in the app — no `fetch`, no `XHR`, no `WebSocket`, no `navigator.sendBeacon`, no external font/CSS/script/img references
- `persist.js` is the only module that touches `localStorage` or `indexedDB`

**Non-Goals:**
- No encryption at rest. No passphrase prompt. Explicitly out of scope — would be theater without a threat model, and the user has not requested it. If a real threat model emerges later, it becomes a separate change.
- No cloud sync, no cross-device sync, no export/import beyond the already-existing `export` command
- No per-scope opt-in UI (`persist on fs`, `persist off history`). Persistence is binary: all tiers on, or wiped. Simpler model, easier to reason about.
- No migrations between schema versions in v1. A version mismatch means "reset Tier 2 to defaults and continue" — not "migrate from v1 to v2." Migrations can be added later if v1's schema turns out to be wrong.
- No IndexedDB library (no `idb`, no `dexie`, etc.). Raw IndexedDB API only. The surface we need is tiny.
- No background-tab sync (e.g., `BroadcastChannel` to sync state across multiple open tabs). If the user opens the terminal in two tabs, they race. Out of scope for v1; acceptable because this is a single-user local tool.

## Decisions

### 1. Two tiers: `localStorage` for prefs, `IndexedDB` for session

```
  ┌───────────────────────────────────────────────────────┐
  │                    BOOT SEQUENCE                      │
  └───────────────────────────────────────────────────────┘

  Time →

  t=0   HTML parsed, styles applied (CRT defaults visible for ~0ms)
        │
        │  main.js runs FIRST LINE synchronously:
        │    NX.Persist.loadPrefsSync()
        │      → reads localStorage['nexterm:prefs:v1']
        │      → writes theme/mode/font onto NX.State and DOM
        │      → applies [data-theme="amber"][data-mode="light"]
        │
  t=1ms First paint already shows user's theme and mode
        │
        │  Boot animation plays (as before)
        │
  t=1s  NX.Persist.loadSessionAsync() completes
        │    ← IDB read of history/fs/dvr/screen
        │    → replaces default FS with persisted FS
        │    → restores history ring
        │    → restores DVR timeline
        │    → replaces current output DOM with persisted screen
        │
  t=1s+ User sees their session exactly as they left it
```

**Tier 1 (synchronous, `localStorage`)** carries state that MUST be applied before the first paint: theme name, mode, font size, username, cwd, recording-enabled flag. All of these affect DOM attributes or CSS variables that visibly snap if applied a frame late. `localStorage` is the only synchronous storage API available in browsers, which makes it the only option for this tier.

**Tier 2 (async, `IndexedDB`)** carries everything else: command history array, virtual FS tree, DVR snapshot array, current output HTML, session start, command count. These are larger and can arrive after the boot animation without the user noticing, because they're either not-yet-visible (history, DVR) or a single-frame swap (output HTML replaces the boot banner).

**Why not stuff everything into `localStorage`?** 5 MB quota is the wall. The DVR with 200 snapshots of HTML can easily blow past that. IndexedDB gives us ~50 MB+ and binary-safe storage.

**Why not stuff everything into IndexedDB?** Because IDB is async, and waiting for the first IDB read before first paint would either delay the boot or produce a flash-of-default. Split responsibilities.

**Alternatives considered:**
- `cookies` — obviously wrong (size, sent to server on every request — except there is no server)
- `WebStorage SessionStorage` — wiped on tab close, which defeats the whole goal
- `Origin Private File System (OPFS)` — powerful but overkill and inconsistent across browsers
- `navigator.storage.persist()` — a request to the browser not to evict IDB under storage pressure. Nice-to-have, and we should call it, but it's additive and not a replacement for the tiering.

### 2. Single schema version, no migrations in v1

Both tiers include a `schemaVersion` integer. Current: `1`. When loading, if the stored version doesn't match the constant baked into the build, the loader treats the stored data as if it didn't exist and proceeds with defaults. The stale data stays in storage (the user can see it via devtools) but is never used.

**Why not write migrations?** Because we don't yet know what will change. Writing a migration framework now speculates about future shapes we'll probably get wrong. A clean reset on mismatch is a forcing function to keep the v1 schema stable — and when we finally do need a migration, we can add one migration (not a framework) in the change that forces the bump.

**Alternatives considered:** a migration table keyed by `fromVersion`; "best effort" merges (copy compatible fields, default the rest). Both add code now for benefit that may never materialize.

### 3. Save triggers: sync for Tier 1, debounced for Tier 2

| Mutation | Tier 1 save | Tier 2 save |
|---|---|---|
| theme change | sync on change | debounced |
| mode toggle | sync on change | debounced |
| font drag | debounced (200 ms) | debounced |
| username change | sync on `user <name>` | debounced |
| `cd` | sync on cd | debounced |
| record toggle | sync on click | debounced |
| any command completes | — | debounced (500 ms) |
| `mkdir`, `touch`, `rm`, `write` | — | debounced |
| history push | — | debounced |
| snapshot taken | — | debounced |

**Tier 1 "sync" means**: the handler for the mutation calls `NX.Persist.savePrefsSync()` immediately after the mutation is applied. `localStorage.setItem` is synchronous, fast, and the payload is ~1 KB — doing it on every mutation is cheaper than any debouncing we'd add. The one exception is the font knob drag, which fires many events per second; it gets a 200 ms trailing debounce so we don't thrash localStorage during a drag gesture.

**Tier 2 "debounced" means**: on any Tier 2 mutation, schedule `NX.Persist.saveSessionLater()` with a 500 ms trailing-edge debounce. The 500 ms accumulates all the mutations that happen during one command execution (the command runs, mutates FS, pushes history, triggers a snapshot, updates output — all in one tick, one save at the end). Saves happen in a single IDB transaction per debounce-fire.

**Why 500 ms?** Short enough that a user rarely reloads within the save window, long enough to batch. If a user does reload in the window, they lose up to half a second of state — acceptable.

**Alternatives considered:**
- Save on every mutation (no debounce) — IDB round-trips per keystroke is wasteful
- Save only on `beforeunload` — unreliable; mobile browsers don't fire it consistently
- `requestIdleCallback`-based saves — adds nondeterminism without benefit for payloads this size

### 4. Bounded growth

| Store | Cap | Policy |
|---|---|---|
| Command history | 500 entries | Drop oldest when pushing over cap |
| DVR snapshots | 200 snapshots | Drop oldest when pushing over cap |
| FS tree | no hard cap | Users are unlikely to mkdir 10k dirs, and `wipe` is the escape hatch |
| Output HTML | most recent only | Stored as one string, not a timeline |

Caps are enforced at **push time in the runtime modules**, not at save time in `persist.js`. `history.js` trims its own ring; `dvr.js` trims its own timeline. `persist.js` just serializes whatever it finds. This keeps `persist.js` free of domain logic.

**Why these caps?** Gut feel, order-of-magnitude-right, explicitly revisitable. The DVR snapshot count used to be unbounded; 200 is roughly "an entire hour of steady typing" and keeps worst-case IDB payload under a couple of MB even with very large screens.

### 5. `wipe` command semantics

```
> wipe
⚠  This will erase all persisted state: history, filesystem, DVR timeline,
    theme, font size, username, and recording flag.
    Type 'yes' to confirm, anything else to cancel.
> yes
✓  Persisted state wiped. Reloading...
  [page reloads]
```

Implementation:
1. Confirmation prompt shown via `Output.print`
2. If confirmed: call `NX.Persist.wipeAll()`, which does `localStorage.removeItem('nexterm:prefs:v1')`, then deletes the `nexterm` IDB database (`indexedDB.deleteDatabase('nexterm')`), then calls `location.reload()`
3. If cancelled or any other input: print `cancelled`, return to prompt

**Why a confirmation step instead of a flag like `wipe --force`?** Because this is irreversible and the only reliable protection is a second intentional input. A flag can be typed accidentally; `yes` on the next line cannot.

**Why reload instead of hot-wiping state?** Because the alternative is re-initializing every module to its defaults from running code, which is error-prone and duplicates boot logic. A full reload is equivalent to a fresh install and guaranteed to reach a clean state.

### 6. CSP lockdown

Add this as the first `<meta>` in `<head>`, immediately after `<meta charset>`:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               connect-src 'none';
               img-src 'self' data:;
               script-src 'self' 'unsafe-inline';
               style-src 'self' 'unsafe-inline';
               font-src 'self';
               form-action 'none';
               base-uri 'self';
               frame-ancestors 'none'">
```

Notes:
- `'unsafe-inline'` on `script-src` and `style-src` is required because nexterm ships as a single HTML file with inlined `<script>` and `<style>` blocks. We cannot use nonces (the file is static and served from `file://`). This is a known trade-off: the inlined CSS/JS *is* the attack surface, and `'unsafe-inline'` doesn't reduce it, but the other directives still enforce no-egress.
- `connect-src 'none'` is the critical one — it blocks every form of network I/O the browser supports. If someone (or some future careless edit) adds a `fetch('https://api.example.com')`, the browser refuses it with a CSP violation. Enforceable guarantee, not hope.
- `form-action 'none'` and `frame-ancestors 'none'` defense-in-depth, essentially free.
- `img-src 'self' data:` allows data-URI images (used for icons in the stardate panel if any) but not external images.
- `file://` origin handling of CSP varies by browser but the defensive directives are strictly additive — worst case they're ignored, best case they're enforced, never harmful.

**Alternative considered:** ship with no CSP and rely on vigilance. Cheaper, but throws away a free, browser-enforced guarantee for no benefit.

### 7. `persist.js` module surface

```js
NX.Persist = {
  // synchronous (Tier 1)
  loadPrefsSync(),        // called ONCE by main.js before first paint
  savePrefsSync(),        // called by modules after Tier 1 mutations
  
  // async (Tier 2)
  loadSessionAsync(),     // called ONCE by main.js after boot animation
  queueSessionSave(),     // called by modules after any Tier 2 mutation; debounced
  
  // maintenance
  wipeAll(),              // called by the `wipe` command; deletes everything and reloads
  stats(),                // returns { tier1Bytes, tier2Bytes, schemaVersion, lastSaved } for sysinfo
  SCHEMA_VERSION: 1,
};
```

Internal to the module, not exposed:
- The IDB database open/upgrade dance
- The debounce timer
- Serialization formats (JSON for Tier 1, structured clone for Tier 2)
- The storage keys (`nexterm:prefs:v1`, `nexterm` IDB database name, `session` object store name)

**Other modules only ever call the public surface.** If `history.js` wants to save, it calls `NX.Persist.queueSessionSave()` — it never touches IDB, never knows about debouncing, never sees a key name.

### 8. What about the current output DOM?

`NX.DVR` already captures `output.innerHTML` on every snapshot. The current live output (what's visible when the user reloads) is just "the most recent snapshot plus anything printed since." The simplest approach:

- On every Tier 2 save, persist `output.innerHTML` as a separate field called `currentScreen`
- On Tier 2 load, after the boot animation finishes, swap `output.innerHTML` to `currentScreen`

This means the user sees the screen they left. The boot banner flashes briefly (during boot animation), then is replaced by the persisted screen. If we wanted to skip the boot flash for returning users, we could — but (a) the boot banner is part of nexterm's charm, and (b) skipping it means first paint goes directly to the persisted screen, which conflicts with the "first paint shows the user's theme" goal (we'd need Tier 1 to carry the screen too, which is too large for localStorage). Keep the boot banner, swap after it completes. Small cost, preserves identity.

### 9. First-boot banner

After the boot animation completes, on the very first successful load with persistence enabled (tracked via a `firstBootSeen: true` flag in Tier 1), print one line:

```
  PERSISTENCE: ENABLED  ·  type 'wipe' to clear
```

Then set `firstBootSeen: true` and save Tier 1. On every subsequent boot, the flag is already set and the line is suppressed.

This avoids "sneaky default-on persistence" — the user is informed the first time, then left alone. It's a one-time line, not a permanent UI element.

### 10. `sysinfo` persistence block

Extend the existing `sysinfo` output with a new block at the bottom:

```
PERSISTENCE
  Status       ENABLED
  Tier 1       prefs (localStorage)     324 bytes
  Tier 2       session (IndexedDB)      18.4 KB
  Schema       v1
  Last saved   2s ago
```

## Risks / Trade-offs

- **[Risk] A user runs nexterm in multiple tabs simultaneously; the last-saved tab wins, earlier-tab state vanishes.** → **Mitigation:** Document in the `sysinfo` help text or README. A `BroadcastChannel`-based sync is feasible but out of scope for v1; in practice this is a single-user local tool and the risk is low.

- **[Risk] IndexedDB read fails at boot (quota exceeded, corrupt database, browser bug), leaving the user in a half-loaded state.** → **Mitigation:** Wrap `loadSessionAsync` in a try/catch. On any failure, `console.warn`, proceed with defaults, and leave Tier 1 intact. User sees a default session; `wipe` fixes anything truly broken.

- **[Risk] `currentScreen` contains sensitive text the user typed via `write` or `echo`, and persisting it silently means that text survives across reloads.** → **Mitigation:** This is the stated user story ("pick up where I left off"). Mitigation is the visible `wipe` command, the first-boot notice, and the `sysinfo` persistence block. If the user wants a fresh session, it's one command away.

- **[Risk] Bounded caps (500 history / 200 snapshots) are the wrong values.** → **Mitigation:** Defined as constants in `history.js` and `dvr.js`, revisitable in a future change if real-world use exposes a problem. The caps themselves are not in the spec contract — the requirement is "bounded," not "bounded to exactly these numbers."

- **[Risk] Adding `persist.js` to the fresh module graph introduces a cycle if a module wants to call `NX.Persist` and `NX.Persist` wants to read from that module.** → **Mitigation:** `persist.js` reads from other modules (pull), other modules tell persist to save (push-notify, not push-data). `queueSessionSave()` takes no arguments — it just signals "something changed, save when the debounce fires." At fire time, `persist.js` pulls from every module. This inverts the dependency: every module depends on `NX.Persist`, and `NX.Persist` depends on every module — but only at runtime, not at load time. As long as the module order places `persist.js` after all data-owning modules and before `commands.js` and `main.js`, the graph is acyclic.

- **[Risk] CSP `'unsafe-inline'` for scripts gives a false sense of security.** → **Mitigation:** Document honestly in `design.md` (this section). The win is `connect-src 'none'`, not `script-src`. `'unsafe-inline'` is a required compromise given the single-file shipping constraint.

- **[Trade-off] The boot banner flashes briefly on every reload before the persisted screen takes over.** Small cosmetic cost; preserves the app's identity.

- **[Trade-off] Persistence is on by default. Sneaky by some definitions.** Mitigated by the first-boot notice and the always-visible `sysinfo` block. User has a one-command escape hatch.

- **[Risk] `innerHTML` restored into the output element could contain old event handlers or CSS classes that conflict with current module state.** → **Mitigation:** Output HTML in nexterm is inert text/markup (print helpers escape user input; no event handlers are attached to output children). Restoring `innerHTML` is safe. Worth re-verifying during implementation.

## Migration Plan

1. Ensure `modularize-core` is archived and `terminal.html` is built from `src/`. This change depends on that structure.
2. Add `src/persist.js` stub with the public surface and no-op bodies. Add to `MODULE_ORDER` between `themes.js` and `autocomplete.js` (or wherever the dependency analysis lands). Rebuild, verify the terminal still boots unchanged.
3. Add the CSP meta tag to `terminal.template.html`. Rebuild. Verify boot in a browser with devtools open; no CSP violations in the console.
4. Implement `loadPrefsSync` + `savePrefsSync`. Wire saves into `themes.js`, `state.js`, `dvr.js` record toggle, font knob handler, username change, `cd`. Reload test: change theme, reload → theme persists. Change mode → persists. Font size → persists. Username → persists. cwd → persists.
5. Implement `loadSessionAsync` + `queueSessionSave`. Implement the IDB open/upgrade path. Wire `queueSessionSave` into history, fs, dvr, command completion. Reload test: run commands, reload → history + FS + DVR restored. Verify boot banner plays then swaps to persisted screen.
6. Implement the `wipe` command in `commands.js`. Test: `wipe` → `yes` → clean state. `wipe` → anything else → no-op.
7. Implement first-boot banner logic. Test: fresh install → banner shown once → subsequent boots → not shown.
8. Extend `sysinfo` with the persistence block. Test: shows current bytes, schema, last saved.
9. Update `modular-source` spec delta to list `persist.js` in the module inventory.
10. Update README: one paragraph about persistence and `wipe`.
11. Run the full smoke-test matrix from `modularize-core` again, plus the new reload matrix from this change.
12. Archive.

**Rollback:** `git revert` the change. The next reload after rollback will find stale data in storage under `nexterm:prefs:v1` and the `nexterm` IDB database, but the pre-persistence build doesn't read them, so they're inert. If the user wants them cleaned up, they can use browser devtools. Rollback is clean.

## Open Questions

- **Should `wipe` also clear the in-memory session without reloading?** Current plan: reload after wipe, which is simpler and guarantees a clean state. If the reload is annoying in practice, we can add `wipe --keep` later that clears storage but leaves the in-memory session intact. Not in v1.

- **Do we want `navigator.storage.persist()` to request the browser not evict our IDB?** It's a single line, free of risk, and improves durability. I'd say yes — add it in the implementation. If the user denies the prompt, IDB still works, just evictable under pressure.
