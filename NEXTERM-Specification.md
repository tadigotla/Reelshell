# NEXTERM — Web Terminal Emulator v3.2

**Technical Specification & Project Reference**

| Field | Value |
|-------|-------|
| Version | 3.2.0 |
| Type | Single-file HTML Application |
| License | MIT |
| Status | Production Ready |

---

## 1. Executive Summary

NEXTERM is a fully client-side, browser-based terminal emulator that ships as a single double-clickable HTML file. It provides an authentic retro-CRT terminal experience with a virtual filesystem, 20+ built-in commands, session DVR playback, and a themeable interface. It requires zero server-side infrastructure and runs entirely in the browser via vanilla JavaScript. The JavaScript source is authored as modular files under `src/` and concatenated into `terminal.html` by a dependency-free Node build script; the shipped artifact is still a single HTML file with no external runtime dependencies.

The application is designed for embedding in blogs, documentation sites, and interactive demos — particularly via Codepen embeds on platforms like Substack where direct HTML injection is not supported.

### 1.1 Key Differentiators

- **Zero runtime dependencies:** No frameworks, no npm packages, no lockfile. The shipped `terminal.html` is a single file with inline CSS and JavaScript. The dev build script (`build.mjs`) uses only Node built-ins.
- **Session DVR:** Full playback system with transport controls, progress scrubbing, and auto-play.
- **CRT aesthetics:** Scanline overlay, screen flicker, phosphor glow, and boot sequence animation.
- **Extensible command system:** Register new commands with a single function call.
- **Embeddable:** Works as a Codepen embed, GitHub Pages deployment, or standalone file.

---

## 2. Architecture

NEXTERM follows a "single-shipped-file, modular source" architecture. The HTML structure, CSS styling, and (concatenated) JavaScript logic are contained within one `terminal.html` file for portability and deployment simplicity. The JavaScript itself is authored as ~11 small modules under `src/` (one per concern: DOM refs, state, output, history, themes, filesystem, DVR, autocomplete, commands, boot, main wiring), each attaching to a shared `window.NX` namespace. A dependency-free `build.mjs` concatenates them into `terminal.html` at build time.

### 2.1 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Structure | HTML5 | Semantic layout, input handling, accessibility |
| Presentation | CSS3 | CRT effects, animations, responsive layout, theming |
| Logic | Vanilla JavaScript (ES6+) | Command engine, filesystem, DVR, state management |
| Typography | IBM Plex Mono + Share Tech Mono | Terminal body text and UI labels (Google Fonts) |

### 2.2 Component Structure

The terminal is composed of the following visual and logical layers, from top to bottom:

| Component | Role | CSS Class |
|-----------|------|-----------|
| CRT Wrapper | Outer shell with scanline and flicker effects | `.crt-wrapper` |
| Title Bar | macOS-style traffic lights, app name, status indicator | `.title-bar` |
| Output Area | Scrollable command output viewport | `.output-area` |
| Autocomplete Hint | Floating tooltip showing matching commands | `.autocomplete-hint` |
| Input Area | Prompt label and text input field | `.input-area` |
| Playback Surface | DVR transport controls and progress bar | `.playback-surface` |
| Status Bar | Command count, session timer, encoding info | `.status-bar` |

### 2.3 Boot Overlay

On load, a full-screen boot overlay simulates a BIOS-style startup sequence. Nine lines of boot diagnostics are rendered sequentially with randomized delays (120–200ms per line), after which the overlay fades out over 500ms and is removed from the DOM. The boot sequence includes a reference to the DVR subsystem initialization.

---

## 3. Command System

Commands are registered via a central registry object and executed through a unified dispatch function. The system supports argument parsing (including quoted strings), command history with arrow-key navigation, Tab autocomplete, and fuzzy "did you mean?" suggestions for unrecognized input.

### 3.1 Registration API

New commands are added with a single function call:

