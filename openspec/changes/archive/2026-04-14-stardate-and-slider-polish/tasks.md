## 1. Stardate panel markup restructure

- [x] 1.1 In the playback markup (around [terminal.html:574](terminal.html#L574)) replace the existing `.stardate-panel` children with a header row + ambient footer:
  ```
  <div class="stardate-panel" id="stardatePanel">
    <div class="stardate-header">
      <div class="stardate-clock-block">
        <div class="stardate-label">LOCAL</div>
        <div class="stardate-clock" id="stardateClock">--:--:--</div>
      </div>
      <div class="stardate-divider"></div>
      <div class="stardate-date-block">
        <div class="stardate-dow"  id="stardateDow">---</div>
        <div class="stardate-date" id="stardateDate">-- --- ----</div>
      </div>
    </div>
    <div class="stardate-ambient" id="stardateAmbient">&nbsp;</div>
  </div>
  ```
  Note: `#stardateClock`, `#stardateDate`, `#stardateAmbient` ids are preserved; new id `#stardateDow` is added.

## 2. Stardate panel CSS

- [x] 2.1 Update `.stardate-panel` to vertical flex column with the header row above and the ambient footer below: keep `padding`, set `gap: 6px`.
- [x] 2.2 Add `.stardate-header { display: flex; flex-direction: row; align-items: stretch; justify-content: center; gap: 10px; flex: 1 1 auto; min-height: 0; }`.
- [x] 2.3 Add `.stardate-clock-block` and `.stardate-date-block` rules: `flex: 1 1 0; display: flex; flex-direction: column; justify-content: center; align-items: center; min-width: 0; overflow: hidden;`.
- [x] 2.4 Add `.stardate-divider { width: 1px; align-self: stretch; background: rgba(255,255,255,0.08); margin: 4px 0; }`.
- [x] 2.5 Add `.stardate-label { font-family: 'Share Tech Mono', monospace; font-size: 9px; letter-spacing: 2px; color: var(--term-muted); text-transform: uppercase; margin-bottom: 2px; }`.
- [x] 2.6 Update `.stardate-clock` to add `font-variant-numeric: tabular-nums;` (keep existing rules).
- [x] 2.7 Add `.stardate-dow` rule (same styling family as `.stardate-date` — uppercase muted, ~10px, letter-spacing 2px). Repurpose the existing `.stardate-date` rule for the second line (already similar styling).
- [x] 2.8 Add `.stardate-clock-colon` rule: `display: inline-block; animation: colon-blink 1s steps(1, end) infinite;`.
- [x] 2.9 Add `@keyframes colon-blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.3; } }` near the existing flicker keyframes block.
- [x] 2.10 Add `.stardate-ambient::before` pseudo-element: `content: '●'; color: var(--term-green); margin-right: 6px; display: inline-block; animation: led-pulse 2s ease-in-out infinite;`.
- [x] 2.11 Add `@keyframes led-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`.

## 3. Stardate panel JS

- [x] 3.1 In the stardate module, add `const stardateDow = document.getElementById('stardateDow');` next to the other DOM refs.
- [x] 3.2 Update `tickClock()` so it:
  - emits `stardateClock.innerHTML = pad2(d.getHours()) + '<span class="stardate-clock-colon">:</span>' + pad2(d.getMinutes()) + '<span class="stardate-clock-colon">:</span>' + pad2(d.getSeconds());`
  - sets `stardateDow.textContent = DAY_NAMES[d.getDay()];`
  - sets `stardateDate.textContent = pad2(d.getDate()) + ' ' + MONTH_NAMES[d.getMonth()] + ' ' + d.getFullYear();`
- [x] 3.3 Verify `formatDate` is no longer called anywhere. Remove the `formatDate` helper if it becomes unused.

## 4. DVR slider width cap

- [x] 4.1 Update `.progress-section` (around [terminal.html:360](terminal.html#L360)) to remove `flex: 1` and use `flex: 0 1 auto;` so it sizes to content.
- [x] 4.2 Update `.progress-track` to add `max-width: 360px;` and keep its existing `flex: 1` so it grows up to the cap.
- [x] 4.3 Verify the `1 / 1` label sits immediately to the right of the track. If the transport row drifts left of where it should sit visually within the wider `.playback-left`, leave it — center alignment is fine since `.playback-left` already vertically centers its children.

## 5. Manual verification

- [ ] 5.1 Open [terminal.html](terminal.html) in a desktop browser. Confirm the glass pane shows clock on the left, date on the right (DOW above, date below), separated by a thin vertical divider, with the ambient line below.
- [ ] 5.2 Confirm the `LOCAL` label is visible above the clock.
- [ ] 5.3 Watch the clock for ~3 seconds. Confirm the colons visibly blink at ~1Hz and the digits do not jiggle horizontally.
- [ ] 5.4 Confirm the ambient line shows a small pulsing dot to the left of its text, in the active theme color.
- [ ] 5.5 Run `theme amber`. Confirm the clock and the LED dot both update to amber.
- [ ] 5.6 Confirm the DVR progress track is no longer the full width of the playback panel — it should be capped at ~360px with the `1 / 1` label adjacent.
- [ ] 5.7 Resize the browser between ~700px and 1400px wide. Confirm the slider width stays sensible (capped at 360px on wide, shrinks below on narrow).
- [ ] 5.8 Resize to ≤640px. Confirm mobile breakpoint still hides the glass pane and the controls fill the width.
