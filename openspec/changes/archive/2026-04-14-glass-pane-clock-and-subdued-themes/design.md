## Context

The DVR glass pane introduced by `dvr-stop-record-toggle` lands as an empty `<div id="fortuneSlot">` inside `.playback-right`. The pane already has the frosted-glass styling (translucent dark + `backdrop-filter: blur` + inset highlight) — we just need to populate it. Separately, the existing palette uses fully-saturated neon hex values defined as CSS custom properties at [terminal.html:10-25](terminal.html#L10-L25), with a flicker animation at [terminal.html:72](terminal.html#L72) that pulses opacity 97%↔100% every 80ms. Both are recognized retro-CRT motifs but become uncomfortable for any session longer than a few minutes.

## Goals / Non-Goals

**Goals:**
- Give the glass pane a clear, useful identity (a "stardate panel") that earns its real estate without being a gimmick.
- Animate as little as possible: tick the clock once per second, cross-fade the ambient line every ~10 seconds, nothing else.
- Reduce sustained eye strain: desaturated palette, lower glow alphas, less aggressive flicker, all controllable from a small set of CSS variables.
- Keep the visual identity recognizable — themes are still "green / amber / cyan / red," still glow, still feel like a CRT.
- Pause clock and rotation when the tab is hidden (cheap correctness).
- Stay inside [terminal.html](terminal.html), no new dependencies, no asset files.

**Non-Goals:**
- 12-hour format, locale-aware date formatting, or timezone selection — fixed 24h, fixed `DDD  DD MMM YYYY` format.
- Persisting palette tweaks across reloads, custom user palettes, or a "high-contrast" mode.
- Removing the CRT flicker entirely — only reducing its amplitude/cadence.
- An "off" toggle for the stardate panel — if the user dislikes it, the next iteration can add a setting.
- Building a full settings/preferences subsystem.

## Decisions

### Decision 1: Stardate panel structure — three lines, fixed roles

The panel uses a fixed three-line layout rather than a free-form area. Line 1 (clock) is the visual anchor; line 2 (date) is secondary; line 3 (ambient) is the only thing that ever changes mid-session. This keeps the design legible at a glance and avoids the Christmas-tree problem of multiple animated regions competing for attention. Alternative considered: a single line that cycles among everything — rejected because the clock is the most useful element and demoting it to "1 of N" hides it.

### Decision 2: Ambient rotation cadence and content

A 10-second rotation interval on line 3, cycling in fixed order through `UPTIME → CMDS → THEME → FORTUNE` and looping. This is slow enough to read but fast enough to feel alive. The fortune corpus reuses the existing 3-entry array from the `fortune` command; we move that array to a module-level `const FORTUNES` so both the command and the panel reference the same source. Alternative considered: random rotation order — rejected because predictable order makes it easier for a user to know "the clock is the only thing they need to look at."

### Decision 3: Cross-fade transitions only

The clock ticks via direct text replacement (no animation — the human eye is good at reading discrete updates at 1Hz, and any tween adds CPU cost for nothing). The ambient line uses a 400ms opacity cross-fade by toggling a class. Alternative considered: typewriter effect on the ambient line — rejected because it's too noisy for a passive panel.

### Decision 4: Lifecycle and `visibilitychange`

Two `setInterval` handles (`clockTimer`, `ambientTimer`). On `document.visibilitychange`:
- `visibilityState === 'hidden'`: clear both timers.
- `visibilityState === 'visible'`: re-run the immediate tick (so the clock isn't stale when the user returns) and restart both timers.

This is correct, cheap, and avoids the common bug where background tabs accumulate ticks. Alternative considered: `requestAnimationFrame` — rejected, overkill for 1Hz updates.

### Decision 5: Desaturated palette via HSL math (offline)

We don't compute desaturation at runtime. We pick new hex values once, by hand, targeting roughly `S ≈ 65–75%` and `L ≈ 60–65%` for each of the four themes. The result preserves hue identity (still recognizably green/amber/cyan/red) while pulling the eye-burn down significantly. Concrete proposed values (final values can be tweaked in implementation):

| Theme | Old (neon) | New (subdued) |
|-------|-----------|---------------|
| green | `#39ff14` | `#7ed957` |
| amber | `#ffb700` | `#e8a93b` |
| cyan  | `#00e5ff` | `#5cc4d6` |
| red   | `#ff3333` | `#e06b6b` |

Glow alphas drop from `0.35` to `0.20`. Alternative considered: a CSS `filter: saturate(0.7)` on the wrapper — rejected because it desaturates non-theme content (text, background gradients) too.

### Decision 6: Flicker amplitude controlled by a CSS variable

Introduce `--flicker-min` (default `0.985`) and use it inside the `flicker` keyframes (`0% { opacity: var(--flicker-min); } 100% { opacity: 1; }`). Widen the animation duration from `0.08s` to `0.12s`. The default `0.985` is dramatically calmer than the current `0.97` while still reading as a CRT pulse. Alternative considered: removing the animation entirely — rejected because the project's identity leans on the CRT motif.

### Decision 7: Glass pane internal layout

Inside `.playback-right`, replace the empty `#fortuneSlot` with a `.stardate-panel` containing:
```
<div class="stardate-clock" id="stardateClock">--:--:--</div>
<div class="stardate-date"  id="stardateDate">--- -- --- ----</div>
<div class="stardate-ambient" id="stardateAmbient">…</div>
```

Layout uses `display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 2px; padding: 8px 12px; height: 100%;`. The clock uses `font-family: 'Share Tech Mono', monospace; font-size: ~22px; letter-spacing: 2px; color: var(--term-green); text-shadow: 0 0 6px var(--term-green-glow);` so it picks up the active theme color naturally. The date is ~10px in `--term-muted`. The ambient line is ~10px in a slightly brighter muted color, with `transition: opacity 0.4s ease;`.

Keeping `id="fortuneSlot"` as a class on the new container preserves any external reference (none in code today, but the spec from the prior change calls it "addressable") — actually we just rename the id; no external code depends on it.

## Risks / Trade-offs

- **Risk**: The cross-fade rotation could distract a user staring at the clock. → **Mitigation**: 10-second cadence is slow; the rotating line is small and muted; if it still bothers users we can ship a setting later.
- **Risk**: Desaturating themes is subjective — some users might prefer the neon. → **Mitigation**: New values are still clearly green/amber/cyan/red. If demand surfaces, a future change can add a `theme neon` modifier or restore the old values as a separate option. Out of scope here.
- **Risk**: `backdrop-filter` already costs paint; adding a 1Hz repaint inside the pane stacks costs. → **Mitigation**: the clock is plain text inside a small element — repaint cost is negligible compared to the existing filter.
- **Trade-off**: Hard-coded date format (`DDD  DD MMM YYYY`) ignores locale. We accept this because the panel is part of the fictional NEXTERM aesthetic, not a productivity surface.
- **Risk**: Hidden-tab handling adds complexity for a small benefit. → **Mitigation**: ~6 lines of code, well-understood pattern, prevents background timer drift.
