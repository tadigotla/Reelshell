## ADDED Requirements

### Requirement: Chassis tokens are separated from theme tokens

The `:root` CSS palette SHALL group its custom properties into two clusters: **chassis tokens** that describe the device shell (`--term-bg`, `--term-bg-light`, `--term-surface`, `--term-border`, `--term-text`, `--term-muted`, `--scanline-opacity`, `--flicker-min`) and **theme tokens** that describe the active color theme (`--term-green`, `--term-green-dim`, `--term-green-glow`, `--term-amber`, `--term-cyan`, `--term-red`, `--term-magenta`). Light/dark mode switching MUST affect only chassis tokens; the `theme` command MUST affect only theme tokens.

#### Scenario: Theme switch in dark mode does not change chassis tokens
- **WHEN** the user runs `theme amber` while in dark mode
- **THEN** `--term-green` updates to the amber value but `--term-bg`, `--term-surface`, `--term-border`, `--term-text`, and `--term-muted` remain at their dark values

#### Scenario: Mode switch does not change theme tokens
- **WHEN** the user clicks the mode toggle to flip from dark to light
- **THEN** `--term-bg`, `--term-surface`, etc. update to their light values, but `--term-green` and `--term-green-glow` remain at their current theme values

### Requirement: Light mode is activated via `[data-mode="light"]` on `:root`

The terminal SHALL provide a CSS rule `:root[data-mode="light"]` that overrides only the chassis tokens with their light-mode values. Setting or removing the `data-mode` attribute on `document.documentElement` MUST be sufficient to flip the terminal between modes — no additional class toggles, no full re-render.

#### Scenario: Light mode applied
- **WHEN** the JavaScript sets `document.documentElement.dataset.mode = 'light'`
- **THEN** the terminal background becomes the light paper color, the text becomes dark, and the border becomes light gray within one paint frame

#### Scenario: Light mode removed
- **WHEN** the JavaScript sets `document.documentElement.dataset.mode = 'dark'` or removes the attribute
- **THEN** the chassis tokens revert to their default dark values

### Requirement: CRT effects scale down but do not disappear in light mode

The screen flicker amplitude and the scanline overlay opacity SHALL be reduced in light mode but MUST remain perceptible. Specifically, `--scanline-opacity` MUST be lower in light mode than in dark, and `--flicker-min` MUST be closer to `1.0` in light mode than in dark, so the flicker pulse is gentler. The phosphor halo on `.crt-wrapper` MAY remain unchanged across modes.

#### Scenario: Light mode flicker is gentler
- **WHEN** light mode is active
- **THEN** `--flicker-min` resolves to a value closer to `1.0` than its dark-mode value

#### Scenario: Light mode scanlines are subtler
- **WHEN** light mode is active
- **THEN** `--scanline-opacity` resolves to a value lower than its dark-mode value

#### Scenario: CRT identity preserved
- **WHEN** light mode is active
- **THEN** the screen still subtly flickers and the scanline overlay is still visible against the paper background

### Requirement: All four color themes work in both modes

The four built-in color themes (`green`, `amber`, `cyan`, `red`) MUST remain selectable via the `theme` command in both dark and light modes. Each theme's primary color MUST be readable on both the dark and light background variants.

#### Scenario: Theme switch in light mode
- **WHEN** the user is in light mode and runs `theme cyan`
- **THEN** the active accent color updates to cyan, terminal text remains readable on the paper background, and the glow effects render correctly

#### Scenario: Mode switch preserves active theme
- **WHEN** the user has selected `theme amber` in dark mode and then flips to light mode
- **THEN** the active theme is still amber after the mode flip — the user does not have to re-run the theme command