```
register(name, description, usage, handlerFunction)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| name | string | Command name (lowercase, no spaces) |
| description | string | One-line description shown in help output |
| usage | string | Usage pattern displayed for `help <command>` |
| handlerFunction | function(args) | Receives an array of parsed arguments |

### 3.2 Built-in Commands

The following 20 commands are pre-registered:

| Command | Category | Description |
|---------|----------|-------------|
| `help` | System | List all commands or show detail for a specific command |
| `clear` | System | Clear the terminal output area |
| `echo` | Utility | Print text to the terminal |
| `date` | Utility | Display current date and time |
| `whoami` | Utility | Show the active username |
| `user` | System | Change the active username (alphanumeric, max 16 chars) |
| `uptime` | Utility | Show session duration in hours, minutes, seconds |
| `ls` | Filesystem | List contents of the current or specified directory |
| `cd` | Filesystem | Change working directory (supports `~`, `..`, relative paths) |
| `pwd` | Filesystem | Print absolute working directory path |
| `cat` | Filesystem | Display contents of a file |
| `mkdir` | Filesystem | Create a new directory in the current location |
| `touch` | Filesystem | Create an empty file in the current location |
| `write` | Filesystem | Write text content to an existing file |
| `rm` | Filesystem | Remove a file or directory |
| `tree` | Filesystem | Render a recursive directory tree with box-drawing chars |
| `calc` | Utility | Evaluate a safe math expression |
| `weather` | Fun | Display a randomized mock weather report |
| `theme` | System | Switch terminal color theme (green, amber, cyan, red) |
| `banner` | System | Display the NEXTERM ASCII art banner |

Additional commands include: `colors`, `joke`, `fortune`, `sysinfo`, `history`, and `export`.

### 3.3 Input Features

- **History navigation:** Arrow Up/Down cycles through previously executed commands.
- **Tab completion:** Pressing Tab with a partial command auto-completes if there is a single match.
- **Autocomplete hint:** A floating tooltip shows all matching commands as the user types.
- **Ctrl+L:** Keyboard shortcut to clear the terminal (equivalent to the `clear` command).
- **Quoted arguments:** Arguments wrapped in double quotes are treated as single tokens.

---

## 4. Virtual Filesystem

NEXTERM includes an in-memory virtual filesystem implemented as a nested JavaScript object tree. Each node is either a directory (with a `children` object) or a file (with a `content` string). The filesystem persists for the duration of the browser session but resets on page reload.

### 4.1 Default Directory Structure

```
~/ (home)
├── readme.txt
├── notes.txt
├── projects/
│   ├── alpha.log
│   └── beta.conf
└── secret/
    └── .hidden
```

### 4.2 Path Resolution

The path resolver supports absolute paths (starting with `~` or `/`), relative paths from the current working directory, parent directory traversal with `..`, and current directory references with `.` — all following standard Unix conventions.

---

## 5. Session DVR (Playback System)

The Session DVR is the defining feature of NEXTERM. It records a snapshot of the terminal's output HTML after every command execution, enabling users to replay their session like a video recording. This is particularly valuable for blog embeds where readers can watch a scripted terminal walkthrough.

### 5.1 Snapshot Mechanism

After each command completes, the DVR captures `output.innerHTML` as a snapshot string and pushes it onto a `snapshots` array. The initial welcome screen (post-boot) is captured as snapshot zero. Snapshots are indexed sequentially and navigated via a pointer (`snapshotIdx`), where `-1` indicates live mode.

### 5.2 Transport Controls

The playback surface is styled as a brushed-metal hardware panel with etched, inset buttons. Six transport controls are provided:

| Button | Icon | Action | Keyboard |
|--------|------|--------|----------|
| Rewind | ⏪ | Jump to snapshot 0 (session start) | `Home` |
| Back | ⏮ | Step to the previous snapshot | `Arrow Left` |
| Play | ▶ | Auto-advance through snapshots at 1.2s intervals | `Space` |
| Pause | ⏸ | Stop auto-play, remain at current snapshot | `Space` |
| Ahead | ⏭ | Step to the next snapshot | `Arrow Right` |
| Fast Forward | ⏩ | Jump to latest snapshot and return to live mode | `End` |

### 5.3 Progress Bar

A scrubable progress track shows the current position within the snapshot timeline. The fill bar uses the terminal's active theme color with a glow effect. A metallic knob (radial gradient with shadow) marks the playhead position. Clicking anywhere on the track scrubs to that proportional snapshot index.

### 5.4 Playback Mode Behavior

When the user enters playback mode (any state where `snapshotIdx !== -1`), the following changes take effect:

- The command input field is disabled and shows a playback-mode placeholder message.
- A pulsing amber "PLAYBACK" badge appears on the transport bar.
- The title bar status dot changes from green to amber.
- The status mode label updates to "PLAYING" or "PLAYBACK".
- Auto-play stops automatically when the last snapshot is reached.
- Pressing Fast Forward or executing a new command snaps back to live mode.

---

## 6. Visual Design System

### 6.1 CRT Effects

Three layered pseudo-elements create the CRT monitor aesthetic:

- **Scanlines:** A `repeating-linear-gradient` with 4px pitch and 4% opacity, applied via `::before` on the wrapper.
- **Screen flicker:** A `::after` overlay with a rapid 80ms alternate animation cycling between 97% and 100% opacity.
- **Phosphor glow:** `box-shadow` on the wrapper with an 80px green spread, plus `text-shadow` on the prompt text.

### 6.2 Color Themes

Four themes are available, each setting two CSS custom properties (`--term-green` and `--term-green-glow`) that cascade throughout the interface:

| Theme | Primary Color | Hex Value | Glow Color |
|-------|--------------|-----------|------------|
| Green (default) | Electric Green | `#39FF14` | `rgba(57, 255, 20, 0.35)` |
| Amber | Warm Amber | `#FFB700` | `rgba(255, 183, 0, 0.35)` |
| Cyan | Bright Cyan | `#00E5FF` | `rgba(0, 229, 255, 0.35)` |
| Red | Signal Red | `#FF3333` | `rgba(255, 51, 51, 0.35)` |

### 6.3 Typography

- **IBM Plex Mono:** Used for all terminal output, command input, and general body text. Chosen for its excellent readability at small sizes and authentic terminal character.
- **Share Tech Mono:** Used for the title bar, boot sequence, progress labels, and playback badge. Provides a more mechanical, hardware-label feel.

