# Project Context: Diffchecker (Smooth & Fast Local Edition)

## Objective
Enhance the existing dependency-free diffchecker web app to be incredibly smooth, fast, and local. The goal is to retain the pure Vanilla HTML/CSS/JS architecture while significantly upgrading the UI/UX with modern design aesthetics, dark mode, smooth micro-animations, and performance optimizations.

## Scope
- Retain existing `app.js`, `index.html`, `styles.css` core.
- Apply modern, rich aesthetics (dark mode by default, glassmorphism hints, harmonious color palettes).
- Optimize diffing algorithm execution if needed to prevent UI blocking (ensure speed).
- Improve the visual alignment of side-by-side diffs (incorporating recent LaTeX/mixed block fixes).

## Constraints
- **NO Frameworks**: Do not introduce React, Vue, Vite, or npm build steps for the client.
- **Local & Offline**: Must remain entirely client-side, running instantly via `file://` or a basic static server.
- **Dependency-Free**: Continue to avoid external libraries unless strictly vendor-copied without a build process.
