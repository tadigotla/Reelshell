## ADDED Requirements

### Requirement: Source tree lives under `src/`

The terminal's JavaScript SHALL live in separate files under a top-level `src/` directory, one file per named module. `terminal.html` at the repository root SHALL be a generated artifact — committed to the repo for direct-open usability, but never edited by hand.

#### Scenario: Developer edits JavaScript
- **WHEN** a developer needs to change any runtime behavior of the terminal
- **THEN** they edit a file under `src/`, run the build, and reload `terminal.html` in a browser
- **AND** they do not edit the `<script>` contents of `terminal.html` directly

#### Scenario: User clones and opens
- **WHEN** a user clones the repository and double-clicks `terminal.html`
- **THEN** the terminal loads and runs without requiring any build step, npm install, or local server
- **AND** the user sees the same boot sequence and functionality as before the modularization

### Requirement: Modules are namespaced under `window.NX`

Every source module SHALL attach its public surface to a property of the shared `window.NX` global (e.g., `NX.FS`, `NX.DVR`, `NX.Commands`). Modules SHALL NOT attach arbitrary names directly to `window`, and SHALL NOT import from one another via ES `import` statements.

#### Scenario: Module exports its API
- **WHEN** a module file is loaded by the browser
- **THEN** it wraps its contents in an IIFE that receives (or initializes) `window.NX` and attaches a single `PascalCase` property to it
- **AND** the module's internal helpers remain private to that IIFE

#### Scenario: Module references another module
- **WHEN** one module needs to call a function from another module
- **THEN** it references it via `NX.<OtherModule>.<function>` inside runtime code (not at module load time)
- **AND** the reference resolves successfully because the target module appears earlier in the concatenated build output

#### Scenario: Developer debugs in devtools
- **WHEN** a developer opens browser devtools and inspects `window.NX`
- **THEN** they see a top-level object listing every module (`FS`, `DVR`, `Commands`, `State`, `Output`, `History`, `Themes`, `Autocomplete`, `Boot`, `DOM`)
- **AND** they can invoke module functions directly (e.g., `NX.FS.resolvePath('~/docs')`) to introspect state

### Requirement: Canonical module inventory

The initial `src/` directory SHALL contain exactly these modules, each owning a well-defined slice of the current monolith:

- `dom.js` — cached `document.getElementById` references, no other state
- `state.js` — mutable session state: cwd, username, theme name, session start, command count
- `output.js` — `print`, `printTable`, `escapeHtml`, `updatePrompt`, `updateStatus`, prompt-echo helper
- `history.js` — command history ring and index pointer
- `themes.js` — theme definitions, theme switching, mode (light/dark) toggle
- `fs.js` — virtual filesystem tree, `resolvePath`, `getNode`, `getAbsPath`, and CRUD helpers
- `dvr.js` — snapshot timeline, playback timer, transport button wiring, progress UI
- `autocomplete.js` — tab completion and hint display
- `commands.js` — command registry (`register`, `execute`) and every built-in command's implementation
- `boot.js` — boot banner animation and initial prompt
- `main.js` — entry point that wires the input handler, attaches DVR event listeners, and kicks off the boot sequence

#### Scenario: Every function in the pre-refactor script has a home
- **WHEN** the refactor is complete
- **THEN** every top-level function that previously lived in `terminal.html`'s `<script>` block resides in exactly one module file under `src/`
- **AND** no function is duplicated across modules
- **AND** `src/` contains no temporary or scratch files (e.g., no `src/all.js` left over from migration)

#### Scenario: Module owns its state
- **WHEN** a module manages state (e.g., `dvr.js` owns `snapshots`, `history.js` owns the history array)
- **THEN** that state is declared inside the module's IIFE and exposed only through the module's public API on `NX.<Module>`
- **AND** no other module reaches into that state by any other path

### Requirement: Module dependency graph is acyclic

Modules SHALL form a directed acyclic graph of dependencies, with `commands.js` as the glue layer and `main.js` as the root. No module except `commands.js` and `main.js` SHALL depend on `commands.js`. Cyclic references between non-command modules are forbidden.

