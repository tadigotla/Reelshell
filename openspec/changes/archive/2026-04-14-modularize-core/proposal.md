## Why

`terminal.html` has grown to ~1525 lines with a single 700-line `<script>` IIFE containing the virtual FS, DVR, command registry, output rendering, themes, autocomplete, boot sequence, and session state all tangled together. The upcoming `persistent-session` change needs a clean seam to plug a `Persist` module into — serializing the FS, history, theme, and DVR state from a monolith means reaching into closure-local variables, which is both risky and untestable. Splitting the monolith into modules now is a prerequisite for doing persistence without regressions.

## What Changes

- Introduce a `src/` directory containing the terminal's JavaScript split into discrete modules. Each module is a plain `.js` file exposing a small namespaced API on `window.NX.<Module>`; modules wire together in `src/main.js`.
- Introduce `terminal.template.html` — the HTML shell (styles, markup, empty `<script id="app"></script>` slot) with all JS removed.
- Introduce `build.mjs` — a dependency-free Node script (no npm install, no lockfile, no bundler) that reads every file in `src/`, concatenates them in a deterministic order, and inlines the result into `terminal.template.html` to produce `terminal.html`.
- `terminal.html` becomes a **build artifact**, not the source of truth. It remains committed to the repo so double-clicking still works (no server, no module loader, no `file://` CORS issues).
- Add `make build` (or equivalent `node build.mjs`) documentation to the README. Dev loop is: edit `src/*.js`, run build, reload browser.
- Modules introduced (kebab-case file names, `PascalCase` namespace):
  - `state.js` → `NX.State` — mutable session state (cwd, user, theme name, command count, session start)
  - `output.js` → `NX.Output` — `print`, `printTable`, `escapeHtml`, `updatePrompt`, `updateStatus`
  - `fs.js` → `NX.FS` — virtual filesystem tree, `resolvePath`, `getNode`, `getAbsPath`, CRUD
  - `history.js` → `NX.History` — command history ring + index
  - `dvr.js` → `NX.DVR` — snapshots, playback, timer, transport UI wiring
  - `themes.js` → `NX.Themes` — theme definitions, activation, mode toggle
  - `commands.js` → `NX.Commands` — `register()`, `execute()`, the `COMMANDS` registry, plus all `register('ls', ...)`-style calls
  - `autocomplete.js` → `NX.Autocomplete` — tab completion + hint display
  - `boot.js` → `NX.Boot` — boot banner animation
  - `dom.js` → `NX.DOM` — `document.getElementById` lookups, cached once
  - `main.js` — entry point: imports nothing (all globals), calls `NX.Boot.start()`, wires the input handler, registers commands
- **Zero observable behavior change.** The shipped `terminal.html` after the build must be functionally identical to the current one. Every existing command, every keyboard shortcut, every visual detail, every theme, the DVR, the stardate panel, the font knob, light/dark mode — all unchanged from the user's perspective.
- **No new dependencies.** No npm, no package.json, no node_modules, no bundler, no TypeScript, no transpiler. Node is only used as a scripting runtime for `build.mjs` — the terminal itself has no Node dependency.

## Capabilities

### New Capabilities
- `modular-source`: the convention that terminal JavaScript lives as separate `.js` modules under `src/`, is namespaced under `window.NX`, and is assembled into `terminal.html` by a build script. Captures the module inventory, the namespace contract, the build script's guarantees (deterministic ordering, no external deps, idempotent output), and the relationship between source and shipped artifact.

### Modified Capabilities
_None._ This change is a pure refactor — no existing spec's requirements (behavior visible to a user reading `terminal.html`) change. All current capability specs (`dvr-transport`, `dvr-panel-layout`, `glass-pane-stardate`, `visual-comfort`, `light-mode`, `device-controls`) continue to hold without modification.

## Impact

- **Code:** Every line of JavaScript currently inside `terminal.html`'s `<script>` block moves into `src/*.js`. The HTML/CSS is extracted to `terminal.template.html` largely unchanged.
- **Repo layout:** New top-level directories/files: `src/`, `terminal.template.html`, `build.mjs`. `terminal.html` becomes generated output (still committed, still openable).
- **Developer workflow:** Editing `terminal.html` directly is discouraged — changes must go through `src/` + rebuild. README updated to reflect this.
- **No runtime impact:** the shipped `terminal.html` has the same size class, same load behavior, same zero-dependency browser footprint.
- **Unblocks:** `persistent-session` change (next) can now add a `src/persist.js` module cleanly wired to `FS`, `State`, `History`, `DVR`, and `Themes` without touching a monolithic closure.
