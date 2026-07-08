# Codebase Concerns & Technical Debt

## Architecture & Maintainability
- **Monolithic file structure:** The entire application logic is contained within a single `app.js` file (~850 lines). It mixes diff calculation algorithms (LCS), UI state management, and DOM manipulation/rendering. There is no separation of concerns (e.g., MVC or component-based structure).
- **Lack of modularity:** The project does not use ES Modules (`import`/`export`), making it difficult to test individual functions or split the code into smaller, more manageable pieces.
- **No documentation/comments:** The `app.js` file contains zero comments explaining the complex diff algorithms (like `lineDiff`, `lcsMatrix`, `tokenDiff`) or UI interaction logic. This significantly increases the cognitive load for future maintainers.

## Testing & Quality Assurance
- **Hacky testing framework:** There is no standard testing framework (like Jest, Mocha, or Vitest). Instead, tests are run using a custom Node.js script (`tests/lineDiff.test.js`) that uses `node:vm` to run the browser-targeted `app.js` in a mocked sandbox environment. This is fragile and error-prone.
- **Lack of static analysis:** The project does not use ESLint for code quality or Prettier for consistent formatting. There is also no type checking (TypeScript), which increases the risk of runtime errors.

## Performance Risks
- **Synchronous Diff Calculation:** The LCS diff algorithm runs synchronously on the main thread. For very large text files or complex diffs, this could lead to the browser UI freezing or becoming unresponsive. Implementing a Web Worker for background processing would mitigate this risk.
- **DOM Rendering:** The app uses `innerHTML` heavily for rendering rows and highlights. For very large diffs, appending hundreds or thousands of elements to the DOM synchronously might cause performance bottlenecks.

## Missing Dependencies & Build Process
- As stated in the README, the project intentionally avoids dependencies. While this makes it portable, it results in the lack of a proper build step (no minification, no bundling, no SCSS compilation, no asset optimization). 

## Feature Polish
- **Browser Compatibility:** While CSS grid and standard ES6+ JavaScript are used, there are no polyfills or transpilation (Babel) setups, which might lead to issues in older browsers.
