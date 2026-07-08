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

## Current Milestone: v1.1 — History & UX Polish

**Goal:** Add undo/redo support for panel edits and remove auto-loaded sample text so the app starts with empty panels.

**Target features:**
- Undo/redo for left and right panel text changes (Ctrl+Z / Ctrl+Y + toolbar buttons)
- Empty startup — panels are blank when the app opens, no sample text loaded by default

## Active Requirements
- See REQUIREMENTS.md for v1.1 scoped requirements

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-08 — Milestone v1.1 started*
