# NEXTERM

A retro CRT terminal emulator that lives in a single HTML file.

NEXTERM is a fully client-side, browser-based shell with a virtual filesystem, 25+ built-in commands, four color themes, a brushed-metal DVR transport for replaying your session, and a glass-pane stardate clock. Zero dependencies, zero build step, zero server — just open [terminal.html](terminal.html) in any modern browser.

## Quick start

```sh
open terminal.html        # macOS
xdg-open terminal.html    # Linux
start terminal.html       # Windows
```

That's it. The whole product is a single ~50KB HTML file.

## Highlights

- **Authentic CRT aesthetic** — phosphor glow, scanlines, screen flicker, BIOS-style boot sequence, four color themes (green / amber / cyan / red), all desaturated for comfortable extended use.
- **Virtual filesystem** with the commands you'd expect: `ls`, `cd`, `pwd`, `cat`, `tree`, `mkdir`, `touch`, `write`, `rm`. Supports `~`, `..`, `.`, absolute and relative paths.
- **Session DVR** — every command snapshots the terminal output. A brushed-metal transport bar lets you scrub, step, play back, stop, or toggle recording mid-session.
- **Stardate panel** — the DVR's right-hand glass pane shows a live clock, day/date, and a slowly cycling ambient line (uptime, command count, active theme, fortunes). Pure-CSS frosted-glass effect over the brushed-metal substrate.
- **Keyboard-first** — full command history (`↑` / `↓`), tab completion, transport shortcuts (`Space`, `Home`, `End`, `←`, `→`), and a focus model that puts you back in the prompt the moment you click anywhere outside the transport.
- **Persistent session** — reload the page and your theme, mode, font size, username, filesystem, command history, DVR timeline, and current screen are restored exactly where you left them. Nothing ever leaves the device (strict CSP blocks all network egress). Run `wipe` to erase everything with a one-step confirmation.

## Built-in commands

| Command | Description |
|---|---|
| `help [command]` | Show available commands or details for one |
| `clear` | Clear the terminal output |
| `echo <text>` | Print text |
| `date` / `uptime` | Current date / session uptime |
| `whoami` / `user <name>` | Show or change the active username |
| `ls [path]` / `tree [path]` | List directory contents |
| `cd <path>` / `pwd` | Navigate the virtual filesystem |
| `cat <file>` | Display file contents |
| `mkdir <name>` / `touch <name>` / `rm <file>` | Manipulate filesystem entries |
| `write <file> <content>` | Write content to a file |
| `calc <expr>` | Evaluate a math expression |
| `weather [city]` | Mock weather report |
| `colors` | Show the active color palette |
| `joke` / `fortune` | Programming jokes and fortunes |
| `sysinfo` | OS / shell / user / snapshot / recording state |
| `history` | Command history |
| `theme <green\|amber\|cyan\|red>` | Switch color theme |
| `banner` | Re-display the boot banner |
| `export` | Download the session as a text file |
| `wipe` | Erase all persisted state and reload (confirm with `yes`) |

## Session DVR

Every command appends a snapshot of the terminal output to an in-memory timeline. The DVR transport bar lives at the bottom of the screen:

| Button | Action | Shortcut |
|---|---|---|
| ⏪ Rewind | Jump to snapshot zero | `Home` |
| ⏮ Back | Step to previous snapshot | `←` |
| ▶ Play | Auto-advance at 1.2s intervals | `Space` |
| ⏸ Pause | Hold current snapshot | `Space` |
| ⏹ Stop | Halt playback and return to live | — |
| ⏭ Ahead | Step to next snapshot | `→` |
| ⏩ Fast forward | Jump to latest and return to live | `End` |
| ⏺ Record | Toggle snapshot capture (default on) | — |

Run `status` (well — `sysinfo`) any time to see how many snapshots you've recorded and whether recording is currently armed.

## Persistence & privacy

Every reload restores your last session. Two tiers of local storage:

- **Tier 1** (`localStorage`, synchronous, ~1 KB): theme, mode, font size, username, cwd, recording flag — read before first paint so the terminal opens in your exact visual state with no flash of default.
- **Tier 2** (`IndexedDB`, asynchronous, bounded): command history (max 500), virtual filesystem, DVR snapshots (max 200), the current screen, session start, command count — hydrated after the boot animation finishes.

Nothing persisted ever leaves the device. The shipped HTML includes a strict Content-Security-Policy meta tag (`connect-src 'none'`) that blocks every form of network egress the browser supports — fetch, WebSocket, EventSource, beacon, external scripts, external fonts, external images. There is no telemetry, no analytics, no external anything.

- `sysinfo` shows the persistence block: tiers armed, bytes used, schema version, last-saved time.
- `wipe` asks for `yes` confirmation, then clears `localStorage`, deletes the `nexterm` IndexedDB database, and reloads the page to a pristine state.

A schema version is stamped on every persisted record. If a future version of nexterm bumps the schema, old data is ignored (not migrated) and the terminal boots with defaults — no crash, no stale state.

## Project layout

```
.
├── terminal.html              # The entire product
├── NEXTERM-Specification.md   # Long-form spec — architecture, design system, edge cases
├── openspec/                  # Spec-driven change tracking
│   ├── specs/                 # Current capabilities (dvr-transport, glass-pane-stardate, ...)
│   └── changes/archive/       # Historical change proposals with their design + tasks
└── README.md
```

## Development

NEXTERM uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for spec-driven changes. Each feature lands as a proposal → design → spec deltas → task list → implementation, then archives into `openspec/changes/archive/`. The `openspec/specs/` directory is the source of truth for what the terminal currently does. Browse the archive to see how the brushed-metal panel, stardate clock, and subdued themes were each scoped and shipped.

### Source layout

```
src/                       # JavaScript modules — source of truth
├── dom.js                 # cached element refs
├── state.js               # session state (cwd, user, theme, counters)
├── output.js              # print, escapeHtml, status/prompt updaters
├── history.js             # command history ring
├── themes.js              # palette definitions, apply, mode toggle
├── fs.js                  # virtual filesystem + path resolver
├── dvr.js                 # snapshot timeline + playback transport
├── autocomplete.js        # tab completion hints
├── commands.js            # command registry + all 26 built-ins
├── boot.js                # boot animation and initial banner
└── main.js                # keybindings, font knob, stardate, boot kickoff

terminal.template.html     # HTML shell with a <script id="app"></script> slot
build.mjs                  # dependency-free Node script (concatenates src/ into the template)
terminal.html              # GENERATED — commit this so it stays double-clickable
```

Every JavaScript module is an IIFE that attaches its public surface to `window.NX.<Module>`. There is no runtime module system — the build script concatenates the files into a single `<script>` block. In devtools, `window.NX` gives you a live handle on every module for debugging.

### Build

```sh
node build.mjs
```

Reads `src/*.js` in the order declared in `MODULE_ORDER`, concatenates them with module-boundary comments, and inlines the result into `terminal.template.html` to produce `terminal.html`. No npm, no `package.json`, no bundler — just a standard Node install. Typical runtime is milliseconds.

Dev loop is: edit a file in `src/`, run `node build.mjs`, reload the browser. Do **not** edit `terminal.html` directly — your changes will be clobbered on the next build.

End users still just open `terminal.html`. The build step is only for contributors.

## License

MIT — see [LICENSE](LICENSE).
