# Codebase Conventions

This document outlines the coding standards, naming conventions, and style rules observed in the Diffchecker project.

## Architecture and Stack
* **Dependency-Free**: The project intentionally avoids third-party dependencies, bundlers (like Webpack or Vite), or transpilers (like Babel) to remain highly portable and instantly usable.
* **Vanilla Web Technologies**: Built using plain HTML, CSS (no preprocessors like SASS), and JavaScript (ES6+).
* **Single File Logic**: Most of the application logic and state management resides in a single `app.js` file.
* **State Management**: Application state is managed via closures and direct DOM manipulation rather than reactive frameworks (no React/Vue).

## Coding Standards
* **JavaScript**:
  * Use ES6+ syntax (e.g., `const`, `let`, arrow functions).
  * 2-space indentation.
  * Direct DOM manipulation via `document.querySelector` and element properties (e.g., `element.hidden = true`).
  * Strict equality (`===`) is used consistently.
* **CSS**:
  * 2-space indentation.
  * Extensively uses CSS Variables (Custom Properties) defined on `:root` for theming (e.g., `--paper`, `--ink`, `--accent`).
  * Class names are generally descriptive and use kebab-case (e.g., `app-shell`, `section-title`).
* **Linting and Formatting**:
  * There are no automated formatters (like Prettier) or linters (like ESLint) explicitly configured in the repository (no configuration files present). 
  * Formatting is maintained manually following the 2-space indentation rule.

## Naming Conventions
* **Variables & Functions**: CamelCase for JavaScript variables and functions (e.g., `lineDiff`, `originalInput`, `splitLines`).
* **HTML IDs**: CamelCase is frequently used for element IDs in HTML to correspond directly with JavaScript variables (e.g., `id="originalInput"`).
* **Constants**: Block-scoped constants generally use camelCase rather than PascalCase or UPPER_SNAKE_CASE.
