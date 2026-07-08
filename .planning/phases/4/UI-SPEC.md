# Phase 4 UI-SPEC: Simplification & White Theme

## Objective
Strip down the overly complex UI. Remove the dark mode (it's not needed), revert to a clean and highly readable white theme, and eliminate the confusing "Edit Text" toggle flow to make the user experience as straightforward as possible.

## Requirements

### 1. Color Palette (White Theme)
- **Background**: Pure white (`#ffffff`) or very light gray (`#f9f9f9`) for the main app shell.
- **Text**: Dark gray/black for high contrast and readability (`#333333`).
- **Diff Colors**: 
  - Insertions: Light green background with dark green text.
  - Deletions: Light red background with dark red text.
  - Changes: Light yellow/blue background.
- Remove all CSS variables related to the previous "premium dark mode".

### 2. Layout Simplification
- Remove the "Edit text" button (`#editButton`) and the rigid "Edit vs Compare" view mode toggle if it's causing confusion.
- **New Flow**:
  - The page displays the two input textareas (Original and Modified) by default.
  - When the user clicks "Compare", the diff view (`alignedDiffShell`) replaces the text areas or appears directly below them. 
  - To input new text, the user can just clear the diff or we provide a simple "New Comparison" or "Back" button instead of the ambiguous "Edit text".

### 3. Component Cleanups
- **Typography**: Keep it simple. Default system fonts or a clean sans-serif (Inter is fine, but no need for excessive styling).
- **Toolbars**: Simplify the top bar. Remove any unnecessary buttons. Keep only "Compare", "Clear", and "Swap".
- **Pop-ups**: Ensure the previously centered modal for diff acceptance matches the new clean white aesthetic (no heavy dark shadows, just a clean border).

## Verification
- [ ] Dark mode CSS variables are entirely removed.
- [ ] Background is white/light, text is dark.
- [ ] "Edit text" button is removed or repurposed into a clearer "Back / New Comparison" flow.
- [ ] The app feels significantly less complicated and more "understandable" at first glance.