#### Scenario: Adding a new module
- **WHEN** a new module is added to `src/`
- **THEN** the implementer inserts it into the `MODULE_ORDER` list in `build.mjs` at a position consistent with the dependency graph
- **AND** the module only references other modules that appear earlier in `MODULE_ORDER`

#### Scenario: Accidental cycle
- **WHEN** a change introduces a cycle (e.g., `fs.js` calls `NX.DVR` at parse time)
- **THEN** either the cycle is removed by refactoring, or the parse-time reference is deferred to runtime (resolved inside a function body, not at module load)
- **AND** the change is not accepted with a lazy workaround like `setTimeout` hacks

### Requirement: Deterministic build from `src/` to `terminal.html`

The build script (`build.mjs`) SHALL be a single dependency-free Node script that reads every file in `src/` in a fixed deterministic order, concatenates them with module-boundary separator comments, and inlines the result into `terminal.template.html` at a designated placeholder (`<script id="app"></script>`). The script SHALL NOT use any npm package, SHALL NOT require `package.json` or `node_modules`, and SHALL run with a vanilla Node installation.

#### Scenario: Developer runs the build
- **WHEN** a developer runs `node build.mjs` from the repo root
- **THEN** `terminal.html` is rewritten with the concatenated module contents inlined into a single `<script>` block
- **AND** the script prints a short report showing the total byte count, module count, and per-module sizes
- **AND** the build completes in well under one second on a normal machine

#### Scenario: Build is idempotent
- **WHEN** the build is run twice in a row with no source changes
- **THEN** the second run produces a `terminal.html` byte-identical to the first run's output
- **AND** no timestamps, no random identifiers, no build metadata vary between runs

#### Scenario: Build uses only Node built-ins
- **WHEN** the build script is inspected
- **THEN** its only `import` or `require` statements reference `node:` built-in modules (e.g., `node:fs`, `node:path`, `node:url`)
- **AND** the repository contains no `package.json`, `package-lock.json`, or `node_modules/`

#### Scenario: Build preserves module ordering
- **WHEN** the build concatenates modules
- **THEN** it uses an explicit `MODULE_ORDER` list inside `build.mjs` rather than alphabetical or filesystem-order iteration
- **AND** each concatenated module is preceded by a boundary comment of the form `/* ── <module-file-name> ── */` so the generated file remains navigable

### Requirement: Generated `terminal.html` is marked as generated

The generated `terminal.html` SHALL begin with a prominent comment indicating that it is a build artifact and pointing contributors at the source tree.

#### Scenario: Viewing the generated file
- **WHEN** a contributor opens `terminal.html` in an editor
- **THEN** the first non-`<!doctype>` line is an HTML comment stating the file is generated from `src/` and instructing the reader to edit sources and rebuild instead

### Requirement: Zero observable behavior change

The `terminal.html` produced by the refactor SHALL behave identically to the pre-refactor `terminal.html` from the end-user's perspective. Every command, keyboard shortcut, theme, mode, DVR button, autocomplete behavior, boot sequence, status line, stardate panel, font knob, and visual detail SHALL match the prior version.

#### Scenario: Smoke test matrix passes
- **WHEN** the implementer runs through the smoke-test matrix enumerated in `tasks.md` (all 25 commands, all 4 themes, light/dark, DVR play/pause/stop/record/scrub, autocomplete, history navigation, font knob)
- **THEN** every item behaves identically to the pre-refactor version
- **AND** no console warnings or errors appear that were not present before

#### Scenario: Regression discovered after archive
- **WHEN** a regression is found that traces to the refactor
- **THEN** it is treated as a bug in `modularize-core`, not a feature request, and fixed before any dependent change (`persistent-session`) is applied

### Requirement: README documents the new developer workflow

The README SHALL be updated to describe the new source layout, the build command, and the "edit `src/` → build → reload" loop. The README SHALL continue to present the "open `terminal.html`" quick-start for end users, making clear that the build step is only required for contributors.

#### Scenario: New contributor reads the README
- **WHEN** a new contributor reads the README
- **THEN** they understand that `terminal.html` is generated, that source lives in `src/`, and how to run the build
- **AND** they also understand that no build is required to just run the terminal

#### Scenario: End user reads the README
- **WHEN** a non-contributor reads the README
- **THEN** the quick-start remains "open `terminal.html` in any modern browser" with no build step mentioned upfront