### 6.4 Playback Surface Design

The transport control bar is designed to evoke physical audio/video hardware:

- **Brushed metal texture:** A repeating 2px vertical gradient at 0.6% white opacity simulates fine machining lines.
- **Etched groove:** A top-edge highlight line with a 1px shadow underneath creates a milled channel effect.
- **Inset buttons:** Multi-layered box-shadows with inner dark shadows and outer light edges simulate physically recessed controls.
- **Active state:** Pressed buttons deepen the inset shadow, and the icon gains a colored glow matching the button's function (amber for play, green for others).

---

## 7. Deployment & Embedding

### 7.1 Deployment Options

| Method | Complexity | Best For |
|--------|-----------|----------|
| Open directly in browser | None | Local testing and development |
| GitHub Pages | Low | Free hosting with custom domain support |
| Netlify / Vercel | Low | CI/CD integration, instant deploys from git |
| Codepen embed | Low | Blog embeds (Substack, Medium, WordPress) |
| Self-hosted (any static server) | Medium | Full control over caching and headers |

### 7.2 Codepen Embedding

For Substack and similar platforms that restrict custom HTML, the recommended approach is to paste the source into a Codepen pen and use Codepen's native embed support. The embed renders as an interactive iframe, preserving full keyboard and mouse interactivity.

### 7.3 API Integration

Commands can make `fetch()` calls to external REST APIs, provided the target API serves over HTTPS and returns appropriate CORS headers (`Access-Control-Allow-Origin`). API keys should never be embedded in client-side code; a lightweight proxy (Cloudflare Worker or Vercel Edge Function) is recommended to hold secrets.

Example pattern:

```javascript
register('ask', 'Ask the AI', 'ask <question>', async function(args) {
  print('Thinking...', 'line-system');
  var res = await fetch('https://your-api.com/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: args.join(' ') })
  });
  var data = await res.json();
  print(data.answer, 'line-success');
});
```

---

## 8. Extensibility Guide

### 8.1 Adding a Custom Command

Register a new command by calling `register()` with four arguments:

```javascript
register('greet', 'Say hello', 'greet <name>', function(args) {
  var name = args[0] || 'World';
  print('Hello, ' + escapeHtml(name) + '!', 'line-success');
});
```

### 8.2 Output Helpers

| Function | Parameters | Purpose |
|----------|-----------|---------|
| `print(html, className)` | HTML string, optional CSS class | Append a line to the output area |
| `printTable(headers, rows)` | Array of strings, array of arrays | Render a styled table |
| `printPromptEcho(cmd)` | Command string | Echo the command with a styled prompt prefix |
| `escapeHtml(str)` | Raw string | Sanitize user input to prevent XSS |

### 8.3 Output Line Classes

| Class Name | Color | Use Case |
|------------|-------|----------|
| `line-success` | Green | Successful operations, confirmations |
| `line-error` | Red | Errors and failures |
| `line-info` | Cyan | Informational output |
| `line-warn` | Amber | Warnings and usage hints |
| `line-accent` | Magenta | Highlighted or decorative content |
| `line-system` | Gray (italic) | System messages and tips |

### 8.4 Adding Filesystem Content

Extend the default filesystem by adding entries to the `FS` object before boot. Directories require a `type` of `"dir"` with a `children` object; files require a `type` of `"file"` with a `content` string.

---

## 9. Browser Support & Performance

### 9.1 Supported Browsers

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome / Edge | 88+ | Full support including all CSS effects |
| Firefox | 85+ | Full support |
| Safari | 14+ | Full support; slight rendering differences in scrollbar styling |
| Mobile Chrome / Safari | Latest | Responsive layout adapts; on-screen keyboard triggers for input |

### 9.2 Performance Characteristics

- File size: approximately 22 KB uncompressed (single HTML file with all CSS and JS inline).
- No external runtime dependencies beyond two Google Fonts requests.
- Snapshot storage grows linearly with command count; each snapshot stores a copy of the output HTML string.
- CSS animations (scanlines, flicker, pulse) are GPU-composited and do not impact main-thread performance.
- The boot sequence uses async/await with setTimeout for non-blocking sequential rendering.

---

## 10. Known Limitations & Future Considerations

### 10.1 Current Limitations

- The virtual filesystem is in-memory only and does not persist across page reloads.
- DVR snapshots store full HTML copies, which may consume significant memory in very long sessions (hundreds of commands).
- The `calc` command uses `Function()` for evaluation, which is sandboxed to numeric expressions but should not be extended to arbitrary code execution.
- Codepen embeds inherit Codepen's Content Security Policy, which may restrict certain `fetch()` targets.

### 10.2 Potential Enhancements

- Persist filesystem and session snapshots to localStorage or IndexedDB.
- Add a scriptable macro system for pre-recorded demo sequences.
- Implement piping and output redirection between commands.
- Add a plugin loader for dynamically registering command packs from external scripts.
- Support WebSocket connections for real-time backend command execution.
- Implement differential snapshot storage to reduce memory footprint.
