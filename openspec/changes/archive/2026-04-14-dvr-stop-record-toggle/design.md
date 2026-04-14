## Context

The DVR's transport bar in [terminal.html:470-498](terminal.html#L470-L498) currently exposes Rewind / Back / Play / Pause / Ahead / Fast Forward. Snapshot capture is unconditional: every command pushes a frame onto the `snapshots` array (see `pushSnapshot` near [terminal.html:556](terminal.html#L556)). There is no way to (a) stop playback cleanly without reusing Fast Forward semantics, or (b) tell the DVR to stop recording mid-session. Both controls live in the same hardware-styled panel, so the design must respect existing CSS conventions.

## Goals / Non-Goals

**Goals:**
- Add a STOP button that halts auto-play AND exits playback mode in a single click, returning the user to live with `snapshotIdx === -1`.
- Add a RECORD toggle button whose state (`recordingEnabled`) gates whether `pushSnapshot` runs.
- Default `recordingEnabled = true` so existing demo embeds continue to record without configuration.
- Visually distinguish the two new buttons from the navigation buttons (logical grouping with a divider).
- Restyle `.playback-surface` with a brushed-metal aesthetic (horizontal grain, beveled top/bottom, soft radial highlight) consistent with the existing CRT/hardware visual language.
- Double the panel's vertical footprint **without** resizing any transport button or the progress slider.
- Introduce a two-column layout: left = existing controls (transport row + progress bar); right = a glass-pane surface reserved for future fortune-style content.
- Keep all changes inside the single `terminal.html` file; no new dependencies, no build step.

**Non-Goals:**
- Persisting `recordingEnabled` across page reloads (always defaults to `true` on load).
- Editing or deleting individual snapshots after the fact.
- Pause-recording-but-keep-replaying split: when recording is off, playback of existing snapshots still works.
- Changing the auto-play interval, scrubbing behavior, or the welcome snapshot capture.
- Implementing the actual fortune/quote feed — only the empty glass pane lands now.
- Resizing transport buttons, the slider, or its scrubbing hit area.

## Decisions

### Decision 1: STOP semantics = "halt playback and return to live"

STOP differs from Pause: Pause holds the current snapshot index, while STOP performs the same effect as Fast Forward (`goLive()`) PLUS cancels the auto-play interval. We chose this because users already have Pause for "freeze here" and Fast Forward for "skip to end and return to live"; STOP fills the gap of "I'm done watching, take me back to live now" as a single discoverable button. Alternative considered: making STOP just cancel auto-play without exiting playback mode — rejected because that's identical to Pause.

### Decision 2: RECORD toggle gates `pushSnapshot`, not command execution

The recording state is checked inside `pushSnapshot` (early return when disabled). Commands still run, output still renders live, but no frame is appended. Alternative considered: gating at the command-execution layer to also skip rendering — rejected because users still want to see live output, they just don't want it preserved.

### Decision 3: Welcome snapshot is always captured

The post-boot welcome snapshot (`snapshots[0]`) is captured before the user can interact with the toggle, so the toggle has no effect on it. This keeps "snapshot zero" as a stable anchor for Rewind. Alternative considered: clearing `snapshots` when recording is turned off — rejected because it would surprise users who toggle off then back on expecting their existing timeline preserved.

### Decision 4: Visual state for RECORD

The RECORD button uses the existing `.transport-btn.active` class plus a new modifier (e.g. `.is-record`) that paints the glyph red when armed. When recording is off, the button reverts to the standard idle styling. The STOP button has no toggled state — it's a momentary action.

### Decision 5: Button placement and grouping

Insert STOP between Pause and Ahead, separated by the existing `.transport-divider` pattern; insert RECORD at the far right after Fast Forward, preceded by another divider. This puts playback-control buttons together and isolates RECORD as a session-state control.

### Decision 6: Brushed-metal finish via layered gradients

