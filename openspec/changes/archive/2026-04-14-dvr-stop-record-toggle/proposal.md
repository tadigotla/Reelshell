## Why

The DVR currently has no way to halt playback outright (only Pause, which holds position) and no way to disable snapshot capture once recording has started. Users who want to demo a long live session without bloating the snapshot timeline, or who want a clean stop that fully exits playback mode, have no control. Adding a STOP button and a RECORD toggle gives users explicit control over both playback termination and capture state.

## What Changes

**Controls**
- Add a **STOP** button to the transport controls that halts auto-play, exits playback mode, and returns to live (distinct from Pause, which preserves position).
- Add a **RECORD** toggle button to the transport controls. When enabled, new command output is captured into the snapshots array (current behavior). When disabled, command execution proceeds normally but no snapshot is pushed.
- The RECORD toggle defaults to **on** so existing behavior is preserved on first load.
- Visual treatment: STOP uses a ⏹ glyph; RECORD uses a ⏺ glyph and shows an "armed" state (e.g., red glow) when active.
- Update the status/help output so users discover the new controls.

**Panel UI**
- Restyle the playback surface with a **brushed metal** finish (horizontal grain, subtle highlights, beveled edges) replacing the current flat dark gradient.
- **Double the height** of the playback surface without resizing any transport buttons or the progress slider.
- Split the panel into two regions: a **left region** holding the transport controls + progress slider (preserving today's layout) and a new **right region** containing a **glass pane** placeholder for a future fortune-style quote.
- Existing keyboard shortcuts (Space/Home/End/Arrow keys) must continue to work unchanged.

## Capabilities

### New Capabilities
- `dvr-transport`: Transport control surface for the Session DVR — buttons, their actions, visual states, and the recording-enabled state that gates snapshot capture.
- `dvr-panel-layout`: Visual structure of the playback surface — brushed-metal finish, doubled height, two-region (controls + glass pane) layout.

### Modified Capabilities
<!-- None: there is no existing dvr-transport spec yet; this change introduces it. -->

## Impact

- **Code**: [terminal.html](terminal.html) — markup for the playback surface (around line 470), CSS for the surface and buttons (around lines 199–303), DVR JavaScript for snapshot capture and playback control (around line 548), keyboard handler (around line 1047).
- **State**: New `recordingEnabled` boolean (default `true`) added to the DVR module.
- **Layout**: `.playback-surface` height doubles; new `.playback-left` and `.playback-right` (glass pane) child regions introduced. Mobile breakpoint at line 435 needs corresponding adjustments.
- **APIs**: None — fully client-side.
- **Docs**: [NEXTERM-Specification.md](NEXTERM-Specification.md) sections 5.2 (transport controls table) and 5.3 / visual-design need updates when this change is archived.
