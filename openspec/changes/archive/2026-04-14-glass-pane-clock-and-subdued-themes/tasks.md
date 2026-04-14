## 1. Subdued palette and flicker tuning

- [x] 1.1 In `:root` (around [terminal.html:10](terminal.html#L10)) replace `--term-green: #39ff14` with a subdued green (`#7ed957` proposed; tweak in implementation if needed) and update `--term-green-glow` to use alpha `0.20` (e.g. `rgba(126,217,87,0.20)`).
- [x] 1.2 Add a new `--flicker-min: 0.985;` custom property in `:root`.
- [x] 1.3 Update the flicker keyframes (around [terminal.html:72](terminal.html#L72)) to `0% { opacity: var(--flicker-min); } 100% { opacity: 1; }` and widen the animation duration on `.crt-wrapper::after` from `0.08s` to `0.12s`.
- [x] 1.4 In the `theme` command runtime palette (around [terminal.html:1031](terminal.html#L1031)) replace each `main`/`glow` pair with subdued equivalents:
  - green → `{ main: '#7ed957', glow: 'rgba(126,217,87,0.20)' }`
  - amber → `{ main: '#e8a93b', glow: 'rgba(232,169,59,0.20)' }`
  - cyan  → `{ main: '#5cc4d6', glow: 'rgba(92,196,214,0.20)' }`
  - red   → `{ main: '#e06b6b', glow: 'rgba(224,107,107,0.20)' }`
- [x] 1.5 Spot-check every other place in the file where `--term-green-glow` is referenced (greps in design's Context section already enumerate them) and confirm they pick up the new alpha automatically — they should, because they all use the variable.
- [x] 1.6 Open the page in a browser, cycle through all four themes, and confirm the new palette reads as gentler but still recognizably retro.

## 2. Stardate panel — markup and CSS

- [x] 2.1 In the playback markup (around [terminal.html:574](terminal.html#L574)) replace `<div id="fortuneSlot"></div>` with:
  ```
  <div class="stardate-panel" id="stardatePanel">
    <div class="stardate-clock"   id="stardateClock">--:--:--</div>
    <div class="stardate-date"    id="stardateDate">--- -- --- ----</div>
    <div class="stardate-ambient" id="stardateAmbient">&nbsp;</div>
  </div>
  ```
- [x] 2.2 Add CSS for `.stardate-panel`: `display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2px; padding: 8px 12px; height: 100%;`. Place it next to the existing `#fortuneSlot` rule (around [terminal.html:262](terminal.html#L262)) — the old `#fortuneSlot` rule can be removed since the id is gone.
- [x] 2.3 Add `.stardate-clock` rule: `font-family: 'Share Tech Mono', monospace; font-size: 22px; letter-spacing: 2px; color: var(--term-green); text-shadow: 0 0 6px var(--term-green-glow); line-height: 1;`.
- [x] 2.4 Add `.stardate-date` rule: `font-family: 'Share Tech Mono', monospace; font-size: 10px; letter-spacing: 2px; color: var(--term-muted); text-transform: uppercase;`.
- [x] 2.5 Add `.stardate-ambient` rule: `font-family: 'Share Tech Mono', monospace; font-size: 10px; letter-spacing: 1px; color: #888; transition: opacity 0.4s ease; min-height: 1.2em; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center;`. Add a `.stardate-ambient.fading { opacity: 0; }` modifier.

## 3. Stardate panel — JavaScript module

- [x] 3.1 Hoist the existing `fortune` command's array to a module-level `const FORTUNES = [...]` near the top of the IIFE so both the `fortune` command and the panel reference it. Update the `fortune` command body to use `FORTUNES`.
- [x] 3.2 Just before the `boot()` call (end of the IIFE), add a Stardate Panel block:
  - DOM refs: `stardateClock`, `stardateDate`, `stardateAmbient` (all `getElementById`).
  - Helper: `pad2(n)` returns zero-padded two-digit string.
  - Helper: `formatClock(d)` returns `HH:MM:SS`.
  - Helper: `formatDate(d)` returns `DDD  DD MMM YYYY` using fixed `['SUN','MON','TUE','WED','THU','FRI','SAT']` and `['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']` arrays. (Note the **two spaces** between weekday and day to match the spec's regex.)
  - Helper: `formatUptime()` reuses `Date.now() - sessionStart` and returns `UPTIME HH:MM:SS`.
  - Helper: `currentThemeName()` returns the last value passed to the `theme` command, or `'GREEN'` as default. Track this with a closure variable updated in step 4.1.
  - Helper: `randomFortune()` returns `'> ' + FORTUNES[random]` truncated/letting CSS ellipsis handle overflow.
- [x] 3.3 Add a clock tick function `tickClock()` that reads `new Date()`, sets `stardateClock.textContent = formatClock(d)` and `stardateDate.textContent = formatDate(d)`. Call it once immediately, then `setInterval(tickClock, 1000)`.
- [x] 3.4 Add ambient rotation: a closure variable `ambientIdx = 0`, an array of producers `[formatUptime, () => 'CMDS ' + commandCount, () => 'THEME ' + currentThemeName(), randomFortune]`. Function `rotateAmbient()` adds the `fading` class to `stardateAmbient`, after 400ms swaps `textContent` to `producers[ambientIdx]()`, increments `ambientIdx` mod length, and removes `fading`. Schedule `setInterval(rotateAmbient, 10000)`. Call once immediately so line 3 isn't blank on first paint (without the fade).
- [x] 3.5 Wire `document.addEventListener('visibilitychange', ...)`: when hidden, clearInterval both timers and null them; when visible, immediately call `tickClock()` then re-create both intervals if they are null.

## 4. Theme integration

- [x] 4.1 In the existing `theme` command callback (around [terminal.html:1031](terminal.html#L1031)) update the closure variable from step 3.2 (`currentThemeName`) when the theme changes — store the uppercase name on a module-level `let activeThemeName = 'GREEN';` accessible to the panel module.
- [x] 4.2 Verify (no code change expected) that the clock automatically picks up the new color because it reads `var(--term-green)` and the `theme` command sets `--term-green` on `documentElement`.

## 5. Manual verification

- [ ] 5.1 Open [terminal.html](terminal.html) in a desktop browser. Confirm the glass pane shows three lines: a ticking HH:MM:SS clock, a date in `DDD  DD MMM YYYY` format, and an ambient line.
- [ ] 5.2 Watch for ~50 seconds and confirm the ambient line cycles in order: UPTIME → CMDS → THEME → FORTUNE → UPTIME, with a visible cross-fade between transitions.
- [ ] 5.3 Run several commands and confirm the CMDS variant reflects the latest count next time it appears.
- [ ] 5.4 Run `theme amber`. Confirm the clock color updates immediately to amber and the THEME variant on the next ambient rotation reads `THEME AMBER`.
- [ ] 5.5 Cycle through `theme green / amber / cyan / red`. Confirm each looks subdued (no eye-burn neon) but still recognizable.
- [ ] 5.6 Stare at the screen for a minute and confirm the flicker is present but no longer aggressive.
- [ ] 5.7 Switch to another browser tab for at least 30 seconds, return, and confirm the clock immediately shows the correct current time.
- [ ] 5.8 Resize browser to ≤640px wide. Confirm the glass pane disappears (existing mobile rule) and no errors are thrown by the now-hidden timers.
- [ ] 5.9 Confirm the standalone `fortune` command still works and pulls from the same hoisted `FORTUNES` array.
- [ ] 5.10 Confirm `sysinfo` still renders correctly with the desaturated theme colors.