The brushed-metal effect is achieved entirely with CSS — no images. The base is a vertical light→dark→light gradient (`#3a3a3a → #1f1f1f → #2c2c2c`) overlaid with a **horizontal repeating-linear-gradient** (1px alternating ~3% white/transparent stripes) to simulate brushed grain. A `::before` pseudo-element adds a subtle radial highlight (top-center) and a `::after` adds a faint inner border to bevel the edges. The existing top/bottom hairlines are repurposed as machined-edge highlights. Alternative considered: a small repeating PNG texture — rejected because it breaks the project's "single-HTML-file, zero assets" constraint.

### Decision 7: Doubling height without resizing controls

The current panel uses `padding: 10px 18px` with content sized by its children. To double the panel height while leaving the buttons (36×32) and slider untouched, the new layout uses a fixed `min-height` (~88px desktop, scaling down on the mobile breakpoint) and lets the left column center its row vertically inside the taller surface. The progress bar continues to sit below the transport row inside `.playback-left`. Alternative considered: changing button or slider sizes — explicitly rejected by the user.

### Decision 8: Two-column layout with the glass pane on the right

The panel becomes `display: flex; align-items: stretch;` with two children:
- `.playback-left` — `flex: 1 1 auto`, holds the existing transport-controls row and progress bar stacked vertically.
- `.playback-right` — `flex: 0 0 ~33%` (with a sensible `min-width` and `max-width`), the glass pane.

The glass pane uses a translucent dark background (`rgba(20,20,20,0.45)`), a `backdrop-filter: blur(6px) saturate(120%)` for the frosted effect, a 1px inset highlight on the top edge, and a soft inner shadow to read as recessed glass over the brushed-metal substrate. It contains a single empty child element (e.g. `#fortuneSlot`) that future work will populate. Below the mobile breakpoint (≤640px), the glass pane collapses (`display: none`) so the controls retain their full width on small screens. Alternative considered: stacking glass pane below controls on mobile — rejected to keep the panel from growing taller on phones.

### Decision 9: Mobile breakpoint adjustments

The existing `@media` rule at [terminal.html:435](terminal.html#L435) shrinks button sizes — that stays. We add: collapse `.playback-right`, reduce `.playback-surface` `min-height` to roughly the previous size, and reduce vertical padding so phones don't lose terminal real estate. The brushed-metal finish remains on mobile (it's CSS-only and cheap).

## Risks / Trade-offs

- **Risk**: Users toggle RECORD off mid-session, then later try to Rewind and find their recent commands missing. → **Mitigation**: The "armed" visual state on RECORD is clearly visible (red glow), making the off state hard to miss. Status-bar `Snapshots` count still updates, so the user can see frames are not accumulating.
- **Risk**: STOP and Fast Forward become functionally similar (both return to live), confusing users. → **Mitigation**: STOP additionally cancels in-flight auto-play, while Fast Forward is meant to be used while paused or live-mode-adjacent. The button labels and tooltips differentiate the two.
- **Trade-off**: `recordingEnabled` does not persist across reloads. We accept this because session DVR is itself ephemeral (snapshots are in-memory), so persisting only the toggle would be inconsistent.
- **Risk**: Existing keyboard-shortcut handler at [terminal.html:1047](terminal.html#L1047) currently uses Space for Play/Pause toggle in playback mode. STOP gets no shortcut to avoid colliding. → **Mitigation**: Documented in the spec; no shortcut conflicts introduced.
- **Risk**: `backdrop-filter` is unsupported on older browsers — the glass pane will fall back to a flat translucent dark rectangle. → **Mitigation**: Acceptable; the brushed-metal substrate still reads underneath, and the project explicitly targets modern browsers.
- **Risk**: A taller playback surface eats vertical space from the terminal output area on short viewports. → **Mitigation**: Mobile breakpoint reduces panel `min-height` and hides the glass pane.
- **Trade-off**: Empty glass pane lands without any content. We accept this because the fortune feed is explicitly out of scope and the empty pane validates the layout for future work.
