## 1. Scaffolding

- [x] 1.1 Create the `src/` directory at the repo root
- [x] 1.2 Create empty stub files for every module: `dom.js`, `state.js`, `output.js`, `history.js`, `themes.js`, `fs.js`, `dvr.js`, `autocomplete.js`, `commands.js`, `boot.js`, `main.js`. Each stub wraps a no-op IIFE that initializes `window.NX = window.NX || {}` and attaches an empty object at its namespace slot
- [x] 1.3 Create `terminal.template.html` by copying the current `terminal.html` verbatim, then replacing the entire `<script>…</script>` block with a single placeholder `<script id="app"></script>`
- [x] 1.4 Add the `<!-- GENERATED FROM src/ — DO NOT EDIT — run: node build.mjs -->` banner comment as the first line of the template (immediately after `<!doctype html>`)

## 2. Build script

- [x] 2.1 Write `build.mjs` in the repo root using only `node:fs`, `node:path`, `node:url` — no npm dependencies
- [x] 2.2 Declare the explicit `MODULE_ORDER` array in the order defined in `design.md` (dom → state → output → history → themes → fs → dvr → autocomplete → commands → boot → main)
- [x] 2.3 Implement: read the template, read each module in order, join with `/* ── <filename> ── */` boundary separators, replace the `<script id="app"></script>` placeholder with a single `<script>…</script>` containing the concatenated source, write the result to `terminal.html`
- [x] 2.4 Print a short build report on stdout showing: total output byte size, module count, per-module sizes
- [x] 2.5 Verify the script is idempotent (running it twice in a row produces byte-identical output — run `node build.mjs && md5 terminal.html && node build.mjs && md5 terminal.html` and compare)
- [x] 2.6 Verify the script has zero npm dependencies: no `package.json`, no `node_modules/`, no `package-lock.json` in the repo

## 3. Dry-run migration (single-module scaffold)

- [x] 3.1 Copy the entire current `<script>` body from `terminal.html` verbatim into a temporary `src/all.js` file, wrapped in `(function(NX){ ... })(window.NX = window.NX || {})`
- [x] 3.2 Temporarily add `all.js` to `MODULE_ORDER` (and remove all the proper module stubs from the order for this step)
- [x] 3.3 Run `node build.mjs`. Open the generated `terminal.html`. Confirm the terminal boots, all commands work, DVR works, themes work — i.e., behavior is unchanged from the pre-refactor version (static verification: script parses clean, HTML head byte-identical to original, all 26 commands present; browser verification deferred to section 5)
- [x] 3.4 If anything breaks at this step, stop and diagnose before proceeding — the monolithic-in-a-wrapper version must work before extraction can begin (one bug found and fixed: `String.replace` was interpreting `$'` in script body as a pattern; switched to function-form replacement in `build.mjs`)

## 4. Progressive extraction (leaves first)

_Note: tasks 4.1–4.11 were done as a single batch write rather than per-module-then-rebuild, because the target state of every module was fully designed upfront from the proposal and design artifacts. Each module's contents still corresponds exactly to the slice described in the individual task._

- [x] 4.1 Extract `dom.js`: move all `document.getElementById` lookups into `NX.DOM`
- [x] 4.2 Extract `state.js`: move `currentUser`, `cwd`, `commandCount`, `sessionStart`, `activeThemeName`, `FORTUNES` into `NX.State`
- [x] 4.3 Extract `history.js`: command-history ring (push/back/forward/all) into `NX.History`
- [x] 4.4 Extract `output.js`: `print`, `printPromptEcho`, `printTable`, `escapeHtml`, `updatePrompt`, `updateStatus` into `NX.Output`
- [x] 4.5 Extract `themes.js`: themes map, `apply`, `toggleMode`, `names` into `NX.Themes`
- [x] 4.6 Extract `fs.js`: `FS` tree, `resolvePath`, `getNode`, `getAbsPath` into `NX.FS`
- [x] 4.7 Extract `dvr.js`: snapshots state, playback, and `wireTransport()` into `NX.DVR`
- [x] 4.8 Extract `autocomplete.js`: `show`/`hide` into `NX.Autocomplete`
- [x] 4.9 Extract `commands.js`: `COMMANDS`, `register`, `execute`, all 26 commands into `NX.Commands`
- [x] 4.10 Extract `boot.js`: boot animation sequence into `NX.Boot.start()`
- [x] 4.11 Move the remaining wiring (keydown handlers, focus management, mode toggle, font knob, stardate panel) into `main.js`
- [x] 4.12 `src/all.js` deleted. `MODULE_ORDER` restored to the 11 real modules. Final build is idempotent (md5 stable across runs), script parses clean, all 26 commands present

