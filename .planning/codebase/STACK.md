# Tech Stack

The `diffchecker` project is built entirely as a static, client-side web application. It explicitly avoids external dependencies to remain portable and instantly usable.

## Languages
- **HTML5**: Used for structuring the application layout and UI components.
- **CSS3**: Used for styling the application, utilizing modern features like Flexbox, Grid, and CSS Variables.
- **JavaScript (ES6+)**: Used for the application logic, custom diffing algorithms, event handling, and DOM manipulation. 

## Frameworks & Libraries
- **None**: This is a dependency-free vanilla project. There are no client-side frameworks (e.g., React, Vue, Angular) and no external libraries (e.g., jsdiff, jQuery) in use.
- The repository evaluated open-source alternatives (like `kpdecker/jsdiff`, `google/diff-match-patch`, and `praneshr/react-diff-viewer`) but explicitly chose to implement custom diffing logic (Longest Common Subsequence matrix, token diffing) within the codebase to avoid bloat.

## Testing
- **Node.js**: Required to run the test suite locally.
- **Built-in Node Modules**: The testing strategy utilizes built-in modules (`node:assert/strict`, `node:fs`, `node:path`, `node:vm`) to simulate a browser environment and assert the logic of `app.js`. No external testing libraries like Jest or Mocha are used.

## Tooling
- **npm / package.json**: Used exclusively for declaring the `npm run test` script. No `dependencies` or `devDependencies` are listed.
