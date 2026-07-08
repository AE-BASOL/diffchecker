# Phase 5: Empty Startup — Plan

**Phase:** 5
**Goal:** Remove auto-load of sample text; ensure panels start empty; verify placeholder hints are in place.
**Status:** Ready

---

## Plan A: Remove Startup Sample Auto-Load

**File:** `app.js`
**Change:** Delete lines 839–845 (the `if (Object.keys(window.ubmk26Sample...)` block that sets `originalInput.value` and `modifiedInput.value` on startup) and line 846 (`compare()`). Only `showEditView()` should remain as the startup call.

**Rationale:** The auto-load block unconditionally sets panel content at startup, preventing empty start. Removing it leaves panels at their default empty state. The sampleButton listener (L792-803) is preserved — manual trigger still works.

### Steps:
1. In `app.js`, remove the startup auto-load block (lines 839-845) and `compare()` call (line 846)
2. Verify `showEditView()` remains as the only startup call
3. Verify `index.html` placeholders: already set (`"Paste original text here"` / `"Paste changed text here"`) — no change needed
4. Verify `fixtures/ubmk26-sample.js` script tag preserved in `index.html` — no change needed

### Verification:
- [ ] **STRT-01**: Page loads with empty textareas (no text pre-filled)
- [ ] **STRT-02**: Both textareas display placeholder text when empty
- [ ] **STRT-03**: Sample button still works when clicked manually
- [ ] No JS errors on page load
- [ ] `compare()` is NOT auto-called on startup