## 5. Smoke-test matrix

Most of these items require a real browser to visually verify. I completed everything testable in a headless Node environment (command execution, FS mutations, state changes, theme/command registries) and marked browser-only items for your manual verification.

### 5a. Headless verification (done by me)

- [x] 5.2 Command registry — all 26 commands registered: `help echo date whoami uptime ls cd pwd cat mkdir touch write rm tree calc weather colors joke fortune sysinfo history theme banner export clear user`
- [x] 5.3 / 5.4 FS navigation and mutations — end-to-end test ran `pwd`, `cd projects`, `ls`, `cat alpha.log`, `cd ..`, `mkdir newdir`, `ls` and confirmed correct outputs, cwd transitions, and tree mutations
- [x] 5.5 `calc 2+2*3` returned `= 8`; command-not-found path hit; `history` populated correctly
- [x] 5.6 `theme amber` applied correctly — `NX.State.activeThemeName === 'AMBER'` after call
- [x] 5.16 `window.NX` has exactly: `DOM`, `State`, `Output`, `History`, `Themes`, `FS`, `DVR`, `Autocomplete`, `Commands`, `Boot` (no extras, no missing)
- [x] Script parses clean (`node --check`), build is idempotent (md5 stable across runs)

### 5b. Browser-only — awaiting your verification

- [ ] 5.1 Boot sequence plays and completes normally; prompt becomes interactive
- [ ] 5.7 Light/dark mode toggle switches chassis and rescales CRT effects correctly in every theme
- [ ] 5.8 Font knob drag scales font size and shows the floating size indicator; the knob tooltip appears
- [ ] 5.9 Command history Up/Down arrows walk history; Tab completes command names
- [ ] 5.10 DVR: type several commands, then rewind, step back, step forward, play, pause, stop, fast-forward; `Home`/`End`/`Space`/`←`/`→` shortcuts all work
- [ ] 5.11 DVR record toggle: turn recording off, run commands, confirm no new snapshots appear; turn back on
- [ ] 5.12 Stardate panel shows live clock, day/date updating once per second
- [ ] 5.13 Status bar updates correctly (`CMD: N` on the left, `SESSION MM:SS | UTF-8` on the right)
- [ ] 5.14 `clear` command clears output without breaking the DVR or prompt
- [ ] 5.15 Clicking anywhere outside the transport bar returns focus to the prompt
- [ ] 5.17 Browser console shows no errors or warnings during boot or normal operation

## 6. Documentation and cleanup

- [x] 6.1 Updated README.md with a "Development / Source layout / Build" section describing `src/`, `node build.mjs`, and the edit-build-reload loop; the end-user quick-start is unchanged
- [x] 6.2 Updated NEXTERM-Specification.md to reflect the new source/artifact split (Executive Summary, Key Differentiators, Section 2 Architecture)
- [x] 6.3 No `.gitignore` exists in the repo, so `terminal.html` is trivially not gitignored and will stay committed
- [x] 6.4 `openspec validate --changes modularize-core --strict` passes
- [x] 6.5 Re-ran the headless smoke test on the rebuilt `terminal.html`; browser-only items still await your verification (see section 5b)

## 7. Ready for next change

- [x] 7.1 `persistent-session` can cleanly add `src/persist.js` — the headless end-to-end test demonstrated that `NX.State`, `NX.FS.FS`, `NX.History.all()`, `NX.Themes`, and `NX.DVR` are all accessible through their public APIs and mutate cleanly via their existing methods. A `persist.js` module can pull from any of them without touching any other module's internals
- [ ] 7.2 Archive `modularize-core` and proceed to `persistent-session` _(awaiting user browser verification of section 5b)_
