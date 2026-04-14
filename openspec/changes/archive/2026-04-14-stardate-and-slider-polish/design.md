## Context

The previous change populated `.playback-right` with a `.stardate-panel` containing three vertically stacked elements (clock, date, ambient). On a desktop viewport the glass pane is roughly 220–360px wide × ~88px tall, so the centered stack leaves a lot of unused horizontal space and the clock has to compete for vertical room with two more lines below it. Meanwhile the progress slider in `.playback-left` uses `flex: 1` on `.progress-section`, so it expands to absorb every remaining pixel after the transport buttons — visually heavier than the buttons themselves. Both are easy to fix without touching the DVR JS.

## Goals / Non-Goals

**Goals:**
- Use the glass pane's horizontal space: clock left, date right, ambient line as a full-width footer.
- Make the slider feel proportionate by capping its width.
- Add small life-signs (blinking colons, LED prefix, `LOCAL` label) without piling on motion.
- Keep all changes local to CSS plus one tiny tweak to `tickClock()`; no new state, no new timers.

**Non-Goals:**
- A 12-hour mode, custom date format, or locale awareness.
- Per-theme overrides for the new ornaments — the LED color comes from `var(--term-green)` automatically.
- Configurable slider width or hideable label.
- Any changes to the rotation cadence or content set on the ambient line.

## Decisions

### Decision 1: Two-column inner layout via nested flex

The `.stardate-panel` becomes a column flex container (header row + ambient footer). The header row is a row flex container with three children: `.stardate-clock-block` (clock + LOCAL label), a `.stardate-divider` (1px vertical line), and `.stardate-date-block` (DOW + date). Both blocks use `flex: 1 1 0` with `display: flex; flex-direction: column; justify-content: center;` so they share the row evenly and stay vertically centered. Alternative considered: CSS grid with `grid-template-columns: 1fr auto 1fr` — viable, but the flex approach is consistent with the rest of the file.

### Decision 2: Date renders on two lines

The date block shows DOW (`MON`) on top in the existing muted style and `14 APR 2026` below it on its own line. This makes the date as visually weighty as the clock without overflowing the narrow column. Alternative considered: keep the single-line date and show only the time on the right — rejected because it sacrifices information.

### Decision 3: Blinking colons via CSS animation, not JS

`tickClock()` produces `HH<span class="stardate-clock-colon">:</span>MM<span class="stardate-clock-colon">:</span>SS` using `innerHTML`. A CSS keyframes animation `@keyframes colon-blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.3; } }` runs on `.stardate-clock-colon` at `1s infinite`. The blink resyncs naturally because the animation restarts on each `innerHTML` write — which happens once per second — keeping it in lockstep with the clock tick. Alternative considered: a JS toggle on a `blink` class — rejected because the CSS approach is cheaper and self-syncing.

### Decision 4: Tabular numerics on the clock

Add `font-variant-numeric: tabular-nums;` so `1`/`8`/`0` all occupy the same width — prevents the clock from visibly jiggling as digits change. Cheap, supported everywhere we care about.

### Decision 5: `LOCAL` label above the clock

A 9px uppercase muted label above the clock anchors it as "this is a clock" without needing a unit. Centered horizontally over the clock block. Pure CSS, no JS.

### Decision 6: Slider width cap

Change `.progress-section` from `flex: 1` to `flex: 0 1 auto` and give `.progress-track` `max-width: 360px; flex: 1 1 auto;`. The progress section then sizes to its content (track + label), and the transport row gets a margin-right or `margin-left: auto` push so the slider doesn't drift to the far edge. Effect: the track is at most 360px wide, and the `1 / 1` label sits immediately to its right rather than at the panel edge. Alternative considered: fixed `width: 320px` on the track — rejected because it doesn't shrink gracefully on narrow widths between mobile and desktop.

### Decision 7: Ambient line gets an LED prefix

Add an `::before` pseudo-element on `.stardate-ambient`: `content: '●'; color: var(--term-green); margin-right: 6px; animation: led-pulse 2s ease-in-out infinite;` with `@keyframes led-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`. No content shifts, no JS. Alternative considered: prepending the dot in JS — rejected, CSS is simpler and easier to theme.

## Risks / Trade-offs

- **Risk**: The blinking colons + pulsing LED + clock tick may add up to "too much motion." → **Mitigation**: All three are slow (1s and 2s), low-amplitude, and visually small. If it still bothers users we can drop the LED first.
- **Risk**: A 360px slider cap may feel cramped on ultrawide monitors. → **Mitigation**: 360px is generous for a scrubber on a single-page web terminal; the panel's overall max-width is also bounded.
- **Risk**: The two-column inner layout could break at very narrow glass-pane widths just above the mobile breakpoint. → **Mitigation**: `min-width: 0` on the columns + `overflow: hidden` on text containers prevents overflow; the mobile breakpoint already hides the entire pane below 640px.
- **Trade-off**: `innerHTML` write on every clock tick is slightly more expensive than `textContent`. We accept this — it's three short string fragments at 1Hz, well below any noticeable cost.
