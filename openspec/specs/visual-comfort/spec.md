# visual-comfort Specification

## Purpose
TBD - created by archiving change glass-pane-clock-and-subdued-themes. Update Purpose after archive.
## Requirements
### Requirement: Theme palette uses desaturated values

Each of the four built-in themes (`green`, `amber`, `cyan`, `red`) SHALL use a desaturated color value rather than a fully-saturated neon value. Each new value MUST remain identifiably the named hue (no green that reads as cyan, no red that reads as orange) but MUST sit at a lower perceptual saturation than the previous neon value. The `theme` command keys MUST remain unchanged.

#### Scenario: Default theme on load
- **WHEN** the page loads
- **THEN** `--term-green` is set to a subdued green value (not `#39ff14`) and the terminal text is comfortably readable on the black background

#### Scenario: Switching to amber
- **WHEN** the user runs `theme amber`
- **THEN** `--term-green` updates to a subdued amber value (not `#ffb700`) and the runtime themes table in the `theme` command supplies that subdued value

#### Scenario: Hue identity preserved
- **WHEN** the user cycles through all four themes
- **THEN** each theme is still clearly recognizable as green, amber, cyan, or red respectively

### Requirement: Glow alphas are reduced

All `*-glow` color custom properties used for `text-shadow`, `box-shadow`, and `drop-shadow` SHALL use an alpha of approximately `0.20` (range `0.18–0.22`) rather than the prior `0.35`. The runtime `theme` command's per-theme glow values MUST match the same reduced alpha range.

#### Scenario: Default glow on load
- **WHEN** the page loads
- **THEN** `--term-green-glow` resolves to a color with alpha in the `0.18–0.22` range

#### Scenario: Switching themes preserves reduced glow
- **WHEN** the user switches between any two themes
- **THEN** the new theme's glow value also uses the reduced alpha range

### Requirement: Screen flicker amplitude is configurable and reduced

The CRT screen-flicker animation SHALL be controlled by a CSS custom property `--flicker-min` (default approximately `0.985`) representing the lower opacity bound of the flicker cycle. The animation MUST oscillate between `var(--flicker-min)` and `1`. The animation duration MUST be widened from the prior `0.08s` to approximately `0.12s` to make the pulse less aggressive.

#### Scenario: Default flicker behavior
- **WHEN** the page loads
- **THEN** the flicker animation oscillates between approximately `0.985` and `1.0` opacity at approximately `0.12s` per cycle

#### Scenario: Tuning via custom property override
- **WHEN** a developer overrides `--flicker-min` on `:root` to a different value (e.g. `0.97`)
- **THEN** the flicker animation's lower bound changes accordingly without any other code edits

### Requirement: Visual identity is preserved

The desaturation and flicker reduction MUST NOT remove the CRT/retro identity of the terminal. The phosphor glow effect MUST remain visible (just gentler), the flicker MUST remain perceptible (just less aggressive), and the four named themes MUST remain available with the same names and the same `theme <name>` command.

#### Scenario: CRT effects still visible
- **WHEN** the page loads
- **THEN** terminal text still shows a soft phosphor glow and the screen still subtly flickers

#### Scenario: Theme command still works
- **WHEN** the user runs `theme cyan`
- **THEN** the terminal switches to the cyan theme variant, just with the new subdued cyan value

