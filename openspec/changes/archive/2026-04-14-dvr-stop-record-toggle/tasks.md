## 1. State and capture gating

- [x] 1.1 In the DVR module of [terminal.html](terminal.html) (around line 548), declare `let recordingEnabled = true;` alongside the existing `snapshots` and `snapshotIdx` state.
- [x] 1.2 Modify `pushSnapshot` (around [terminal.html:556](terminal.html#L556)) to early-return when `recordingEnabled === false`. Verify the welcome snapshot still captures because it runs before any user interaction.
- [x] 1.3 Confirm that `goToSnapshot`, `goLive`, `playFrom`, scrubbing, and the progress bar still operate correctly when `recordingEnabled` is false (they read existing snapshots, never write).

## 2. STOP button

- [x] 2.1 Add a `<button class="transport-btn" id="btnStop" title="Stop">⏹</button>` between Pause and Ahead in the transport markup (around [terminal.html:488](terminal.html#L488)). Use the existing SVG button pattern, not a literal glyph if other buttons use SVGs.
- [x] 2.2 Add a `stopPlayback` (or equivalent) handler that: clears the auto-play interval, sets `isPlaying = false`, calls `goLive()`, and updates the UI state (`updateUiState`/`updateProgress`).
- [x] 2.3 Wire `btnStop.addEventListener('click', stopPlaybackHandler)`.
- [x] 2.4 Verify STOP is a no-op (no error) when already in live mode.

## 3. RECORD toggle

- [x] 3.1 Add `<button class="transport-btn is-record active" id="btnRecord" title="Recording (click to toggle)">⏺</button>` after Fast Forward, preceded by a `.transport-divider` (around [terminal.html:494](terminal.html#L494)).
- [x] 3.2 In CSS (around [terminal.html:282](terminal.html#L282)), add a `.transport-btn.is-record.active` rule that paints the glyph red (e.g. `#ff3b30`) with a matching glow, and ensure the idle (non-active) state reverts to the standard transport-btn styling.
- [x] 3.3 Add a click handler that flips `recordingEnabled` and toggles the `active` class on `btnRecord`. No snapshot mutation, no `updateProgress` call needed.
- [x] 3.4 On initial render, ensure the button has the `active` class so it visually matches `recordingEnabled = true`.

## 4. Status / discoverability

- [x] 4.1 In the `status` command output (around [terminal.html:934](terminal.html#L934)) where `Snapshots` is printed, add a `Recording` row showing `ON` (in the active theme color) or `OFF` (in amber).
- [x] 4.2 Update the welcome banner help text (around [terminal.html:1096](terminal.html#L1096)) to mention "STOP" and "RECORD" controls in passing — single sentence change, not a redesign.

## 5. Brushed-metal finish

- [x] 5.1 Replace the `.playback-surface` `background` (around [terminal.html:202](terminal.html#L202)) with a layered brushed-metal treatment: a vertical light→dark→light gradient base (e.g. `#3a3a3a → #1f1f1f → #2c2c2c`) plus a horizontal `repeating-linear-gradient` grain (~1px alternating ~3% white / transparent stripes).
- [x] 5.2 Repurpose `.playback-surface::before` (around [terminal.html:213](terminal.html#L213)) as a subtle top-center radial highlight (white at very low opacity fading to transparent).
- [x] 5.3 Repurpose `.playback-surface::after` to provide a faint inner border / beveled-edge effect over the new substrate (replacing the current vertical-stripe overlay).
- [x] 5.4 Verify the existing top/bottom hairline borders still read as machined edges; tweak colors if they disappear against the new lighter base.
- [x] 5.5 Check all four color themes — finish is theme-independent, so it must look identical across Green / Amber / Cyan / White.

## 6. Doubled height + two-region layout

- [x] 6.1 Wrap the existing transport-controls row and progress bar inside a new `.playback-left` div (around [terminal.html:470](terminal.html#L470)). Add a sibling `.playback-right` div containing a single empty `<div id="fortuneSlot"></div>`.
- [x] 6.2 Update `.playback-surface` CSS: keep the existing flex container, add `min-height: ~88px` (measure double the current resolved height first), set `align-items: stretch`, and move horizontal padding so children can stretch full-bleed on the vertical axis.
- [x] 6.3 Add `.playback-left` rule: `flex: 1 1 auto`, `display: flex`, `flex-direction: column`, `justify-content: center`, `gap` for spacing between transport row and progress bar.
- [x] 6.4 Add `.playback-right` rule: `flex: 0 0 33%` with `min-width` and `max-width` guards, plus inset margin/padding so it visually floats inside the metal panel.
- [x] 6.5 Confirm `.transport-btn`, `.transport-btn svg`, and the progress slider track + knob CSS values are **unchanged** from before. Do not touch those rules.

## 7. Glass pane

- [x] 7.1 Add `.playback-right` (or a child class like `.glass-pane`) styling: translucent dark background `rgba(20,20,20,0.45)`, `backdrop-filter: blur(6px) saturate(120%)`, `-webkit-backdrop-filter` for Safari, 1px inset top highlight via `box-shadow` or `border-top`, soft inner shadow for recessed effect, rounded corners that match the panel's visual language.
- [x] 7.2 Ensure the `#fortuneSlot` element is empty in markup but addressable (stable id), so future work can inject a quote without further structural changes.
- [x] 7.3 Verify the glass pane reads correctly over the brushed-metal substrate; adjust opacity/blur if the metal grain shows through too strongly or not at all.

## 8. Mobile breakpoint

- [x] 8.1 In the existing `@media` block (around [terminal.html:435](terminal.html#L435)), add: `.playback-right { display: none; }` and reduce `.playback-surface` `min-height` and vertical padding to roughly the pre-change size so phones don't lose terminal output area.
- [x] 8.2 Confirm `.playback-left` expands to fill the full width on mobile.

## 9. Manual verification

- [ ] 9.1 Open [terminal.html](terminal.html) in a desktop browser. Confirm the RECORD button renders in its red armed state on first paint and the welcome snapshot is present (Rewind works).
- [ ] 9.2 Run several commands; verify the snapshot count in `status` increments and the progress bar grows.
- [ ] 9.3 Click RECORD to disarm; run additional commands; verify snapshot count does not increase and the button visual reverts to idle.
- [ ] 9.4 Click RECORD again to re-arm; run another command; verify it is captured as a new snapshot at the end of the timeline.
- [ ] 9.5 Press Play; while auto-play is running, click STOP; verify auto-play halts immediately, the playback badge disappears, the input is re-enabled, and the status dot returns to green.
- [ ] 9.6 Manually rewind to snapshot 0, then click STOP; verify a clean return to live (no off-by-one or stuck state).
- [ ] 9.7 Confirm existing keyboard shortcuts (Space, Home, End, Arrow keys) still behave per the original spec.
- [ ] 9.8 Reload the page and confirm `recordingEnabled` resets to `true`.
- [ ] 9.9 Visually confirm the playback surface shows a brushed-metal finish and is roughly twice as tall as before.
- [ ] 9.10 Visually confirm the glass pane occupies the right portion of the panel, looks frosted over the metal substrate, and contains no visible text.
- [ ] 9.11 Measure (via DevTools) that `.transport-btn` and the progress slider have the same dimensions as before the change.
- [ ] 9.12 Resize the browser to ≤640px wide. Confirm the glass pane disappears, the controls fill the width, and the panel height collapses back to roughly its original mobile size.
- [ ] 9.13 Cycle through all four themes and confirm the brushed-metal finish and glass pane look correct in each.
