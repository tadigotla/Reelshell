## Context

Today's `:root` block at [terminal.html:10-25](terminal.html#L10-L25) mixes two different concerns into a single palette: **chassis tokens** (`--term-bg`, `--term-bg-light`, `--term-surface`, `--term-border`, `--term-text`, `--term-muted`) that describe the physical terminal device, and **theme tokens** (`--term-green`, `--term-amber`, `--term-cyan`, `--term-red`, `--term-green-glow`) that describe the active color theme. These two sets are independent — flipping dark/light should change the chassis tokens, while flipping the color theme should change only the theme tokens. Today they aren't separated, so adding light mode requires teasing them apart.

The DVR transport already uses brushed-metal styling for its hardware-control identity. The new mode toggle and font knob should reuse that visual language so they read as part of the same physical chassis. The font knob in particular is a "mostly hidden" affordance: only a small textured grip pokes out from inside the bezel, so it doesn't compete with the terminal content for attention.

## Goals / Non-Goals

**Goals:**
- Cleanly separate chassis tokens from theme tokens so light/dark switching is a one-attribute flip.
- Ship a brushed-metal rocker switch that reads as a physical control, not a checkbox.
- Ship a vertical font-size knob whose visual identity is "a small handle on the side of the device" — most of its body sits behind the bezel.
- Make the glass pane clock larger without changing the panel's outer dimensions.
- Drop two pieces of cruft (LOCAL label, boot welcome help line) without disturbing anything else.
- All changes inside `terminal.html`. No new dependencies, no asset files.

**Non-Goals:**
- Persisting mode or font size across reloads (deliberate consistency with `recordingEnabled` and `activeThemeName`).
- A full preferences/settings panel.
- Per-theme dark/light variants (e.g. "amber-light" as a distinct theme). Light mode is one chassis variant, not a multiplier.
- An `auto` mode that follows `prefers-color-scheme` — would be reasonable later but out of scope here.
- A horizontal font knob, scroll-wheel font sizing, or keyboard shortcuts for font sizing.
- Touch-drag support for the font knob (mouse only this round; can be added later).

## Decisions

### Decision 1: Split `:root` into chassis tokens and theme tokens

Restructure the palette block so all chassis-related tokens live in one cluster and all theme-related tokens live in another. Add a new `:root[data-mode="light"]` selector that overrides only the chassis cluster. The theme tokens remain unchanged across modes. JS attaches/removes `data-mode="light"` on `document.documentElement` to flip.

Light-mode chassis token proposal (final values can be tuned in implementation):

| Token | Dark (current) | Light (new) |
|---|---|---|
| `--term-bg` | `#0a0a0a` | `#f4f1ea` (paper) |
| `--term-bg-light` | `#111111` | `#ffffff` |
| `--term-surface` | `#1a1a1a` | `#e8e4dc` |
| `--term-border` | `#222` | `#c9c4ba` |
| `--term-text` | `#d4d4d4` | `#2a2a2a` |
| `--term-muted` | `#666` | `#888` |
| `--scanline-opacity` | `0.04` | `0.02` |
| `--flicker-min` | `0.985` | `0.995` |

The theme color values (greens/ambers/cyans/reds) stay the same — they read fine on both backgrounds because they're saturated mid-luminance hues.

Alternative considered: a global `filter: invert(1)` on the wrapper. Rejected because it inverts the theme colors too (green becomes magenta).

### Decision 2: Mode toggle is a CSS-only rocker switch

The toggle is a `<button class="mode-toggle" id="modeToggle">` containing a track and a sliding thumb. Two short labels (`SUN` / `MOON` glyphs, or `LT` / `DK`) sit at each end. The thumb is a small brushed-metal rectangle that moves left/right via a `transform: translateX(...)` controlled by a `[data-mode="light"]` attribute on `:root` (selector chain: `:root[data-mode="light"] .mode-toggle .mode-toggle-thumb { transform: translateX(...) }`). No JS animation — pure CSS transition. Click handler just toggles the attribute.

