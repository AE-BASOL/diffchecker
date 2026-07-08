# Project Structure

The project is a lightweight, dependency-free static web application.

## Root Directory

- **`index.html`**: The main entry point. Defines the layout, toolbar, editor grid, and comparison view shell.
- **`app.js`**: The core logic of the application. Contains the diffing algorithm (LCS), text normalization, UI state management, and direct DOM manipulation/rendering functions.
- **`styles.css`**: The stylesheet defining the appearance of the app, including editor panes, side-by-side diff views, and popovers.
- **`README.md`**: Project documentation, features, and research notes.
- **`package.json`**: Contains simple metadata and a test script runner (e.g., `node tests/lineDiff.test.js`). No external production dependencies are defined.

## Directories

- **`fixtures/`**: Contains sample data and testing fixtures. Used to populate the app with mock inputs (e.g., `ubmk26-sample.js`) and raw text files (`original_latex_ubmk26.txt`, etc.).
- **`tests/`**: Contains test files (e.g., `lineDiff.test.js`) to verify the correctness of the diffing algorithms in a Node.js environment.
- **`.planning/`**: Contains project documentation and analysis related to architecture and structure.
