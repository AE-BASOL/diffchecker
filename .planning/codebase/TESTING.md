# Testing Strategy

This document outlines the testing strategy, frameworks, and instructions for verifying the Diffchecker project.

## Overview
Due to the dependency-free nature of the project, it avoids heavy third-party testing frameworks (like Jest, Mocha, or Cypress). Instead, it implements a custom testing approach using Node.js built-in modules.

## Testing Framework & Environment
* **Node.js Built-ins**: The project uses `node:assert/strict` for assertions and `node:fs`, `node:path` for file operations.
* **Virtual Machine (`node:vm`)**: Since the application is meant to run in a browser and heavily manipulates the DOM, the tests use the `node:vm` module to run `app.js` within a newly created context.
* **Mock DOM**: A mock DOM is manually constructed in the test file (see `makeElement` and the mocked `document` object in `tests/lineDiff.test.js`) to satisfy the environment requirements of `app.js` without requiring a headless browser or JSDOM.
* **Exposed API**: The test environment overrides the global context to expose internal variables and functions (e.g., `globalThis.__api`) for unit and integration testing.

## Fixtures
The testing heavily relies on pre-defined fixtures stored in the `fixtures/` directory:
* Text files representing original and modified states (e.g., `original_latex_ubmk26.txt`, `modified_latex_ubmk26.txt`).
* JS files containing mock objects (e.g., `ubmk26-sample.js`).
These fixtures are read synchronously via `fs.readFileSync` during test execution to populate the diff checker and validate its output.

## How to Run Tests
Tests are executed using the native Node.js runtime. 

To run the test suite, use the npm script:
```bash
npm test
```
Alternatively, run the test script directly using Node:
```bash
node tests/lineDiff.test.js
```

## Verification
* The tests execute synchronously and will exit with code 0 if all assertions pass.
* If any `assert.equal`, `assert.ok`, or `assert.deepEqual` check fails, an `AssertionError` is thrown, indicating a test failure and printing the stack trace to the console.
* **Manual Testing**: Given it's a frontend web app, visual verification by opening `index.html` in a web browser is also a primary mechanism for ensuring UI/UX correctness.
