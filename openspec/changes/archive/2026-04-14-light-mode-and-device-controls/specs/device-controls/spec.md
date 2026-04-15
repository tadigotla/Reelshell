## ADDED Requirements

### Requirement: Mode toggle is a brushed-metal rocker switch on the title bar

The terminal SHALL render a mode toggle in the title bar, positioned between the macOS-style window dots and the title text. The toggle MUST be styled as a brushed-metal rocker switch with a track and a sliding thumb, NOT as a stock checkbox or button. The toggle MUST be operable with a single click.

#### Scenario: Toggle visible on first paint
- **WHEN** the page loads
- **THEN** a brushed-metal rocker switch is visible in the title bar to the right of the macOS-style dots, with the thumb in the dark-mode position

#### Scenario: Click flips mode
- **WHEN** the user clicks the toggle once
- **THEN** the thumb slides to the opposite position via a CSS transition, and `document.documentElement` gains or loses `data-mode="light"`

#### Scenario: Toggle reflects current mode visually
- **WHEN** `data-mode="light"` is set on `:root`
- **THEN** the thumb is rendered at the right (light) position; **WHEN** `data-mode` is absent or set to `dark`, the thumb is rendered at the left (dark) position

### Requirement: Font-size knob is an edge-wheel mounted in a slot on the playback deck

The terminal SHALL provide a font-size control mounted on the playback control surface, positioned between the `.playback-left` controls region and the `.playback-right` glass pane. The control MUST be visually styled as a vertical slot cut into the brushed-metal panel, through which a small rectangular sliver of a textured wheel is visible — as if a round wheel were mounted inside the device on a horizontal axis with only its edge protruding through the slot (the side scroll wheel of an old transistor radio or Walkman). The cursor MUST become `ns-resize` when hovering the visible wheel surface.

#### Scenario: Slot visible on first paint
- **WHEN** the page loads on desktop
- **THEN** a small dark recessed slot is visible on the playback control surface between the transport controls and the glass pane, containing a textured wheel-edge sliver

#### Scenario: Slot hidden on mobile
- **WHEN** the viewport is at the existing mobile breakpoint
- **THEN** the font-size control is hidden so it does not interfere with the mobile layout

### Requirement: Wheel ridges scroll vertically to reflect current font size

The visible wheel surface SHALL render as a vertically repeating pattern of fine horizontal ridges. As the user drags the wheel, the ridges MUST visibly scroll in the drag direction so the control reads as a physical wheel rolling inside the device. The scroll position MUST be a deterministic function of the current font size — not random — so the same font size always produces the same visible ridge alignment.

#### Scenario: Ridge alignment at default font size
- **WHEN** the page loads at the default font size
- **THEN** the wheel's ridge pattern is at its baseline scroll offset for that font size

#### Scenario: Drag up scrolls ridges upward
- **WHEN** the user drags the wheel upward
- **THEN** the visible ridges scroll upward (giving the impression of the wheel rolling) and the font size grows

#### Scenario: Drag down scrolls ridges downward
- **WHEN** the user drags the wheel downward
- **THEN** the visible ridges scroll downward and the font size shrinks

#### Scenario: Same font size, same alignment
- **WHEN** the user drags to `15px`, drags away, then drags back to `15px`
- **THEN** the ridge pattern returns to the same visible alignment both times

### Requirement: Dragging the knob scales the terminal output font

Dragging the font-size knob upward SHALL increase the terminal output font size; dragging downward SHALL decrease it. The font size MUST be clamped to a range of approximately `11px` to `22px`. The default font size on first paint MUST match the prior `.output-area` value (no visual change before any drag). The font size MUST be reflected via a single CSS custom property `--output-font-size` on `:root`, and `.output-area` MUST consume that variable.

#### Scenario: Drag up grows the font
- **WHEN** the user mousedowns on the knob and drags vertically upward by 50px
- **THEN** the output font size grows by approximately 3px (within the clamp range)

#### Scenario: Drag down shrinks the font
- **WHEN** the user mousedowns on the knob and drags downward by 50px
- **THEN** the output font size shrinks by approximately 3px

#### Scenario: Clamp prevents extremes
- **WHEN** the user drags the knob far upward
- **THEN** the font size grows up to its maximum (~22px) and stops, even with continued dragging

#### Scenario: Click without drag is a no-op
- **WHEN** the user clicks the knob and releases without movement
- **THEN** the font size does not change

### Requirement: Knob shows a current-size indicator while dragging

While the user is actively dragging the font-size knob, the terminal SHALL display a small floating indicator showing the current font size in pixels. The indicator MUST appear near the knob and MUST fade out within roughly 600ms after the user releases the mouse.

#### Scenario: Indicator visible during drag
- **WHEN** the user is mid-drag on the knob
- **THEN** a small text label (e.g. `15px`) is visible adjacent to the knob and updates as the size changes

#### Scenario: Indicator fades after release
- **WHEN** the user releases the mouse after dragging
- **THEN** the indicator fades out within ~600ms and is removed from the layout flow

### Requirement: Mode toggle and font knob neither persist

Mode toggle state and font-size value MUST NOT persist across page reloads. On every load, the terminal MUST start in dark mode with the default output font size.

#### Scenario: Reload resets mode and font
- **WHEN** the user switches to light mode, drags the font knob to ~18px, then reloads the page
- **THEN** the page reloads in dark mode at the default font size
