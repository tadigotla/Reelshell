## ADDED Requirements

### Requirement: Progress slider has a maximum width

The DVR progress track SHALL have a `max-width` of approximately 360px. The track MUST shrink below this cap on narrower viewports rather than overflowing. The `.progress-section` containing the track MUST NOT use `flex: 1` — it MUST size to its content (track + label) so the slider does not stretch to fill the entire `.playback-left` width.

#### Scenario: Wide desktop viewport
- **WHEN** the viewport is wide enough that the playback panel has > 600px of horizontal space available
- **THEN** the progress track is exactly 360px wide and does not extend further

#### Scenario: Narrow desktop viewport
- **WHEN** the playback panel has between 300px and 500px of horizontal space available
- **THEN** the progress track shrinks below 360px to fit while remaining at least its existing `min-width: 60px`

### Requirement: Progress label sits adjacent to the track

The progress count label (e.g. `1 / 1`) SHALL render immediately to the right of the progress track, with the existing 10px gap. The label MUST NOT be pushed to the far right edge of the playback panel by flex stretching.

#### Scenario: Default render
- **WHEN** the DVR panel renders
- **THEN** the progress label is visually adjacent to the right edge of the progress track, separated only by the existing gap
