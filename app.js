const originalInput = document.querySelector("#originalInput");
const modifiedInput = document.querySelector("#modifiedInput");
const diffTable = document.querySelector("#diffTable");
const stats = document.querySelector("#stats");
const patchOutput = document.querySelector("#patchOutput");
const ignoreWhitespace = document.querySelector("#ignoreWhitespace");
const ignoreCase = document.querySelector("#ignoreCase");
const showOnlyChanges = document.querySelector("#showOnlyChanges");

const sampleOriginal = `Invoice #4102
Customer: Atlas Market
Status: Pending

Items:
- Coffee beans, 12 bags
- Paper cups, 400 units
- Oat milk, 24 cartons

Delivery window: Friday 09:00-12:00
Notes: Call warehouse before arrival.`;

const sampleModified = `Invoice #4102
Customer: Atlas Market
Status: Approved

Items:
- Coffee beans, 14 bags
- Paper cups, 400 units
- Oat milk, 24 cartons
- Compostable lids, 400 units

Delivery window: Friday 10:00-13:00
Notes: Call warehouse gate before arrival.`;

function normalize(value) {
  let next = value;
  if (ignoreWhitespace.checked) next = next.trim().replace(/\s+/g, " ");
  if (ignoreCase.checked) next = next.toLowerCase();
  return next;
}

function splitLines(value) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function lcsMatrix(left, right, equals) {
  const matrix = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      matrix[i][j] = equals(left[i], right[j])
        ? matrix[i + 1][j + 1] + 1
        : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }
  return matrix;
}

function lineDiff(leftLines, rightLines) {
  const matrix = lcsMatrix(leftLines, rightLines, (a, b) => normalize(a) === normalize(b));
  const rows = [];
  let i = 0;
  let j = 0;

  while (i < leftLines.length || j < rightLines.length) {
    if (i < leftLines.length && j < rightLines.length && normalize(leftLines[i]) === normalize(rightLines[j])) {
      rows.push({ type: "equal", left: leftLines[i], right: rightLines[j], leftNo: i + 1, rightNo: j + 1 });
      i += 1;
      j += 1;
    } else if (i < leftLines.length && j < rightLines.length && matrix[i + 1][j] === matrix[i][j + 1]) {
      rows.push({ type: "change", left: leftLines[i], right: rightLines[j], leftNo: i + 1, rightNo: j + 1 });
      i += 1;
      j += 1;
    } else if (j < rightLines.length && (i === leftLines.length || matrix[i][j + 1] >= matrix[i + 1][j])) {
      rows.push({ type: "insert", left: "", right: rightLines[j], leftNo: "", rightNo: j + 1 });
      j += 1;
    } else {
      rows.push({ type: "delete", left: leftLines[i], right: "", leftNo: i + 1, rightNo: "" });
      i += 1;
    }
  }

  return pairDeleteInsertRows(rows);
}

function pairDeleteInsertRows(rows) {
  const paired = [];
  for (let index = 0; index < rows.length; index += 1) {
    const current = rows[index];
    const next = rows[index + 1];
    if (current?.type === "delete" && next?.type === "insert") {
      paired.push({
        type: "change",
        left: current.left,
        right: next.right,
        leftNo: current.leftNo,
        rightNo: next.rightNo
      });
      index += 1;
    } else {
      paired.push(current);
    }
  }
  return paired;
}

