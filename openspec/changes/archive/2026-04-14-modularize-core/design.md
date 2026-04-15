## Context

`terminal.html` today is a single file with ~1525 lines: inline CSS, inline HTML markup, and a ~700-line IIFE containing every piece of runtime logic — virtual filesystem, DVR snapshot timeline, command registry + all 25 commands, output rendering, theme engine, light/dark mode, autocomplete, boot animation, session state, and keyboard handling. Everything lives in one closure, and everything reaches freely into everything else through closure-local references. This served the project well for v1 (zero build, "just open the file"), but the upcoming `persistent-session` change needs to serialize FS + history + theme + DVR state into IndexedDB and re-hydrate it on load — which requires stable, nameable module boundaries and testable seams. Doing persistence on top of the current monolith would mean sprinkling `localStorage.setItem` calls across unrelated code paths and hoping nothing gets missed.

Constraints carried forward from v1 and the user's explicit preferences:
- The **shipped artifact must still be a single openable HTML file**. No server, no bundler at runtime, no `file://` module loading. Users double-click `terminal.html` and it works.
- **No npm / no lockfile / no node_modules.** Node is acceptable only as a scripting runtime for the build script; the terminal itself imports nothing.
- **Zero observable behavior change** after the refactor. If a user can tell the difference before and after, something is wrong.

Stakeholders: single maintainer, no downstream consumers, no external integrations. This reduces coordination cost to near zero but raises the bar for self-discipline around the "no behavior change" rule.

## Goals / Non-Goals

**Goals:**
- Carve the monolithic `<script>` into named, self-contained modules under `src/` with a clear dependency graph and a shared `window.NX` namespace.
- Introduce a minimal, dependency-free build step (`node build.mjs`) that concatenates `src/*.js` into `terminal.html` in a deterministic order.
- Keep `terminal.html` committed to the repo so the "open the file" UX is preserved even for users who never run the build.
- Make it trivial to add a new module (e.g., the upcoming `persist.js`) without touching unrelated modules.
- Make the module seams tight enough that each module could, in principle, be unit-tested against a fake DOM — even if we don't actually write those tests in this change.

**Non-Goals:**
- Not adopting ES modules at runtime, not adding a bundler (esbuild, rollup, webpack, vite), not adopting TypeScript, not adding a test framework, not adding a linter, not adding a formatter, not adding a package.json.
- Not rewriting any logic. If the current code has a bug or an awkward pattern, it is preserved. Bug fixes and style cleanups go in follow-up changes.
- Not splitting the 25 commands into one-file-per-command. All commands stay in `commands.js` for now; splitting further is a future refactor if the file gets unwieldy.
- Not changing the HTML markup or CSS. The template is the current HTML verbatim with the `<script>` block replaced by a placeholder.
- Not persisting anything. Persistence is the next change; this one only creates the seams.

## Decisions

### 1. Namespace on `window.NX`, not ES modules

Each source file assigns to a property on a shared global namespace:

```js
// src/fs.js
(function(NX) {
  const FS = { /* tree */ };
  function resolvePath(s) { /* ... */ }
  NX.FS = { FS, resolvePath, getNode, getAbsPath };
})(window.NX = window.NX || {});
```

**Why not `<script type="module">`?** Because Chrome refuses to load ES modules from `file://` origins — the primary way users open this app. Same for `import`/`export` statements once inlined; they'd require `type="module"` to parse, which triggers the same restriction. A single plain `<script>` block with all modules concatenated side-steps the issue entirely.

**Why not IIFE-returning-object pattern without a shared namespace?** Because we'd still need somewhere for `main.js` to grab references from. A single `NX` global is the minimum shared surface, and it's also a convenient debugging handle (`NX.FS.resolvePath('~/foo')` in devtools).

**Why not attach directly to `window`?** Pollution. `NX` is one name; `FS`, `DVR`, `Commands`, `Themes`, `Output`, `History`, `State`, `Autocomplete`, `Boot`, `DOM` would be ten.

**Alternatives considered:** ES modules + local dev server (breaks "just open the file"); IIFE + closure sharing via parameters (fragile ordering); a bundler (violates "no npm").

### 2. Build = concatenation, not bundling

`build.mjs` is a Node script using only `node:fs` and `node:path`. Algorithm:

