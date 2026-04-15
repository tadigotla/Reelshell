# privacy-boundary Specification

## Purpose
TBD - created by archiving change persistent-session. Update Purpose after archive.

## Requirements
### Requirement: No network egress at runtime

Nexterm SHALL NOT contain any code path that initiates outbound network communication. The source tree SHALL NOT reference `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon`, `navigator.serviceWorker`, `import()` of remote URLs, dynamic `<script>` injection with external `src`, or any other mechanism that causes the browser to make a network request on behalf of the app.

#### Scenario: Source audit
- **WHEN** a reviewer greps the source tree and the generated `terminal.html` for network API identifiers
- **THEN** the only matches (if any) are inside comments, CSP declarations, or user-visible help text — never in executable code paths
- **AND** the mock `weather` command generates its output purely client-side from a fixed list (it does not call any weather API)

#### Scenario: New code introduces a network call
- **WHEN** a future change accidentally introduces a `fetch()` to an external URL
- **THEN** the browser refuses the request at runtime because the CSP `connect-src 'none'` directive blocks it
- **AND** a CSP violation is logged in the browser console, surfacing the regression

### Requirement: CSP meta tag locks network and resource origins

`terminal.template.html` SHALL declare a `<meta http-equiv="Content-Security-Policy">` tag as one of the earliest elements in `<head>`. The policy SHALL include, at minimum: `default-src 'self'`, `connect-src 'none'`, `img-src 'self' data:`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `font-src 'self'`, `form-action 'none'`, `base-uri 'self'`, and `frame-ancestors 'none'`.

#### Scenario: Terminal loads with CSP enforced
- **WHEN** `terminal.html` is opened in a browser that enforces CSP meta tags
- **THEN** the CSP declaration is read before any inline `<script>` executes
- **AND** any attempt to `fetch`, open a `WebSocket`, or load an external resource is blocked by the browser
- **AND** no CSP violations are logged during normal operation (boot, all commands, themes, DVR, persistence)

#### Scenario: Browser ignores CSP meta under `file://`
- **WHEN** the user opens `terminal.html` from `file://` in a browser that does not enforce meta-CSP for local files
- **THEN** the terminal still functions correctly (the CSP is defense in depth, not a load-bearing runtime check)
- **AND** the requirement that no network code exists in the source remains the primary guarantee

### Requirement: No external resource references

Nexterm SHALL NOT reference external resources. `terminal.html` SHALL NOT include any `<link rel="stylesheet" href="http...">`, `<script src="http...">`, `<img src="http...">`, external font imports (`@import url(...)`, `@font-face src: url(http...)`), or any other dependency on a non-`'self'` origin.

#### Scenario: Asset audit
- **WHEN** a reviewer inspects `terminal.template.html` and the generated `terminal.html`
- **THEN** every `href`, `src`, and `url(...)` reference resolves to an inline resource, a relative path under the repo, or a `data:` URI
- **AND** no absolute `http://` or `https://` URL appears in any asset reference

### Requirement: Persisted data stays same-origin

All persisted session data SHALL remain under the origin of the loaded `terminal.html`. Nexterm SHALL NOT write persisted data to any location outside the browser's same-origin storage partitions (`localStorage`, `IndexedDB`). Nexterm SHALL NOT transmit persisted data to any remote service.

#### Scenario: User inspects storage in devtools
- **WHEN** the user opens browser devtools and inspects storage for the origin
- **THEN** all persisted nexterm data is visible under this origin's `localStorage` and `IndexedDB`
- **AND** no nexterm data appears under any other origin, cookies, service worker caches, or anywhere else

### Requirement: User-visible wipe and storage status

The user SHALL at all times have a visible, one-step way to clear persisted data (`wipe` command) and to inspect what is currently stored (`sysinfo` persistence block). These controls SHALL be documented in the README and in the in-terminal `help` text.

#### Scenario: User wants to erase their session
- **WHEN** the user decides they want to clear everything nexterm has stored
- **THEN** running `wipe` and confirming with `yes` removes all persisted data and reloads the terminal to a pristine state
- **AND** no other steps (opening devtools, editing files, clearing browser data site-wide) are required

#### Scenario: User wants to know what is stored
- **WHEN** the user runs `sysinfo`
- **THEN** the persistence block shows which tiers are armed, how many bytes are used in each, the schema version, and when the last save occurred

### Requirement: No telemetry

Nexterm SHALL NOT collect, send, or log analytics, crash reports, usage metrics, error tracking, or any other form of telemetry. No user input, command history, filesystem contents, or terminal output SHALL be observed by any party other than the user themselves.

#### Scenario: Source audit
- **WHEN** a reviewer greps the source tree for telemetry-related identifiers (`analytics`, `telemetry`, `sentry`, `mixpanel`, `datadog`, `segment`, `track(`, `metric(`, etc.)
- **THEN** no matches are found in executable code
- **AND** no third-party analytics SDK is loaded or referenced