Visual: brushed-metal track (reusing the playback-surface's repeating-linear-gradient grain), inset shadow, and a textured thumb. Width ~44px × height ~20px. Lives in the title bar to the right of the macOS-style dots, before the title text.

Alternative considered: a checkbox styled with CSS. Rejected because we want the visual specifically to read as hardware, not a checkbox.

### Decision 3: Glow and flicker scale down in light mode, don't disappear

In light mode, the `--term-green-glow` alpha could be dropped, but it's already low (`0.20`) and the soft halo is part of the project identity. We instead reduce `--scanline-opacity` from `0.04 → 0.02` and raise `--flicker-min` from `0.985 → 0.995` (tighter cycle). The phosphor halo on the wrapper (`box-shadow: 0 0 80px rgba(126,217,87,0.06)`) stays as-is — it's already barely visible against light backgrounds.

Alternative considered: turning flicker and scanlines off entirely in light mode. Rejected because then "light mode" loses the CRT identity completely, becoming a different product.

### Decision 4: Larger clock at fixed panel height

Move the clock font from `22px → 28px` and the DOW/date from `10px → 12px`. With the `LOCAL` label gone, the clock-block has only one child instead of two, so the larger clock fits inside the same vertical room. Date column now has `12px` × 2 lines + `1.3` line-height = ~31px, which still fits under the 88px panel min-height with padding.

We do NOT remove the `.stardate-label` CSS rule entirely — only the markup that uses it — so a future addition can reuse the rule. Actually scratch that: dead CSS is a maintenance smell. We delete the rule too.

Alternative considered: keep the LOCAL label but shrink it to 7px. Rejected — the user said the label isn't helping at all.

### Decision 5: Font-size knob lives on the right edge of `.crt-wrapper`

The knob is a child element of `.crt-wrapper`, positioned absolutely:
- `right: -4px` (so half of it sits inside the wrapper's `border-radius` zone, half pokes out)
- `top: 50%; transform: translateY(-50%);`
- `width: 14px; height: 80px;`
- `border-radius: 4px;`
- Background: brushed-metal vertical gradient + grain (same recipe as `.playback-surface` but vertical orientation).
- Inset shadow + a subtle "rivet" detail at top and bottom (`::before` and `::after`).
- `cursor: ns-resize;`
- `z-index: 12` so it sits above the wrapper's flicker overlay and the CRT shadow ring but below modal/boot overlays.

The drag handler:
- `mousedown` on the knob captures the starting `clientY` and current font size.
- `mousemove` (attached to `window` while dragging) computes `delta = startY - currentY` (negative = dragged up = larger). Maps `delta px` → `delta * 0.06px` font-size delta. Clamps to `[11, 22]`.
- Updates a single CSS variable `--output-font-size` on `:root`.
- `mouseup` releases the listeners.
- A small floating tooltip near the knob shows the current size in px while dragging, fades out 600ms after release.

Alternative considered: a slider input. Rejected because the project's controls are all custom-styled metal — a stock slider would clash. Also tried: scroll-wheel sizing without a visible control. Rejected — discoverability is bad.

### Decision 6: `--output-font-size` is the single source of truth

Add `--output-font-size: 13.5px;` to `:root`. Replace the hardcoded `font-size: 13.5px` (or whatever the current `.output-area` value is — we'll grep) with `font-size: var(--output-font-size);`. Same for `.line-prompt-echo` if it has a font-size, and the `.input-field` if appropriate. The font knob then only needs to update one variable.

Alternative considered: scaling via a transform. Rejected — breaks layout math (the output area becomes the wrong height) and blurs text on non-integer scales.

### Decision 7: Remove the welcome help line, keep the welcome line

The boot routine prints two `system` lines today:
```
Welcome to NEXTERM — your browser-based terminal.
Type help to see all commands. Use the transport bar to replay your session — STOP returns to live and toggle RECORD to pause snapshot capture.
```

We delete the second one. The first line stays — it's the actual greeting. The information in the deleted line is still discoverable: `help` is the name of the command, the transport bar is visually obvious, and the new STOP/RECORD controls are part of the panel users will see.

## Risks / Trade-offs

- **Risk**: Light mode might make the green-on-paper theme look like sticky-note text. → **Mitigation**: We're using the existing desaturated theme values (`#7ed957`, etc.), which were already chosen for comfort. The light-mode background is paper (`#f4f1ea`), not bright white, so the contrast stays inside readable territory. If green is genuinely unreadable on paper, users can switch to amber or red.
- **Risk**: A 28px clock at the same panel height could crowd the date column. → **Mitigation**: Decision 4 walks the math. If it actually overflows in browser, the fix is dropping the clock to 26px — a one-line change.
- **Risk**: The font knob handle is small and easy to miss. → **Mitigation**: That's intentional ("mostly inside the device") — discoverability comes from a hover tooltip + the textured brushed-metal grip catching the eye against the surrounding bezel.
- **Risk**: Mouse-only drag excludes mobile. → **Mitigation**: The font knob is hidden on the existing mobile breakpoint anyway (or should be — task #5 covers this).
- **Risk**: Font sizes outside `[11, 22]` could break the layout (input field height assumptions, status bar overlap). → **Mitigation**: The clamp prevents this. If 22px still breaks something, we tighten the clamp.
- **Trade-off**: No persistence means a user who prefers light mode sets it every reload. We accept this in exchange for keeping the implementation small and consistent with prior decisions. A future change can add `localStorage` persistence to all three (mode, theme, font size) in one shot.
