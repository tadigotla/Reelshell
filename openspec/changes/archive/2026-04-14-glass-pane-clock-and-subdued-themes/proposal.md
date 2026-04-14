## Why

The recently-added DVR glass pane is currently empty (just `#fortuneSlot`), and the existing color palette uses fully-saturated neon hex values (`#39ff14`, `#00e5ff`, `#ff3333`, `#ffb700`) plus a CRT flicker animation that, while atmospheric, is genuinely uncomfortable for extended reading. We have an opportunity to give the glass pane a purposeful identity AND tune the visual intensity down without losing the retro-CRT character.

## What Changes

**Glass pane content — "Stardate panel"**
- Render a three-line stardate panel inside `#fortuneSlot`:
  - **Line 1 (large)**: live HH:MM:SS clock in a chunky monospace, ticking once per second with a subtle colon-blink.
  - **Line 2 (medium)**: day-of-week + abbreviated date (e.g. `MON  14 APR 2026`).
  - **Line 3 (small, muted)**: a slowly rotating ambient field that cycles every ~10 seconds through:
    - session uptime (`UPTIME 00:14:22`)
    - command count (`CMDS 17`)
    - active theme name (`THEME GREEN`)
    - one-line fortunes pulled from the existing fortune corpus
- Use a simple cross-fade transition on the ambient line so it doesn't snap-cut.
- Pause the clock and ambient updates while the tab is hidden (`document.visibilitychange`) to avoid background work.

**Subdue themes for reduced eye strain**
- Replace the four neon palette entries with desaturated equivalents (~25–35% saturation reduction, slight luminance lift to keep them readable on black).
- Reduce all `*-glow` alphas (currently `0.35`) to roughly `0.18–0.22`.
- Lower the screen-flicker animation amplitude (currently 97%↔100% opacity at 80ms) — either widen the cycle to ~3s or reduce the delta to 99%↔100%, configurable behind a single CSS custom property so we can tune in one place.
- Keep theme names and the `theme` command unchanged so existing muscle memory still works.

## Capabilities

### New Capabilities
- `glass-pane-stardate`: Content rendered inside the DVR glass pane — live clock, date, and rotating ambient information field, plus its update lifecycle.
- `visual-comfort`: Color palette and motion intensity tuning across the whole terminal — desaturated theme tokens and reduced flicker animation.

### Modified Capabilities
<!-- None: the existing dvr-panel-layout spec only defines the pane is empty and addressable; this change populates it but does not contradict that. -->

## Impact

- **Code**: [terminal.html](terminal.html) — `:root` CSS custom properties (lines 10–25), screen flicker keyframes (around line 72), theme command runtime palette (around line 1031), glass pane styling and child markup (around lines 262, 575), new JS module for the stardate panel (new block in the existing IIFE).
- **State**: New module-level interval handles for clock and ambient rotation; cleanup on `visibilitychange`.
- **APIs**: None — fully client-side.
- **Docs**: [NEXTERM-Specification.md](NEXTERM-Specification.md) sections 5 (DVR) and 6.1/6.2 (CRT effects, color themes) need updates when this change is archived.
