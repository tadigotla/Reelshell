## ADDED Requirements

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
