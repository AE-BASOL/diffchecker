# Diffchecker

A small, dependency-free text comparison web app inspired by the original/modified workflow of Diffchecker.

## Features

- Original and modified editors
- Side-by-side line diff
- Inline word highlighting for changed lines
- Added, deleted, changed, and unchanged counts
- Ignore whitespace and ignore case options
- Show only changed rows
- Unified diff output with copy action

## Run

Open `index.html` in a browser.

## GitHub Pages

This is a static site. Point GitHub Pages at the repository root to publish it.

## Research Notes

Existing open-source options worth tracking:

- `kpdecker/jsdiff`: mature JavaScript text diff library
- `google/diff-match-patch`: classic high-performance text diff/match/patch library
- `praneshr/react-diff-viewer`: React component for side-by-side diff rendering

This repository currently avoids dependencies so the app remains portable and instantly usable.
