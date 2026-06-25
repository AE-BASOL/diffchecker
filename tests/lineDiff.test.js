const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function makeClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    toggle: (name, force) => {
      if (force === undefined ? !values.has(name) : force) values.add(name);
      else values.delete(name);
    },
    contains: (name) => values.has(name)
  };
}

function makeElement(id) {
  return {
    id,
    value: "",
    checked: false,
    dataset: {},
    style: {},
    classList: makeClassList(),
    textContent: "",
    innerHTML: "",
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 560,
    clientHeight: 560,
    offsetHeight: 560,
    offsetWidth: 700,
    selectionStart: 0,
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    contains: () => false,
    focus: () => {},
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({
      top: 0,
      left: 0,
      right: 700,
      bottom: 560,
      width: 700,
      height: 560
    })
  };
}

function loadApp() {
  const elements = new Map();
  const document = {
    documentElement: {
      style: {
        setProperty: () => {}
      }
    },
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, makeElement(selector.replace(/^#/, "")));
      return elements.get(selector);
    },
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const sample = {
    original: fs.readFileSync(path.join(__dirname, "..", "fixtures", "original_latex_ubmk26.txt"), "utf8"),
    modified: fs.readFileSync(path.join(__dirname, "..", "fixtures", "modified_latex_ubmk26.txt"), "utf8")
  };
  const sandbox = {
    console,
    document,
    navigator: { clipboard: { writeText: async () => {} } },
    window: { addEventListener: () => {}, removeEventListener: () => {}, ubmk26Sample: sample },
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(`${source}
globalThis.__api = {
  lineDiff,
  splitLines,
  getViewMode: () => viewMode,
  getRows: () => currentRows,
  getElement: (selector) => document.querySelector(selector)
};`, sandbox, {
    filename: "app.js"
  });
  return sandbox.__api;
}

const app = loadApp();
const { lineDiff, splitLines } = app;

function rowsFor(left, right) {
  return lineDiff(splitLines(left), splitLines(right));
}

function rowTypes(rows) {
  return Array.from(rows, (row) => row.type);
}

function fixture(name) {
  return fs.readFileSync(path.join(__dirname, "..", "fixtures", name), "utf8");
}

function findRowWithBoth(rows, text) {
  return rows.find((row) => row.left.includes(text) && row.right.includes(text));
}

function largestBlankRun(rows, blankSide) {
  const isBlankRunRow = blankSide === "left"
    ? (row) => row.leftNo === "" && row.rightNo !== ""
    : (row) => row.rightNo === "" && row.leftNo !== "";
  return rows.reduce((state, row, index) => {
    if (isBlankRunRow(row)) {
      if (state.currentStart === -1) state.currentStart = index;
      state.current += 1;
    } else {
      if (state.current > state.max) {
        state.max = state.current;
        state.start = state.currentStart;
      }
      state.current = 0;
      state.currentStart = -1;
    }
    return state;
  }, { current: 0, currentStart: -1, max: 0, start: -1 });
}

{
  assert.equal(app.getViewMode(), "diff", "the app should open directly in side-by-side diff view");
  assert.equal(app.getElement("#editorGrid").hidden, true, "editor textareas should be hidden on startup");
  assert.equal(app.getElement("#alignedDiffShell").hidden, false, "aligned diff should be visible on startup");
  assert.ok(app.getElement("#originalInput").value.includes("\\documentclass[conference,a4paper]{IEEEtran}"));
  assert.ok(app.getElement("#modifiedInput").value.includes("UBMK 2026"));
  assert.ok(app.getElement("#alignedDiff").innerHTML.includes("aligned-row"), "startup diff should render line rows");
  assert.ok(app.getRows().length > 600, "startup UBMK fixture should produce full-document line rows");
}

{
  const rows = rowsFor(
    [
      "same heading",
      "old paragraph one",
      "old paragraph two",
      "old paragraph three",
      "same footer"
    ].join("\n"),
    [
      "same heading",
      "new paragraph one",
      "new paragraph two",
      "new paragraph three",
      "same footer"
    ].join("\n")
  );

  assert.deepEqual(
    rowTypes(rows),
    ["equal", "change", "change", "change", "equal"],
    "mixed delete/insert blocks must stay paired row by row"
  );
  assert.equal(rows[1].left, "old paragraph one");
  assert.equal(rows[1].right, "new paragraph one");
  assert.equal(rows[2].left, "old paragraph two");
  assert.equal(rows[2].right, "new paragraph two");
  assert.equal(rows[3].left, "old paragraph three");
  assert.equal(rows[3].right, "new paragraph three");
}

{
  const rows = rowsFor(
    ["anchor", "old only one", "old only two", "tail"].join("\n"),
    ["anchor", "new one", "new two", "new three", "tail"].join("\n")
  );

  assert.deepEqual(
    rowTypes(rows),
    ["equal", "change", "change", "insert", "equal"],
    "extra modified lines should remain directly after paired changed lines"
  );
  assert.equal(rows[1].left, "old only one");
  assert.equal(rows[1].right, "new one");
  assert.equal(rows[2].left, "old only two");
  assert.equal(rows[2].right, "new two");
  assert.equal(rows[3].left, "");
  assert.equal(rows[3].right, "new three");
}

{
  const oldLines = Array.from({ length: 300 }, (_, index) => `old block line ${index + 1}`);
  const newLines = Array.from({ length: 300 }, (_, index) => `new block line ${index + 1}`);
  const rows = rowsFor(
    ["before", ...oldLines, "after"].join("\n"),
    ["before", ...newLines, "after"].join("\n")
  );

  assert.equal(rows.length, 302, "large mixed blocks should not create separated left/right stacks");
  assert.equal(rows[0].type, "equal");
  assert.equal(rows[301].type, "equal");
  assert.ok(rows.slice(1, 301).every((row) => row.type === "change"));
  assert.equal(rows[1].left, "old block line 1");
  assert.equal(rows[1].right, "new block line 1");
  assert.equal(rows[300].left, "old block line 300");
  assert.equal(rows[300].right, "new block line 300");
}

{
  const rows = rowsFor(
    ["start", "removed a", "removed b", "end"].join("\n"),
    ["start", "end"].join("\n")
  );

  assert.deepEqual(
    rowTypes(rows),
    ["equal", "delete", "delete", "equal"],
    "pure deletions should not be converted into fake changed rows"
  );
}

{
  const rows = rowsFor(
    fixture("original_latex_ubmk26.txt"),
    fixture("modified_latex_ubmk26.txt")
  );

  [
    "\\documentclass[conference,a4paper]{IEEEtran}",
    "\\section{Results}\\label{sec:results}",
    "\\section{Discussion}\\label{sec:discussion}",
    "\\section{Conclusion}\\label{sec:conclusion}",
    "\\bibliographystyle{IEEEtran}",
    "\\end{document}"
  ].forEach((anchor) => {
    const row = findRowWithBoth(rows, anchor);
    assert.ok(row, `fixture anchor must align side by side: ${anchor}`);
    assert.notEqual(row.leftNo, "", `fixture anchor left side must not be blank: ${anchor}`);
    assert.notEqual(row.rightNo, "", `fixture anchor right side must not be blank: ${anchor}`);
  });

  const emptyLeftRun = largestBlankRun(rows, "left");
  const largestEmptyLeftRun = Math.max(emptyLeftRun.max, emptyLeftRun.current);
  const emptyRightRun = largestBlankRun(rows, "right");
  const largestEmptyRightRun = Math.max(emptyRightRun.max, emptyRightRun.current);
  const emptyLeftPreview = rows
    .slice(Math.max(0, emptyLeftRun.start - 3), emptyLeftRun.start + Math.min(largestEmptyLeftRun, 6))
    .map((row, index) => {
      const realIndex = Math.max(0, emptyLeftRun.start - 3) + index;
      return `#${realIndex} L${row.leftNo}:${row.left.slice(0, 45)} <> R${row.rightNo}:${row.right.slice(0, 45)}`;
    })
    .join(" | ");
  const movedIntroLeft = rows.findIndex((row) => row.left.includes("A fundamental tension exists"));
  const movedIntroRight = rows.findIndex((row) => row.right.includes("A fundamental tension exists"));
  const movedIntroPreview = [movedIntroLeft, movedIntroRight]
    .map((index) => {
      const row = rows[index];
      return `#${index} L${row?.leftNo}:${(row?.left || "").slice(0, 45)} <> R${row?.rightNo}:${(row?.right || "").slice(0, 45)}`;
    })
    .join(" / ");

  assert.ok(
    largestEmptyLeftRun < 30,
    `fixture should not render a huge modified-only stack; largest run was ${largestEmptyLeftRun} near row ${emptyLeftRun.start}: ${emptyLeftPreview}; moved intro: ${movedIntroPreview}`
  );
  assert.ok(
    largestEmptyRightRun < 30,
    `fixture should not render a huge original-only stack; largest run was ${largestEmptyRightRun} near row ${emptyRightRun.start}`
  );
}

console.log("lineDiff alignment tests passed");
