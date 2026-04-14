# dvr-transport Specification

## Purpose
TBD - created by archiving change dvr-stop-record-toggle. Update Purpose after archive.
## Requirements
### Requirement: STOP button halts playback and returns to live mode

The DVR transport bar SHALL provide a STOP button that, when activated, cancels any in-flight auto-play, exits playback mode, and restores the live terminal view (`snapshotIdx === -1`). STOP MUST be visually and behaviorally distinct from Pause, which only freezes the current snapshot index.

#### Scenario: STOP pressed during auto-play
- **WHEN** auto-play is running (`isPlaying === true`) and the user clicks STOP
- **THEN** the auto-play interval is cleared, `snapshotIdx` is set to `-1`, the output is restored to the latest live snapshot, the playback badge is hidden, and the command input is re-enabled

#### Scenario: STOP pressed while paused mid-playback
- **WHEN** the user is paused at any snapshot other than the latest and clicks STOP
- **THEN** playback mode is exited, the live output is restored, and the status dot returns to green

#### Scenario: STOP pressed while already live
- **WHEN** the user clicks STOP and `snapshotIdx === -1`
- **THEN** no state changes occur and no error is thrown

### Requirement: RECORD toggle gates snapshot capture

The DVR transport bar SHALL provide a RECORD toggle button that controls whether new command output is captured into the snapshots array. The toggle's state is held in a `recordingEnabled` boolean. When `recordingEnabled` is `false`, the snapshot-push routine MUST early-return without appending to `snapshots`. When `recordingEnabled` is `true`, snapshots are captured per the existing DVR mechanism.

#### Scenario: Recording enabled, command executed
- **WHEN** `recordingEnabled === true` and the user runs a command
- **THEN** a new entry is appended to `snapshots` and the progress bar updates to reflect the new total

#### Scenario: Recording disabled, command executed
- **WHEN** `recordingEnabled === false` and the user runs a command
- **THEN** the command runs normally and its output is rendered live, but `snapshots.length` does not increase

#### Scenario: Recording toggled off then back on
- **WHEN** the user disables RECORD, runs three commands, then re-enables RECORD and runs a fourth command
- **THEN** only the fourth command's output is appended as a new snapshot, and the existing pre-toggle snapshots remain untouched and replayable

### Requirement: RECORD toggle defaults to enabled on load

On every page load, `recordingEnabled` MUST initialize to `true`. The RECORD button MUST render in its "armed" visual state on first paint, and the welcome snapshot MUST be captured as snapshot zero per existing DVR behavior.

#### Scenario: Fresh page load
- **WHEN** the page loads and the boot sequence completes
- **THEN** `recordingEnabled === true`, the RECORD button shows its armed state, and `snapshots[0]` contains the welcome screen

### Requirement: RECORD button reflects armed state visually

When `recordingEnabled === true`, the RECORD button MUST display a clearly distinguishable "armed" visual treatment (e.g., a red-tinted glyph or glow) to communicate that capture is active. When `recordingEnabled === false`, the button MUST revert to the idle transport-button styling.

#### Scenario: Toggling the RECORD button
- **WHEN** the user clicks the RECORD button
- **THEN** `recordingEnabled` flips, the button's armed-state class is added or removed accordingly, and the change is visible without a page reload

### Requirement: Playback of existing snapshots is independent of recording state

The Play, Pause, Rewind, Back, Ahead, Fast Forward, STOP, and progress-bar scrubbing controls MUST function identically regardless of `recordingEnabled`. Disabling recording affects only future snapshot capture, never replay of already-captured snapshots.

#### Scenario: Replay while recording disabled
- **WHEN** the user has captured ten snapshots, disables RECORD, then clicks Play
- **THEN** auto-play advances through all ten existing snapshots normally

