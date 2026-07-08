---
status: resolved
trigger: "ok yönleri yanlış oldu"
---

# Debug Session: arrow-directions-wrong

## Resolution
**Root Cause**: When the badges were moved from the inner border to the outer border, the arrows still pointed outwards away from the text they were annotating, making them counter-intuitive.
**Fix**: Flipped the arrows in `content` so they point inwards towards the text block. `⟵ Modified` became `Modified ⟶`, and `Original ⟶` became `⟵ Original`.

## Symptoms
- **Expected behavior**: Directional arrows on the merge badges should point *towards* the text they are annotating.
- **Actual behavior**: Arrows point *away* from the text. The left badge points left (`⟵ Modified`) into the margin, and the right badge points right (`Original ⟶`) into the margin.
- **Error messages**: None.
- **Timeline**: Introduced in Phase 7 when pushing the badges outside the cell borders.
- **Reproduction**: Merge left or right and observe the arrow direction in the badge on the outer edge of the panels.

## Current Focus
**hypothesis**: The text content for the `::after` pseudo-elements in CSS has arrows pointing outward relative to the cell's bounding box.
**next_action**: update the arrow directions in styles.css so they point inward.

## Evidence
(Empty)

## Eliminated
(Empty)
