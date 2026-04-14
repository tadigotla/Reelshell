## Why

The freshly-landed stardate panel and DVR transport row work, but the screenshot review surfaced three weak spots: (1) the glass pane has a lot of horizontal real estate that's wasted by the centered three-line stack, (2) the progress slider stretches to fill the entire `.playback-left` width and feels overweighted relative to the buttons, and (3) the panel is silent when nothing is rotating — small ambient signal-of-life would help it feel alive.

## What Changes

**Stardate panel — side-by-side layout**
- Restructure the panel so the clock sits on the left and the date sits on the right, separated by a thin vertical divider, with the ambient line as a full-width footer below.
- Date splits into two compact lines: day-of-week on top, `DD MMM YYYY` below.
- Add a small `LOCAL` label above the clock (uppercase, muted, ~9px).
- Apply `font-variant-numeric: tabular-nums` to the clock so digit-width doesn't shift while ticking.

**Blinking colons**
- The two `:` separators in the clock fade between ~30% and 100% opacity once per second, slightly out of phase with the tick. Wrap each colon in a `<span class="stardate-clock-colon">` so a CSS animation can target them.

**Narrower DVR slider**
- Cap the progress track width (target `max-width: 360px`, `flex: 0 1 360px`) so it stops stretching to fill the panel. Layout the `.progress-section` so the `1 / 1` label tucks right next to the track instead of being pushed to the far right edge.

**Ambient LED prefix**
- Prefix the ambient line with a small bullet `●` rendered in the active theme color, separated from the text by a single space. The dot uses a slow ~2s opacity pulse (independent of the cross-fade swap).

## Capabilities

### Modified Capabilities
- `glass-pane-stardate`: layout becomes two-column (clock left, date right), adds `LOCAL` label, blinking colons, and an LED prefix on the ambient line. Existing rotation/clock/visibility behavior is unchanged.
- `dvr-panel-layout`: the progress slider is no longer flex-grow; gets a `max-width` cap and the progress label moves adjacent to the track.

## Impact

- **Code**: [terminal.html](terminal.html) — `.stardate-*` CSS rules (around lines 262–305), `.progress-section`/`.progress-track` rules (around lines 360–375), stardate panel markup (around line 575), `tickClock()` function in the stardate module to emit `<span>`-wrapped colons.
- **State**: None new.
- **APIs**: None — fully client-side.
- **Docs**: None until the next archive pass.
