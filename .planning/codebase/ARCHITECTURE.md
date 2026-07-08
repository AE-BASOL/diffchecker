# Architecture

Diffchecker is a dependency-free, vanilla JavaScript Single Page Application (SPA) for comparing text and visualizing differences.

## High-Level Design

The application is built completely with standard web technologies (HTML, CSS, JavaScript) without relying on any external frameworks (like React or Vue) or third-party diffing libraries.

- **Vanilla UI**: Uses native DOM APIs for query selection, event listening, and dynamic rendering.
- **Client-Side Compute**: All text parsing and diffing algorithms run in the browser's JavaScript engine.
- **Dual Views**: Supports an "edit view" for inputting text and a "diff view" for side-by-side comparison, alongside unified patch generation.

## Data Flow

1. **Input Generation**: The user enters text into the original and modified text areas (or loads a sample fixture).
2. **Text Normalization**: Depending on user settings (ignore whitespace, ignore case), the text is normalized (`normalize`, `normalizeLineAnchor`) before comparison.
3. **Line Comparison**: The text is split into lines and processed through a Longest Common Subsequence (LCS) matrix (`lcsMatrix`) to compute a line-by-line diff (`lineDiff`).
4. **Block Heuristics**: The results are categorized into `equal`, `insert`, `delete`, and `change` objects. A custom process matches moved blocks and pairings (`pairDeleteInsertRows`, `pairMovedBlocks`).
5. **Token Comparison**: For lines categorized as `change`, a secondary token-level diff (`tokenDiff`) is executed to highlight intra-line differences.
6. **Rendering**: The structured list of differences (`currentRows`) is mapped into HTML templates strings (e.g., `renderRows`, `renderAlignedDiff`) and injected into the DOM.
7. **Interactive Merging**: The user can interact with the rendered diffs to merge changes left/right or delete lines. These actions mutate the underlying input text and trigger a re-computation of the diff.

## Key Patterns

- **Algorithm**: The core uses dynamic programming (LCS Matrix) for identifying similarities. Heuristics are heavily utilized to provide human-readable diffs (handling inserts/deletes vs. changes and detecting moved blocks via similarity scoring).
- **State Management**: State is kept minimal and primarily stored in a few module-scoped variables (`currentRows`, `viewMode`, `manualEditorHeight`, `currentPopover`) or directly derived from the DOM input elements (`originalInput.value`, `modifiedInput.value`).
- **Render Paradigm**: Render functions are idempotent-like templates that consume arrays of diff rows and output raw HTML strings, which are then assigned to `innerHTML`.
- **Event Delegation**: Extensive use of event delegation is used to handle clicks and interactions within dynamic components like the aligned diff view and popovers.
