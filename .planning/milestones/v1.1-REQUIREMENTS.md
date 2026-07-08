# Requirements — v1.1 History & UX Polish

## Category: History (Undo/Redo)

- [ ] **HIST-01**: User can press Ctrl+Z to undo the last text change (global single stack covering both panels)
- [ ] **HIST-02**: User can press Ctrl+Y (or Ctrl+Shift+Z) to redo a previously undone change
- [ ] **HIST-03**: Undo/redo history is cleared when the user triggers a diff reset or "Clear All" action

## Category: Empty Startup

- [ ] **STRT-01**: When the app opens, both panels are empty — no sample text is auto-loaded
- [ ] **STRT-02**: Each panel displays a meaningful placeholder hint ("Paste your text here...") when empty
- [ ] **STRT-03**: Any "Load Sample" button/action is either removed or retained only as a manual trigger (no auto-invocation on load)

## Future Requirements (Deferred)

- Per-panel independent undo/redo stacks — deferred; global stack chosen for simplicity in v1.1
- Persistent session history across page reloads — out of scope for this milestone

## Out of Scope

- Framework-based state management (Redux, MobX, etc.) — violates NO Frameworks constraint
- Server-side history storage — violates LOCAL & OFFLINE constraint

## Traceability

| REQ-ID  | Phase |
|---------|-------|
| HIST-01 | 6     |
| HIST-02 | 6     |
| HIST-03 | 6     |
| STRT-01 | 5     |
| STRT-02 | 5     |
| STRT-03 | 5     |
