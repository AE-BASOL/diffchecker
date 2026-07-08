# Phase 5: Empty Startup - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove the automatic sample text loading at app startup. When the app opens, both `originalInput` and `modifiedInput` textareas should be empty. Add a `placeholder` attribute to each textarea. The `#sampleButton` is preserved as a manual trigger — no auto-invocation on load. `compare()` is NOT called on startup (no content to diff). Only `showEditView()` is called to display the editor.

</domain>

<decisions>
## Implementation Decisions

### Startup Behaviour
- Sample button preserved — manual trigger only, not removed
- `placeholder="Paste your text here..."` added to both textareas (identical text for both panels)
- Empty panels at startup: do NOT call `compare()` — just call `showEditView()`
- No empty-panel warning when user clicks diff with empty inputs — allow it

### Initialization Details
- Remove the auto-load block (lines 839-845 in app.js) that sets `originalInput.value` / `modifiedInput.value` on startup
- `compare()` call at startup is removed — only `showEditView()` remains
- `fixtures/ubmk26-sample.js` script tag preserved in `index.html` (Sample button still works manually)

### the agent's Discretion
- Exact wording of placeholder if "Paste your text here..." needs minor grammatical variation

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `originalInput` and `modifiedInput` — textarea DOM elements referenced throughout app.js
- `#sampleButton` event listener at L792-803 — already handles manual load; remains intact
- `showEditView()` — already available, called after init; will still be called on startup

### Established Patterns
- Direct DOM manipulation via `element.value` and `element.placeholder`
- ES6+ `const`/`let`, 2-space indentation
- HTML `id` attributes: camelCase matching JS variable names

### Integration Points
- `app.js` L839-846: startup block — remove value assignment, remove `compare()` call
- `index.html`: add `placeholder` attribute to both textarea elements
- `index.html` L77: `<script src="fixtures/ubmk26-sample.js">` stays

</code_context>

<specifics>
## Specific Ideas

- Placeholder text: `"Paste your text here..."` (same for both panels)
- Do not add any extra visual state or empty-panel messaging beyond the placeholder

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