```
1. Read terminal.template.html as string
2. Read each file in MODULE_ORDER from src/ as string
3. Join with '\n\n/* ── <module name> ── */\n\n' separators
4. Replace the <script id="app"></script> placeholder in the template
   with <script>\n<concatenated>\n</script>
5. Write result to terminal.html
6. Print a short report: bytes, module count, module sizes
```

No AST parsing, no tree-shaking, no minification, no source maps. The total runtime is milliseconds.

**Why deterministic `MODULE_ORDER` instead of alphabetical / auto-discovery?** Because some modules read others at definition time (e.g., `commands.js` calls `NX.FS.resolvePath` inside command handler bodies, but those bodies don't run until `execute()` is called — so order only matters for things that run at parse time, which we minimize). An explicit ordered list is self-documenting and makes dependency surprises loud. If a new module gets added, the author has to think about where it goes.

Proposed order:

```js
const MODULE_ORDER = [
  'dom.js',          // DOM element cache — no dependencies
  'state.js',        // session state — no dependencies
  'output.js',       // print/escape/status — depends on DOM, State
  'history.js',      // command history ring — no dependencies
  'themes.js',       // theme + mode — depends on State, DOM
  'fs.js',           // virtual filesystem — no dependencies
  'dvr.js',          // snapshot timeline — depends on DOM, Output
  'autocomplete.js', // tab complete — depends on DOM, FS, Commands
  'commands.js',     // command registry + all commands — depends on ~everything
  'boot.js',         // boot animation — depends on DOM, Output
  'main.js',         // wiring — depends on everything
];
```

**Alternatives considered:**
- **Use esbuild for `--bundle --format=iife`.** Adds an npm dependency to the build toolchain. Rejected per constraint.
- **Use a Makefile with `cat`.** Works, but less portable (Windows devs), and less pleasant for the "replace placeholder in template" step. Node is already installed on any dev machine touching JS.
- **Inline `<script src="src/foo.js">` tags.** Breaks `file://` because of script-loading policies in some browsers and, more importantly, means the shipped file isn't really single-file anymore.

### 3. `terminal.html` stays committed

The build artifact is checked into git. This is unusual — most projects gitignore built output — but essential here because:
- The README promises "just open `terminal.html`."
- A user who clones the repo and double-clicks must get a working terminal without running any build.
- Hosting the file from GitHub Pages / a raw.githubusercontent.com link must Just Work.

The cost is that PRs touching source will include a noisy diff to the generated file. Mitigation: the build is deterministic, so the generated diff is reviewable (it's the same source, just inlined). A pre-commit hook could enforce "source and generated are in sync" but is out of scope for this change — manual discipline is sufficient for a single-maintainer project.

**Alternatives considered:** `.gitignore` the output and build in CI on push; publish builds via GitHub Releases only. Both break the "clone and open" flow.

### 4. No tests in this change

This is a pure refactor with zero observable behavior change. Verification is done by:
1. Running the build, getting `terminal.html`.
2. Opening it, manually exercising every command, every theme, every DVR button, every keyboard shortcut, light/dark toggle, font knob, autocomplete.
3. Diffing the generated `terminal.html` against the pre-refactor `terminal.html` — the diff should be "the script block is reordered and sprinkled with module separators, but the semantics are the same."

A proper test harness (JSDOM + vitest or similar) would need npm, violating the constraint. Smoke tests can come later as a separate proposal if the module seams survive their first real exercise (adding `persist.js`).

**Alternatives considered:** Add vitest + JSDOM (violates no-npm); hand-write a test runner in vanilla JS (disproportionate scope for this change).

### 5. Module dependency direction

Strictly one-way, enforced by module order:

```
                ┌─────┐ ┌───────┐
                │ DOM │ │ State │        ← leaves (no deps)
                └──┬──┘ └───┬───┘
                   │        │
                   ├────────┼──────┐
                   ▼        ▼      ▼
              ┌────────┐ ┌──────┐ ┌──────┐
              │ Output │ │Themes│ │  FS  │
              └───┬────┘ └──────┘ └───┬──┘
                  │                    │
                  ▼                    │
              ┌────────┐                │
              │History │                │
              └───┬────┘                │
                  │                    │
                  ▼                    ▼
              ┌─────────┐    ┌──────────────┐
              │   DVR   │    │ Autocomplete │
              └────┬────┘    └───────┬──────┘
                   │                 │
                   └────────┬────────┘
                            ▼
                      ┌──────────┐
                      │ Commands │
                      └────┬─────┘
                           │
                           ▼
                      ┌───────┐
                      │ Boot  │
                      └───┬───┘
                          ▼
                     ┌────────┐
                     │  main  │   ← root (depends on everything)
                     └────────┘
```

No cycles allowed. If a cycle appears, the module graph is wrong and needs to be refactored — not worked around with lazy lookups. The one exception is `commands.js`, which is allowed to reference every other module because commands are inherently the glue layer: `ls` needs `FS`, `history` needs `History`, `theme` needs `Themes`, etc. This is fine; `commands.js` is a leaf from a graph perspective — nothing depends on it except `main.js`.

### 6. Interaction with the existing `src/` contents

The repo currently has no `src/` directory. If one appears during implementation (e.g., left over from a scratch branch), the implementer should confirm with the user before overwriting.

## Risks / Trade-offs

- **[Risk] A hidden ordering dependency gets missed during extraction and the concatenated output behaves differently from the original.** → **Mitigation:** Extract into one file first as a dry run (whole script verbatim in `src/all.js`), verify the built output is byte-identical to the current `terminal.html` modulo whitespace, then progressively move functions out of `src/all.js` into their final modules. At each step, rebuild and smoke-test.

- **[Risk] Someone (or future-me) edits `terminal.html` directly and the changes get clobbered on next build.** → **Mitigation:** Add a prominent auto-generated banner comment at the top of `terminal.html`: `<!-- GENERATED FROM src/ — DO NOT EDIT — run: node build.mjs -->`. Update the README to point contributors at `src/`. A pre-commit hook is out of scope but would be a cheap follow-up.

- **[Risk] The generated `terminal.html` diff in PRs becomes noisy and reviewers ignore it, hiding real regressions.** → **Mitigation:** The diff is deterministic and small for small source changes. Reviewers can grep for module boundary comments (`/* ── commands.js ── */`) to locate changes. Accept this as a known cost of the committed-artifact decision.

- **[Risk] `window.NX` collides with a global defined elsewhere.** → **Mitigation:** `NX` is short but specific; it's also wrapped in a `window.NX = window.NX || {}` idempotency guard in each module. Realistic collision probability: zero.

- **[Trade-off] Losing single-file grep-ability for debugging.** Today, `grep -n takeSnapshot terminal.html` finds everything. After the refactor, the generated file still contains all the code (so grep still works on the artifact), but source edits happen across multiple files. This is a net improvement: `grep -rn takeSnapshot src/` is just as fast and each match lands in a smaller, more focused file.

- **[Trade-off] Node becomes a *development* dependency.** Anyone contributing must have Node installed to run the build. Any modern dev machine already does. End users still don't need anything.

- **[Risk] Manual smoke test misses a regression because the test surface is large (25 commands × 4 themes × light/dark × DVR × autocomplete).** → **Mitigation:** Write a checklist in `tasks.md` that enumerates the exact smoke-test matrix to walk through before marking the change ready for archive. Accept that this is eyeballs, not automation.

## Migration Plan

1. Create `src/` with the module files empty (or stubbed with IIFE wrappers).
2. Write `build.mjs` and `terminal.template.html` with the current HTML/CSS and an empty `<script id="app">` placeholder.
3. Verify `node build.mjs` produces a file structurally matching current `terminal.html` (empty script body is fine for this pass).
4. Copy the entire current `<script>` body into `src/all.js` as a single temporary module. Rebuild. Open and exercise — should be identical to pre-refactor.
5. Progressively peel functions out of `src/all.js` into their target modules, rebuilding and smoke-testing after each move. Start with leaves (`dom.js`, `state.js`).
6. When `src/all.js` is empty, delete it. Final rebuild. Full smoke-test pass.
7. Update README with the new dev loop.
8. Commit, archive, move on to `persistent-session`.

**Rollback:** The pre-refactor `terminal.html` is in git history. A single `git revert` restores it. Since nothing else in the repo depends on the new `src/` structure, rollback is clean.

## Open Questions

- _(none at proposal time)_ — all decisions above are committed. If the implementation surfaces a constraint that forces a re-decision, update this section and flag to the user before proceeding.
