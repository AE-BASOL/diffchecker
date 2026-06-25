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
  const sandbox = {
    console,
    document,
    navigator: { clipboard: { writeText: async () => {} } },
    window: { addEventListener: () => {}, removeEventListener: () => {} },
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(`${source}\nglobalThis.__api = { lineDiff, splitLines };`, sandbox, {
    filename: "app.js"
  });
  return sandbox.__api;
}

const { lineDiff, splitLines } = loadApp();

function rowsFor(left, right) {
  return lineDiff(splitLines(left), splitLines(right));
}

function rowTypes(rows) {
  return Array.from(rows, (row) => row.type);
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

console.log("lineDiff alignment tests passed");
