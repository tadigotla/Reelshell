## ADDED Requirements

### Requirement: Playback surface uses a brushed-metal finish

The `.playback-surface` element SHALL render with a brushed-metal visual treatment composed of a layered vertical light/dark gradient, a horizontal repeating-linear-gradient grain (~1px stripes, low-opacity white over the base), a subtle top-center radial highlight, and beveled top/bottom hairline edges. The finish MUST be implemented in pure CSS (no image assets) to preserve the project's single-file constraint.

#### Scenario: Default page render
- **WHEN** the page loads and the playback surface is visible
- **THEN** the surface displays a metallic gradient with visible horizontal grain and beveled top/bottom edges, rather than the previous flat dark gradient

#### Scenario: Theme switch
- **WHEN** the user changes the active color theme
- **THEN** the brushed-metal finish remains unchanged (it is theme-independent), and only theme-bound elements (button glyphs, progress fill) update

### Requirement: Playback surface height is doubled without resizing controls

The `.playback-surface` element SHALL have a `min-height` approximately twice its previous resolved height on desktop viewports. The `.transport-btn` width and height, the SVG glyph size, and the progress slider track and knob dimensions MUST remain unchanged from their pre-change values.

#### Scenario: Desktop layout
- **WHEN** the page is rendered on a desktop viewport (>640px wide)
- **THEN** the playback surface occupies roughly twice the vertical space it did before, while every transport button and the progress slider retain their original pixel dimensions

#### Scenario: Mobile layout
- **WHEN** the page is rendered on a viewport ≤640px wide
- **THEN** the playback surface uses the mobile breakpoint sizing (reduced height and padding) so the terminal output area is not overly compressed

### Requirement: Playback surface splits into left controls region and right glass pane

The `.playback-surface` SHALL contain two child regions: `.playback-left` holding the existing transport-controls row and progress bar, and `.playback-right` holding a glass-pane element. The left region MUST occupy the larger share of horizontal space and MUST preserve today's transport row + progress bar arrangement. The right region MUST be visually distinct as a frosted-glass pane overlaid on the brushed-metal substrate.

#### Scenario: Default desktop render
- **WHEN** the page loads on desktop
- **THEN** the transport controls and progress bar appear in the left region, vertically centered within the doubled-height surface, and the glass pane fills the right region

#### Scenario: Glass-pane content slot is empty but addressable
- **WHEN** the page loads
- **THEN** the glass pane contains a single empty content slot element (e.g. with a stable id/class) ready for future content injection, and no visible placeholder text is shown

#### Scenario: Mobile collapse
- **WHEN** the viewport is ≤640px wide
- **THEN** the glass pane is hidden and the left region expands to fill the available width

### Requirement: Glass pane uses frosted-glass styling

The glass-pane element SHALL use a translucent dark background, a `backdrop-filter` blur (with saturate boost), a 1px inset highlight on its top edge, and a soft inner shadow to read as a recessed glass surface over the brushed-metal panel.

#### Scenario: Glass pane visual treatment
- **WHEN** the glass pane is rendered on a browser supporting `backdrop-filter`
- **THEN** content visible behind the pane is blurred and slightly desaturated, and the pane shows a subtle top highlight and inner shadow

#### Scenario: Backdrop-filter unsupported
- **WHEN** the browser does not support `backdrop-filter`
- **THEN** the glass pane falls back to a flat translucent dark rectangle and the layout remains intact

### Requirement: Existing controls and shortcuts behave identically after restyle

The brushed-metal finish, doubled height, and two-region layout MUST NOT alter the behavior of any existing transport control, the progress slider, or any keyboard shortcut. Hover, active, and toggled-state styling for `.transport-btn` MUST continue to work.

#### Scenario: Shortcut continuity
- **WHEN** the user presses Space, Home, End, Arrow Left, or Arrow Right after the panel restyle
- **THEN** the existing DVR action for that key fires unchanged

#### Scenario: Slider continuity
- **WHEN** the user clicks anywhere on the progress track
- **THEN** the playhead scrubs to the proportional snapshot index exactly as before
