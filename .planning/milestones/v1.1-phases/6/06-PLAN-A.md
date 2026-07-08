# Phase 6: Undo/Redo Engine — Plan

**Phase:** 6
**Goal:** Global Undo/Redo engine capturing both panels, mapped to Ctrl+Z and Ctrl+Y / Ctrl+Shift+Z, squashing fast sequential inputs.
**Status:** Ready

---

## Plan A: History State Management

**File:** `app.js`
**Change:** Add a history tracking system that keeps state of both inputs. Hook into the `input` events, the action buttons (Clear, Sample, Swap), and `keydown` for the keyboard shortcuts.

### Logic Design:

1. **State Variables**: 
   - `let undoStack = []; let redoStack = [];`
2. **`resetHistory()` function**:
   - Pushes the current `originalInput.value` and `modifiedInput.value` as the single base state into `undoStack`, clears `redoStack`.
   - Called at script initialization and inside the Clear, Sample, and Swap button handlers *after* they mutate the values.
3. **`captureHistory()` function**:
   - Clears `redoStack`.
   - Checks `Date.now()` vs top of `undoStack`. 
   - If `undoStack.length > 1` and time diff < 1000ms, it squashes (overwrites) the top element.
   - Else, pushes a new element to `undoStack`.
4. **`undo()` / `redo()` functions**:
   - `undo()`: pops `undoStack` (if length > 1) to `redoStack`. Takes the new top of `undoStack` and applies to textareas, then calls `compare()`.
   - `redo()`: pops `redoStack` (if not empty) to `undoStack`. Takes this state and applies to textareas, then calls `compare()`.
5. **Event Listeners**:
   - `keydown`: Intercept `Ctrl+Z`, `Ctrl+Shift+Z`, `Cmd+Z`, `Cmd+Shift+Z`, `Ctrl+Y`, `Cmd+Y`. Call `preventDefault()` and trigger `undo()` or `redo()`.
   - `input`: Modify existing `compare` listener to `() => { captureHistory(); compare(); }`.

### Verification:
- [ ] **HIST-01**: Ctrl+Z undoes recent typing across both textareas simultaneously.
- [ ] **HIST-02**: Ctrl+Y / Ctrl+Shift+Z redoes the change.
- [ ] **HIST-03**: Clicking Clear, Swap, or Sample resets the history stack so you can't undo into a prior document state.
