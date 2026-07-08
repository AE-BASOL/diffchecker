# Roadmap

## [x] Phase 1: UI/UX Foundation & Dark Mode
**Objective**: Transform the visual design of the app without changing the core diff logic.
- Update `styles.css` with CSS variables for a modern dark/light theme palette.
- Integrate modern typography and refine the layout.
- Add micro-animations and smooth transitions.

## [x] Phase 2: Diff View Aesthetics & Alignment
**Objective**: Make the diff output look premium and easy to read.
- Restyle the added/removed/changed lines with premium color coding.
- Enhance inline word highlighting.
- Ensure side-by-side alignment visually matches the new design language.

## [x] Phase 3: Performance Optimization (Smoothness)
**Objective**: Ensure the app handles large text files effortlessly.
- Audit performance of the synchronous LCS algorithm.
- Implement Web Workers or time-slicing for the diff computation if it blocks the UI.
- Optimize DOM insertion for large sets of rows.

## [x] Phase 4: UI Simplification & White Theme
**Objective**: Strip down the overly complex UI and return to a highly readable, understandable white theme.
- Remove dark mode styles entirely.
- Remove the "Edit text" toggle flow to simplify the UX.
- Ensure the diff view is simple and clean without unnecessary visual noise.
