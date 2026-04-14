# glass-pane-stardate Specification

## Purpose
TBD - created by archiving change glass-pane-clock-and-subdued-themes. Update Purpose after archive.
## Requirements
### Requirement: Glass pane renders a three-line stardate panel

The DVR glass pane SHALL render a stardate panel containing exactly three stacked text elements: a clock line, a date line, and an ambient line. The panel MUST be vertically and horizontally centered within the glass pane and MUST occupy the full height of `.playback-right`.

#### Scenario: Default render
- **WHEN** the page loads and the boot sequence completes
- **THEN** the glass pane shows the current time (HH:MM:SS), the current day-of-week + date, and an initial ambient line, all stacked vertically and centered

#### Scenario: Empty pane on mobile
- **WHEN** the viewport is ≤640px wide and the glass pane is hidden by the existing mobile rule
- **THEN** the stardate panel timers MAY still run (no error), and no visible content is shown

### Requirement: Clock ticks once per second in 24-hour format

The clock line SHALL display the current local time in `HH:MM:SS` 24-hour format and update once per second. The format MUST use zero-padded two-digit fields. The clock MUST adopt the active theme color via `var(--term-green)` so theme switching is automatic.

#### Scenario: Clock updates each second
- **WHEN** the page has been open for at least three seconds
- **THEN** the clock text has changed at least twice and the displayed value matches `new Date()` to within one second

#### Scenario: Theme switch updates clock color
- **WHEN** the user runs `theme amber`
- **THEN** the clock glyph color updates to the amber theme value without any explicit clock-redraw call

### Requirement: Date line shows day-of-week, day, month, year

The date line SHALL display the current date as `DDD  DD MMM YYYY` (e.g. `MON  14 APR 2026`) using uppercase three-letter day-of-week and three-letter month abbreviations. The date MUST be re-evaluated on every clock tick so a midnight rollover is reflected without a page reload.

#### Scenario: Default render
- **WHEN** the panel renders
- **THEN** the date line matches the format `[A-Z]{3}  [0-9]{2} [A-Z]{3} [0-9]{4}`

#### Scenario: Midnight rollover
- **WHEN** the local clock crosses midnight while the page is open
- **THEN** within one second of the rollover the date line displays the new day's value

### Requirement: Ambient line rotates through fixed content set

The ambient line SHALL cycle every 10 seconds through a fixed sequence of content variants in this order: session uptime, command count, active theme name, and a fortune drawn from the existing fortune corpus. After the fortune variant the cycle MUST loop back to uptime. Each transition MUST cross-fade via a CSS opacity transition of approximately 400ms; instantaneous text swaps MUST NOT be used.

#### Scenario: First five rotations
- **WHEN** the panel has been mounted for 50 seconds
- **THEN** the ambient line has shown, in order: uptime, command count, theme name, fortune, uptime

#### Scenario: Cross-fade transition
- **WHEN** the ambient line is about to change content
- **THEN** the existing line fades out, the text is swapped while opacity is 0, and the new line fades in within ~400ms total

#### Scenario: Fortune source consistency
- **WHEN** the ambient line shows a fortune
- **THEN** that fortune is drawn from the same module-level fortune array used by the `fortune` command

### Requirement: Panel timers pause when the tab is hidden

When `document.visibilityState === 'hidden'`, both the clock-tick interval and the ambient-rotation interval MUST be cleared. When `visibilityState` returns to `visible`, the panel MUST immediately re-render the current time and date and restart both intervals.

#### Scenario: Tab hidden then visible
- **WHEN** the user switches to another browser tab and returns 60 seconds later
- **THEN** the clock displays the correct current time within one second of becoming visible, and no background ticks fired during the hidden period

### Requirement: Stardate panel uses theme variables for color

The clock line SHALL use `var(--term-green)` and `var(--term-green-glow)` for its color and text-shadow respectively. The date and ambient lines SHALL use `var(--term-muted)` and a slightly brighter muted color for readability. The panel MUST NOT hard-code theme hex values inline.

#### Scenario: Cross-theme visual consistency
- **WHEN** the user cycles through all four themes
- **THEN** the clock color updates to each theme's primary color, and the date and ambient lines remain readable on the glass background in every theme

### Requirement: Stardate panel uses a two-column header with full-width ambient footer

The stardate panel SHALL render a header row containing the clock on the left and the date on the right, separated by a thin vertical divider, with the ambient line as a full-width footer below the header. The clock and date columns MUST be vertically centered within the header row.

#### Scenario: Default desktop render
- **WHEN** the page loads on a desktop viewport
- **THEN** the glass pane shows the clock occupying the left half of the header row, the date occupying the right half, a 1px vertical divider between them, and the ambient line spanning the full width below

#### Scenario: Narrow glass pane width
- **WHEN** the glass pane is at its minimum allowed width (the existing `min-width: 180px` from `.playback-right`)
- **THEN** neither the clock nor the date overflows or wraps unexpectedly, and the divider remains visible

### Requirement: Date column shows day-of-week and date on two lines

The date column SHALL display the day-of-week (e.g. `MON`) on the first line and the day + month + year (e.g. `14 APR 2026`) on a second line. Both lines MUST use the existing muted styling and uppercase formatting.

#### Scenario: Default render
- **WHEN** the panel renders
- **THEN** the date column shows two stacked text lines matching the patterns `[A-Z]{3}` and `[0-9]{2} [A-Z]{3} [0-9]{4}`

### Requirement: Clock column shows a `LOCAL` label above the time

The clock column SHALL display a small uppercase `LOCAL` label centered above the clock value. The label MUST use a font size of approximately 9px and the existing muted color.

#### Scenario: Label visible
- **WHEN** the page loads
- **THEN** a `LOCAL` label is visible directly above the HH:MM:SS clock value, horizontally centered with the clock

### Requirement: Clock colons blink once per second

The two `:` separators in the clock SHALL fade between full opacity and approximately 30% opacity once per second via a CSS animation. The animation MUST resync with each clock tick so the blink remains aligned with the seconds advance. The blink MUST NOT cause horizontal layout shift.

#### Scenario: Visible blink
- **WHEN** the page has been open for several seconds
- **THEN** the colons in the clock visibly fade and recover at ~1Hz while the surrounding digits remain at full opacity

#### Scenario: No layout shift
- **WHEN** the colons are at their lowest opacity
- **THEN** the digit positions on either side of each colon do not shift horizontally

### Requirement: Clock uses tabular numerics

The clock element SHALL apply `font-variant-numeric: tabular-nums` so each digit occupies the same horizontal width across ticks.

#### Scenario: Stable digit width
- **WHEN** the clock advances from `12:11:18` to `12:11:19`
- **THEN** no horizontal motion is visible in the surrounding digits

### Requirement: Ambient line shows a pulsing LED prefix

The ambient line SHALL display a small bullet character (`●`) immediately before its text content. The bullet MUST use the active theme color via `var(--term-green)` and MUST pulse opacity between full and approximately 40% over a ~2-second cycle. The bullet MUST be implemented via a CSS pseudo-element so it persists across content swaps without being touched by the cross-fade.

#### Scenario: LED visible on first paint
- **WHEN** the panel mounts and the first ambient variant is shown
- **THEN** a small theme-colored dot is visible immediately to the left of the ambient text

#### Scenario: LED survives content rotation
- **WHEN** the ambient line cross-fades to the next variant
- **THEN** the LED remains visible and continues pulsing without resetting

#### Scenario: LED follows theme color
- **WHEN** the user runs `theme amber`
- **THEN** the LED color updates to amber on the next paint

