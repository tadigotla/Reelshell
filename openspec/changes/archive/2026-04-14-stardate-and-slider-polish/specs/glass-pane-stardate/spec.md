## ADDED Requirements

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
