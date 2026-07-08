---
status: resolved
trigger: "undo redo ile bu markerlar iyi çalışmıyor redo alınca 3 tanesi aynı anda gitti redo yapınca markerlar gelmedi"
---

# Debug Session: undo-redo-markers

## Resolution
**Root Cause**: When navigating undo/redo history, the state restoration functions `undoHistory` and `redoHistory` were completely wiping out the `mergedLinesLeft` and `mergedLinesRight` Sets, meaning the application lost track of which lines were merged the moment you stepped backward or forward in time.
**Fix**: Modified `captureHistory` to save a deep copy of the `mergedLinesLeft` and `mergedLinesRight` Sets into the history snapshot. Then, updated `undoHistory` and `redoHistory` to seamlessly restore these Sets from the snapshot, ensuring the markers perfectly sync with the historical state of the text.

## Symptoms
- **Expected behavior**: Undo and redo should restore the merge indicators (badges) precisely as they were in that historical state.
- **Actual behavior**: When performing an undo or redo, the `mergedLinesLeft` and `mergedLinesRight` sets were completely cleared in `undoHistory` and `redoHistory` functions. Thus, navigating history destroys all badge markers.
- **Error messages**: None.
- **Timeline**: Since Phase 7.
- **Reproduction**: Merge some lines. Hit undo. The merged text reverts, but all other merge markers also disappear. Hit redo. The markers do not come back.

## Current Focus
**hypothesis**: The history engine does not capture `mergedLinesLeft` and `mergedLinesRight` in its state snapshots.
**next_action**: include Sets in history state objects and restore them during undo/redo/reset.

## Evidence
(Empty)

## Eliminated
(Empty)