function tokenDiff(left, right) {
  const leftTokens = left.match(/\s+|[^\s]+/g) || [];
  const rightTokens = right.match(/\s+|[^\s]+/g) || [];
  const matrix = lcsMatrix(leftTokens, rightTokens, (a, b) => normalize(a) === normalize(b));
  const leftParts = [];
  const rightParts = [];
  let i = 0;
  let j = 0;

  while (i < leftTokens.length || j < rightTokens.length) {
    if (i < leftTokens.length && j < rightTokens.length && normalize(leftTokens[i]) === normalize(rightTokens[j])) {
      leftParts.push({ text: leftTokens[i], type: "equal" });
      rightParts.push({ text: rightTokens[j], type: "equal" });
      i += 1;
      j += 1;
    } else if (j < rightTokens.length && (i === leftTokens.length || matrix[i][j + 1] >= matrix[i + 1][j])) {
      rightParts.push({ text: rightTokens[j], type: "insert" });
      j += 1;
    } else {
      leftParts.push({ text: leftTokens[i], type: "delete" });
      i += 1;
    }
  }

  return { leftParts, rightParts };
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderParts(parts) {
  return parts.map((part) => {
    const text = escapeHtml(part.text);
    return part.type === "equal" ? text : `<span class="mark ${part.type}">${text}</span>`;
  }).join("");
}

function renderCell(lineNo, text, type, side) {
  const empty = lineNo === "" ? " empty" : "";
  let content = escapeHtml(text);
  if (type === "change") {
    const parts = side === "left" ? tokenDiff(text, "").leftParts : tokenDiff("", text).rightParts;
    content = renderParts(parts);
  }
  return `<div class="diff-cell ${type}${empty}">
    <div class="line-no">${lineNo}</div>
    <div class="line-text">${content || "&nbsp;"}</div>
  </div>`;
}

function renderChangeRow(row) {
  const parts = tokenDiff(row.left, row.right);
  return `<div class="diff-row">
    <div class="diff-cell change">
      <div class="line-no">${row.leftNo}</div>
      <div class="line-text">${renderParts(parts.leftParts) || "&nbsp;"}</div>
    </div>
    <div class="diff-cell change">
      <div class="line-no">${row.rightNo}</div>
      <div class="line-text">${renderParts(parts.rightParts) || "&nbsp;"}</div>
    </div>
  </div>`;
}

function renderRows(rows) {
  const visibleRows = showOnlyChanges.checked ? rows.filter((row) => row.type !== "equal") : rows;
  if (!visibleRows.length) {
    diffTable.innerHTML = `<div class="empty-state">No differences found.</div>`;
    return;
  }

  diffTable.innerHTML = visibleRows.map((row) => {
    if (row.type === "change") return renderChangeRow(row);
    return `<div class="diff-row">
      ${renderCell(row.leftNo, row.left, row.type === "delete" ? "delete" : "equal", "left")}
      ${renderCell(row.rightNo, row.right, row.type === "insert" ? "insert" : "equal", "right")}
    </div>`;
  }).join("");
}

function createPatch(rows) {
  const lines = ["--- original", "+++ modified"];
  rows.forEach((row) => {
    if (row.type === "equal") {
      lines.push(` ${row.left}`);
    } else if (row.type === "delete") {
      lines.push(`-${row.left}`);
    } else if (row.type === "insert") {
      lines.push(`+${row.right}`);
    } else {
      lines.push(`-${row.left}`);
      lines.push(`+${row.right}`);
    }
  });
  return lines.join("\n");
}

function compare() {
  const rows = lineDiff(splitLines(originalInput.value), splitLines(modifiedInput.value));
  const counts = rows.reduce((acc, row) => {
    acc[row.type] += 1;
    return acc;
  }, { equal: 0, insert: 0, delete: 0, change: 0 });

  renderRows(rows);
  patchOutput.textContent = createPatch(rows);
  stats.textContent = `${counts.insert} added, ${counts.delete} deleted, ${counts.change} changed, ${counts.equal} unchanged`;
}

document.querySelector("#compareButton").addEventListener("click", compare);
document.querySelector("#sampleButton").addEventListener("click", () => {
  originalInput.value = sampleOriginal;
  modifiedInput.value = sampleModified;
  compare();
});
document.querySelector("#swapButton").addEventListener("click", () => {
  [originalInput.value, modifiedInput.value] = [modifiedInput.value, originalInput.value];
  compare();
});
document.querySelector("#clearButton").addEventListener("click", () => {
  originalInput.value = "";
  modifiedInput.value = "";
  compare();
  originalInput.focus();
});
document.querySelector("#copyPatchButton").addEventListener("click", async () => {
  await navigator.clipboard.writeText(patchOutput.textContent);
});

[ignoreWhitespace, ignoreCase, showOnlyChanges].forEach((input) => input.addEventListener("change", compare));
[originalInput, modifiedInput].forEach((input) => input.addEventListener("input", compare));

originalInput.value = sampleOriginal;
modifiedInput.value = sampleModified;
compare();
