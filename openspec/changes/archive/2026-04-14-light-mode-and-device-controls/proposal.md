## Why

Three usability gaps surfaced after the stardate panel landed: (1) NEXTERM only ships a dark theme — useful at night, harsh in daylight; (2) the glass pane wastes vertical space on a `LOCAL` label that adds nothing, and the boot-time welcome help line clutters the output area on every load; (3) there's no way for a user to scale the terminal output font without browser zoom, which throws the chassis layout off. All three are small, physical-control-flavored additions that fit the project's "hardware terminal" identity.

> **Note on interpretation**: I'm reading "the bottom scroll message" as the boot-time welcome help line printed at [terminal.html:1230](terminal.html#L1230) (`Type help to see all commands. Use the transport bar to replay your session...`), not the bottom status bar (`SESSION ... | UTF-8`). Push back during review if you meant something else.

## What Changes

**Light/dark metal toggle**
- Add a brushed-metal rocker switch to the title bar, between the macOS-style window dots and the title text. Two states — `DARK` (default, current behavior) and `LIGHT`. Click to flip; the switch animates a small slide between positions.
- Introduce light-mode values for the chassis tokens (`--term-bg`, `--term-bg-light`, `--term-surface`, `--term-border`, `--term-text`, `--term-muted`) bound to a `[data-mode="light"]` selector on `:root`. The four color themes (green/amber/cyan/red) MUST continue to work as accents in both modes.
- Phosphor glow and CRT flicker stay on in light mode but at noticeably reduced intensity so the screen reads as paper under fluorescent light rather than a glowing CRT.

**Glass pane cleanup + larger clock/date**
- Drop the `LOCAL` label entirely. The clock no longer needs a unit hint.
- Drop the boot-time welcome help line (`Type help to see all commands. Use the transport bar to replay your session...`). The shorter `Welcome to NEXTERM — your browser-based terminal.` line stays.
- Use the freed vertical space inside the glass pane to grow the clock from `22px → 28px` and the date / DOW lines from `10px → 12px`. Glass-pane outer dimensions and `.playback-surface` `min-height` MUST stay unchanged.

**Font-size knob**
- Add a vertical brushed-metal handle on the right edge of the terminal chassis (overlapping the bezel, mostly tucked inside, with only a textured grip protruding). Drag the handle up to grow the terminal output font, drag down to shrink it. Click without drag is a no-op.
- Output font size scales between approximately `11px` and `22px`; default stays at the current `13.5px` (read from the existing `.output-area` rule).
- Backed by a single CSS variable `--output-font-size` so `.output-area`, command echo, and any future output element track the same value.
- The knob does NOT persist across reloads (matching prior decisions for `recordingEnabled`, `activeThemeName`, etc.).

## Capabilities

### New Capabilities
- `device-controls`: Physical-style chassis controls — the metal mode toggle on the title bar and the font-size knob on the chassis edge. Both share the brushed-metal visual language already established for the DVR transport.
- `light-mode`: Light-mode palette tokens, the `[data-mode]` switching mechanism, and the rules governing which existing visual effects scale down vs. stay constant in light mode.

### Modified Capabilities
- `glass-pane-stardate`: Drops the `LOCAL` label requirement; clock font size grows from `22px` to `28px`; DOW and date lines grow from `10px` to `12px`. Layout, two-column structure, blinking colons, ambient line, and tabular numerics all stay unchanged.

## Impact

- **Code**: [terminal.html](terminal.html)
  - `:root` palette block (around lines 10–25) — split chassis tokens from theme tokens.
  - New `:root[data-mode="light"]` block defining light values for the chassis tokens.
  - `.crt-wrapper::after` flicker amplitude — softer in light mode.
  - `.title-bar` markup (around line 611) — add toggle element.
  - `.stardate-*` rules (around lines 263–360) — drop label rule, bump font sizes.
  - Stardate panel markup (around line 575) — remove `<div class="stardate-label">LOCAL</div>`.
  - `.crt-wrapper` (around line 39) — add font-size knob child element + CSS.
  - Boot routine (around line 1230) — remove the welcome help line.
  - JS (end of IIFE) — toggle handler, font-knob drag handler, `--output-font-size` updates.
- **State**: Two new module-level vars (`lightMode`, current font size) — neither persists.
- **APIs**: None — fully client-side.
- **Docs**: `NEXTERM-Specification.md` sections 5/6 will need updates at the next archive pass.
