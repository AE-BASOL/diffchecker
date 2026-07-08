---
status: resolved
trigger: "redo yapıyorum merge yaptığım şey geri gelmiyor"
---

# Debug Session: merge-redo-bug

## Resolution
**Root Cause**: Programmatic text modifications from `mergeRow`, `mergeAll`, and `deleteLine` updated `originalInput.value` and `modifiedInput.value` directly but bypassed the `captureHistory()` function. As a result, the history stack remained unaware of these changes, and the redo stack was never cleared after a merge.
**Fix**: Injected `captureHistory()` immediately after the `value` modifications within `mergeRow`, `mergeAll`, and `deleteLine` functions in `app.js`.

## Symptoms
- **Expected behavior**: Merge actions should be recorded in the undo/redo history, and performing a new action like merge should clear the redo stack. Redo should correctly restore a state if applicable.
- **Actual behavior**: Merge actions (Merge left/right, mergeRow, deleteLine) bypass the `captureHistory()` logic, meaning they don't get added to the undo stack, and they don't clear the redo stack. Thus, doing a redo after a merge might overwrite the merge with an old redo state, or undoing doesn't undo the merge.
- **Error messages**: None.
- **Timeline**: Since Phase 6 Undo/Redo Engine was implemented.
- **Reproduction**: Type some text. Undo it. Click a merge button. Hit redo. The text will revert to the redo stack's state, overwriting the merge.

## Current Focus
**hypothesis**: None yet.
**next_action**: gather initial evidence

## Evidence
(Empty)

## Eliminated
(Empty)
