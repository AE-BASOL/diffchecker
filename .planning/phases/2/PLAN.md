# Phase 2 Plan: Diff View Aesthetics & Alignment

## Objective
Enhance the visual design of the diff output to match the premium dark mode aesthetic while maintaining excellent readability.

## Steps
1. **Restyle Added/Removed/Changed Rows**:
   - The CSS variables for dark mode were defined in Phase 1, but we need to ensure their application (`--delete-bg`, `--insert-bg`, etc.) looks good in the actual diff grid.
   - We will refine the `.aligned-cell.empty` background.
2. **Enhance Inline Word Highlighting**:
   - Update `.mark` classes (`.mark.insert`, `.mark.delete`, `.mark.change`) which are used for inline changes.
   - Ensure the colors provide good contrast against the new dark mode row backgrounds.
3. **Alignment UI Polish**:
   - Clean up borders (`border: 1px solid var(--line)`) across `.aligned-diff-header`, `.aligned-row`, and `.diff-row`.
   - Ensure line numbers (`.aligned-no`, `.line-no`) look faded and sleek.
