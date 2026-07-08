# Phase 1 Plan: UI/UX Foundation & Dark Mode

## Objective
Update the visual aesthetic of the diffchecker to a premium, dark-mode first design with modern typography, glassmorphism, and smooth micro-animations.

## Steps
1. **Color Palette & CSS Variables**: 
   - Overhaul `:root` in `styles.css` to define a premium dark theme. 
   - Use deep background colors (e.g., `#0f1115` or `#18181b`) and refined accent colors.
2. **Typography**: 
   - Update `font-family` to `Inter` via Google Fonts in `index.html`.
3. **Layout & Glassmorphism**:
   - Update `.topbar` and `.toolbar` to use `backdrop-filter: blur(10px)` and semi-transparent backgrounds for a glassmorphism effect.
4. **Micro-animations**:
   - Add `transition` properties to buttons, diff rows, and inputs.
   - Improve hover states to be smooth and satisfying.
