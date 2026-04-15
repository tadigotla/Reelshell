## 1. Token restructuring

- [x] 1.1 In `:root` (around [terminal.html:10](terminal.html#L10)) reorganize tokens into two visually grouped clusters with comments: `/* Chassis */` (`--term-bg`, `--term-bg-light`, `--term-surface`, `--term-border`, `--term-text`, `--term-muted`, `--scanline-opacity`, `--flicker-min`) and `/* Themes */` (`--term-green`, `--term-green-dim`, `--term-green-glow`, `--term-amber`, `--term-cyan`, `--term-red`, `--term-magenta`).
- [x] 1.2 Add a new `--output-font-size: 13.5px;` (or whatever the current `.output-area` value is — grep first) inside the chassis cluster.
- [x] 1.3 Update `.output-area` (around [terminal.html:130](terminal.html#L130)) to use `font-size: var(--output-font-size);`.

## 2. Light mode palette

- [x] 2.1 Add a `:root[data-mode="light"]` block immediately after `:root` overriding only the chassis tokens with the values from design Decision 1:
  - `--term-bg: #f4f1ea`
  - `--term-bg-light: #ffffff`
  - `--term-surface: #e8e4dc`
  - `--term-border: #c9c4ba`
  - `--term-text: #2a2a2a`
  - `--term-muted: #888`
  - `--scanline-opacity: 0.02`
  - `--flicker-min: 0.995`
- [x] 2.2 Verify (grep) every other rule that reads chassis tokens picks up the new values automatically. Spot-check `.title-bar`, `.terminal`, `.status-bar`, `.boot-overlay`, `.input-field`, `.line-prompt-echo`, `.playback-badge`.
- [x] 2.3 If any rule hardcodes a color that should follow chassis tokens (e.g. a hardcoded `#0a0a0a` background), replace it with the appropriate `var(--term-bg)` etc.

## 3. Mode toggle (markup, CSS, JS)

- [x] 3.1 In the `.title-bar` markup (around [terminal.html:611](terminal.html#L611)) insert a `<button class="mode-toggle" id="modeToggle" type="button" aria-label="Toggle light/dark mode">` immediately after the `.title-bar-dots` div. The button contains: `<span class="mode-toggle-icon mode-toggle-icon-dark">☾</span>`, `<span class="mode-toggle-thumb"></span>`, `<span class="mode-toggle-icon mode-toggle-icon-light">☀</span>`.
- [x] 3.2 Add CSS for `.mode-toggle`: `position: relative; width: 44px; height: 20px; border-radius: 10px; border: none; cursor: pointer; padding: 0;` plus the brushed-metal background recipe (vertical gradient + horizontal grain) and an inset shadow. Reuse the same `repeating-linear-gradient` recipe from `.playback-surface` for visual consistency.
- [x] 3.3 Add `.mode-toggle-thumb`: `position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: linear-gradient(180deg, #555 0%, #2a2a2a 100%); box-shadow: 0 1px 2px rgba(0,0,0,0.6); transition: transform 0.2s ease;`.
- [x] 3.4 Add `.mode-toggle-icon`: `position: absolute; top: 50%; transform: translateY(-50%); font-size: 9px; color: #888; pointer-events: none;`. Position dark icon at `left: 5px;` and light icon at `right: 5px;`.
- [x] 3.5 Add `:root[data-mode="light"] .mode-toggle-thumb { transform: translateX(24px); }` so the thumb slides right when light mode is active.
- [x] 3.6 At the end of the IIFE, add a click handler:
  ```js
  const modeToggle = document.getElementById('modeToggle');
  modeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.dataset.mode === 'light';
    document.documentElement.dataset.mode = isLight ? 'dark' : 'light';
  });
  ```

## 4. Glass pane cleanup + larger clock

- [x] 4.1 In the stardate markup (around [terminal.html:577](terminal.html#L577)) delete the `<div class="stardate-label">LOCAL</div>` line.
- [x] 4.2 Delete the `.stardate-label` CSS rule entirely (it has no other consumers).
- [x] 4.3 Update `.stardate-clock` font-size from `22px` to `28px`. Keep all other properties unchanged.
- [x] 4.4 Update `.stardate-dow` and `.stardate-date` font-size from `10px` to `12px`. Keep the `letter-spacing: 2px` and uppercase styling.
- [x] 4.5 Open the page, verify the clock and date fit comfortably within the existing panel height; if not, drop clock to `26px` and date to `11px`.

## 5. Remove boot welcome help line

- [x] 5.1 In the boot routine (around [terminal.html:1230](terminal.html#L1230)) delete the line:
  ```js
  print('Type <span style="color:var(--term-amber)">help</span> to see all commands. Use the transport bar to replay your session — <span style="color:var(--term-amber)">STOP</span> returns to live and toggle <span style="color:var(--term-amber)">RECORD</span> to pause snapshot capture.', 'line-system');
  ```
  Keep the line above (`Welcome to NEXTERM — your browser-based terminal.`) and the empty `print('')` lines around it.

## 6. Font-size control — edge wheel in a slot on the playback deck

- [x] 6.1 Inside `.playback-surface` (between `.playback-left` and `.playback-right`) add a `.font-knob-mount` containing a `.font-knob-slot` (the cut in the panel) wrapping a `.font-knob-wheel` (the wheel edge), plus a tooltip:
  ```html
  <div class="font-knob-mount">
    <div class="font-knob-slot">
      <div class="font-knob-wheel" id="fontKnob" title="Drag to resize terminal text"></div>
    </div>
    <div class="font-knob-tooltip" id="fontKnobTooltip">13px</div>
  </div>
  ```
- [x] 6.2 Add `.font-knob-mount` CSS: thin flex item, vertically centered, no background of its own.
- [x] 6.3 Add `.font-knob-slot` CSS: ~16px × 38px rounded rectangle with `overflow: hidden`. Background is a dark vertical gradient that brightens in the middle (so the wheel's exposed edge looks slightly curved). Multi-layer inset `box-shadow` for the recessed slot look.
- [x] 6.4 Add `.font-knob-wheel` CSS: fills the slot, `cursor: ns-resize`. Background is a tall (`background-size: 100% 200px`) repeating linear gradient of fine horizontal ridges (1–2px stripes) that simulates the textured edge of the wheel.
- [x] 6.5 Add `.font-knob-tooltip` CSS: tiny floating label below the slot, opacity 0 by default, becomes visible while `.font-knob-mount` has the `dragging` class.
- [x] 6.6 Hide the entire mount on the existing mobile breakpoint: `.font-knob-mount { display: none; }`.
- [x] 6.7 At the end of the IIFE, add the drag handler. `applyFontSize` writes `--output-font-size` AND scrolls the wheel by setting `fontKnob.style.backgroundPositionY` so the ridges visibly shift as the size changes (~12px of scroll per 1px of font size). Drag enters/exits the `dragging` class on the **mount** (so the tooltip selector is `.font-knob-mount.dragging .font-knob-tooltip`).

## 7. Manual verification

- [ ] 7.1 Open [terminal.html](terminal.html). Confirm dark mode is active by default and the brushed-metal toggle is visible in the title bar with the thumb on the left.
- [ ] 7.2 Click the toggle. Confirm the page flips to light mode (paper background, dark text) and the thumb slides to the right with a CSS transition. Click again to flip back.
- [ ] 7.3 In light mode, run `theme amber`, `theme cyan`, `theme red`, `theme green`. Confirm each accent reads cleanly on the paper background and the active theme persists when flipping mode.
- [ ] 7.4 Confirm the boot welcome line `Type help to see all commands...` no longer prints. Only `Welcome to NEXTERM — your browser-based terminal.` should appear.
- [ ] 7.5 Confirm the glass pane shows the clock at noticeably larger size (~28px) without the `LOCAL` label, with the date column also slightly larger. Panel outer height unchanged.
- [ ] 7.6 Hover the right edge of the chassis. Locate the brushed-metal font knob handle. Cursor should change to `ns-resize`.
- [ ] 7.7 Drag the knob upward ~50px. Confirm the terminal output font grows by ~3px and a tooltip appears showing the current px value.
- [ ] 7.8 Drag downward to shrink. Confirm the font shrinks symmetrically.
- [ ] 7.9 Drag past the limits in both directions; confirm the font clamps at ~11px (smallest) and ~22px (largest).
- [ ] 7.10 Click the knob without moving the mouse; confirm the font does not change.
- [ ] 7.11 Reload the page. Confirm dark mode is active and font size is the default.
- [ ] 7.12 Resize browser to ≤600px wide. Confirm the font knob is hidden by the mobile breakpoint and the mode toggle is still functional in the title bar.
- [ ] 7.13 Run `sysinfo`. Confirm it still renders correctly in both modes.
