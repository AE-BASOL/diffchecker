const originalInput = document.querySelector("#originalInput");
const modifiedInput = document.querySelector("#modifiedInput");
const diffTable = document.querySelector("#diffTable");
const stats = document.querySelector("#stats");
const patchOutput = document.querySelector("#patchOutput");
const originalHighlights = document.querySelector("#originalHighlights");
const modifiedHighlights = document.querySelector("#modifiedHighlights");
const editorResizeHandle = document.querySelector("#editorResizeHandle");
const ignoreWhitespace = document.querySelector("#ignoreWhitespace");
const ignoreCase = document.querySelector("#ignoreCase");
const showOnlyChanges = document.querySelector("#showOnlyChanges");
const linePopover = document.querySelector("#linePopover");
let currentRows = [];
let manualEditorHeight = 0;

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
      rows.push({
        type: "equal",
        left: leftLines[i],
        right: rightLines[j],
        leftNo: i + 1,
        rightNo: j + 1,
        leftIndex: i,
        rightIndex: j
      });
      i += 1;
      j += 1;
    } else if (i < leftLines.length && j < rightLines.length && matrix[i + 1][j] === matrix[i][j + 1]) {
      rows.push({
        type: "change",
        left: leftLines[i],
        right: rightLines[j],
        leftNo: i + 1,
        rightNo: j + 1,
        leftIndex: i,
        rightIndex: j
      });
      i += 1;
      j += 1;
    } else if (j < rightLines.length && (i === leftLines.length || matrix[i][j + 1] >= matrix[i + 1][j])) {
      rows.push({
        type: "insert",
        left: "",
        right: rightLines[j],
        leftNo: "",
        rightNo: j + 1,
        leftIndex: i,
        rightIndex: j
      });
      j += 1;
    } else {
      rows.push({
        type: "delete",
        left: leftLines[i],
        right: "",
        leftNo: i + 1,
        rightNo: "",
        leftIndex: i,
        rightIndex: j
      });
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
        rightNo: next.rightNo,
        leftIndex: current.leftIndex,
        rightIndex: next.rightIndex
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

function renderCell(row, side, text, type) {
  const lineNo = side === "left" ? row.leftNo : row.rightNo;
  const empty = lineNo === "" ? " empty" : "";
  const interactive = row.type === "equal" ? "" : ` data-row-id="${row.id}" data-side="${side}"`;
  let content = escapeHtml(text);
  if (type === "change") {
    const parts = side === "left" ? tokenDiff(text, "").leftParts : tokenDiff("", text).rightParts;
    content = renderParts(parts);
  }
  return `<div class="diff-cell ${type}${empty}"${interactive}>
    <div class="line-no">${lineNo}</div>
    <div class="line-text">${content || "&nbsp;"}</div>
  </div>`;
}

function renderChangeRow(row) {
  const parts = tokenDiff(row.left, row.right);
  return `<div class="diff-row">
    <div class="diff-cell change" data-row-id="${row.id}" data-side="left">
      <div class="line-no">${row.leftNo}</div>
      <div class="line-text">${renderParts(parts.leftParts) || "&nbsp;"}</div>
    </div>
    ${renderMergeControls(row)}
    <div class="diff-cell change" data-row-id="${row.id}" data-side="right">
      <div class="line-no">${row.rightNo}</div>
      <div class="line-text">${renderParts(parts.rightParts) || "&nbsp;"}</div>
    </div>
  </div>`;
}

function renderMergeControls(row) {
  if (row.type === "equal") {
    return `<div class="merge-controls" aria-hidden="true">
      <button class="merge-button" type="button" disabled>&larr;</button>
      <button class="merge-button" type="button" disabled>&rarr;</button>
    </div>`;
  }
  return `<div class="merge-controls">
    <button class="merge-button" type="button" data-merge="left" data-row-id="${row.id}" title="Merge modified into original" aria-label="Merge modified into original">&larr;</button>
    <button class="merge-button" type="button" data-merge="right" data-row-id="${row.id}" title="Merge original into modified" aria-label="Merge original into modified">&rarr;</button>
  </div>`;
}

function renderRows(rows) {
  renderEditorHighlights(rows);
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
  autoFitEditors();
  const rows = lineDiff(splitLines(originalInput.value), splitLines(modifiedInput.value))
    .map((row, id) => ({ ...row, id }));
  currentRows = rows;
  const counts = rows.reduce((acc, row) => {
    acc[row.type] += 1;
    return acc;
  }, { equal: 0, insert: 0, delete: 0, change: 0 });

  renderRows(rows);
  patchOutput.textContent = createPatch(rows);
  stats.textContent = `${counts.insert} added, ${counts.delete} deleted, ${counts.change} changed, ${counts.equal} unchanged`;
}

function highlightClassForLine(rows, side, lineIndex) {
  const row = rowForHighlightLine(rows, side, lineIndex);
  if (!row || row.type === "equal") return "";
  if (row.type === "change") return side === "left" ? "delete" : "insert";
  return row.type;
}

function rowForHighlightLine(rows, side, lineIndex) {
  return rows.find((item) => side === "left" ? item.leftIndex === lineIndex && item.leftNo !== "" : item.rightIndex === lineIndex && item.rightNo !== "");
}

function renderHighlightLayer(layer, lines, rows, side) {
  layer.innerHTML = lines.map((line, index) => {
    const className = highlightClassForLine(rows, side, index);
    const row = rowForHighlightLine(rows, side, index);
    const content = escapeHtml(line) || "&nbsp;";
    const rowAttr = row && row.type !== "equal" ? ` data-row-id="${row.id}"` : "";
    return `<div class="highlight-line ${className}" data-line-index="${index}"${rowAttr}>${content}</div>`;
  }).join("");
}

function renderEditorHighlights(rows) {
  renderHighlightLayer(originalHighlights, splitLines(originalInput.value), rows, "left");
  renderHighlightLayer(modifiedHighlights, splitLines(modifiedInput.value), rows, "right");
  syncHighlightScroll(originalInput);
  syncHighlightScroll(modifiedInput);
}

function joinLines(lines) {
  return lines.join("\n");
}

function mergeRow(rowId, target) {
  const row = currentRows.find((item) => item.id === rowId);
  if (!row || row.type === "equal") return;

  const leftLines = splitLines(originalInput.value);
  const rightLines = splitLines(modifiedInput.value);

  if (target === "left") {
    if (row.type === "change") leftLines[row.leftIndex] = row.right;
    if (row.type === "insert") leftLines.splice(row.leftIndex, 0, row.right);
    if (row.type === "delete") leftLines.splice(row.leftIndex, 1);
    originalInput.value = joinLines(leftLines);
  }

  if (target === "right") {
    if (row.type === "change") rightLines[row.rightIndex] = row.left;
    if (row.type === "delete") rightLines.splice(row.rightIndex, 0, row.left);
    if (row.type === "insert") rightLines.splice(row.rightIndex, 1);
    modifiedInput.value = joinLines(rightLines);
  }

  compare();
}

function mergeAll(target) {
  if (target === "left") originalInput.value = modifiedInput.value;
  if (target === "right") modifiedInput.value = originalInput.value;
  compare();
}

function deleteLine(rowId, side) {
  const row = currentRows.find((item) => item.id === rowId);
  if (!row) return;

  const leftLines = splitLines(originalInput.value);
  const rightLines = splitLines(modifiedInput.value);

  if (side === "left" && row.leftNo !== "") {
    leftLines.splice(row.leftIndex, 1);
    originalInput.value = joinLines(leftLines);
  }

  if (side === "right" && row.rightNo !== "") {
    rightLines.splice(row.rightIndex, 1);
    modifiedInput.value = joinLines(rightLines);
  }

  hidePopover();
  compare();
}

function hidePopover() {
  linePopover.classList.remove("open");
  linePopover.setAttribute("aria-hidden", "true");
  linePopover.innerHTML = "";
  clearHoveredHighlights();
}

function showPopover(cell) {
  const rowId = Number(cell.dataset.rowId);
  const side = cell.dataset.side;
  const row = currentRows.find((item) => item.id === rowId);
  if (!row || row.type === "equal") return;

  const rect = cell.getBoundingClientRect();
  const mergeIntoThis = side === "left" ? "Merge modified here" : "Merge original here";
  const mergeOtherWay = side === "left" ? "Merge original to modified" : "Merge modified to original";
  const targetThis = side;
  const targetOther = side === "left" ? "right" : "left";
  const canDelete = side === "left" ? row.leftNo !== "" : row.rightNo !== "";

  linePopover.innerHTML = `
    <div class="popover-heading">
      <p class="popover-kicker">Line action</p>
      <p class="popover-title">Choose how to resolve this difference</p>
    </div>
    <button class="popover-button" type="button" data-action="merge" data-target="${targetThis}" data-row-id="${rowId}">${mergeIntoThis}</button>
    <button class="popover-button" type="button" data-action="merge" data-target="${targetOther}" data-row-id="${rowId}">${mergeOtherWay}</button>
    <button class="popover-button danger" type="button" data-action="delete" data-side="${side}" data-row-id="${rowId}" ${canDelete ? "" : "disabled"}>Delete line</button>
  `;

  const left = Math.min(rect.left + 18, window.innerWidth - 220);
  const top = Math.min(rect.top + 28, window.innerHeight - 150);
  linePopover.style.left = `${Math.max(10, left)}px`;
  linePopover.style.top = `${Math.max(10, top)}px`;
  linePopover.classList.add("open");
  linePopover.setAttribute("aria-hidden", "false");
}

function rowForEditorLine(side, lineIndex) {
  return currentRows.find((row) => {
    if (row.type === "equal") return false;
    return side === "left"
      ? row.leftIndex === lineIndex && row.leftNo !== ""
      : row.rightIndex === lineIndex && row.rightNo !== "";
  });
}

function lineIndexFromCaret(textarea) {
  return textarea.value.slice(0, textarea.selectionStart).split("\n").length - 1;
}

function showEditorPopover(textarea, side, event) {
  const row = rowForEditorLine(side, lineIndexFromPointer(textarea, event));
  if (!row) {
    hidePopover();
    return;
  }

  const mergeIntoThis = side === "left" ? "Use modified here" : "Use original here";
  const mergeOtherWay = side === "left" ? "Send original to modified" : "Send modified to original";
  const targetThis = side;
  const targetOther = side === "left" ? "right" : "left";

  linePopover.innerHTML = `
    <div class="popover-heading">
      <p class="popover-kicker">Difference</p>
      <p class="popover-title">Resolve this highlighted line</p>
    </div>
    <button class="popover-button" type="button" data-action="merge" data-target="${targetThis}" data-row-id="${row.id}">${mergeIntoThis}</button>
    <button class="popover-button" type="button" data-action="merge" data-target="${targetOther}" data-row-id="${row.id}">${mergeOtherWay}</button>
    <button class="popover-button danger" type="button" data-action="delete" data-side="${side}" data-row-id="${row.id}">Delete line</button>
  `;

  markHoveredRow(row.id);

  const left = Math.min(event.clientX + 10, window.innerWidth - 280);
  const top = Math.min(event.clientY + 10, window.innerHeight - 190);
  linePopover.style.left = `${Math.max(10, left)}px`;
  linePopover.style.top = `${Math.max(10, top)}px`;
  linePopover.classList.add("open");
  linePopover.setAttribute("aria-hidden", "false");
}

function syncHighlightScroll(textarea) {
  const layer = textarea.id === "originalInput" ? originalHighlights : modifiedHighlights;
  layer.scrollTop = textarea.scrollTop;
  layer.scrollLeft = textarea.scrollLeft;
}

function setEditorHeight(height) {
  const next = Math.max(260, Math.min(6000, Math.round(height)));
  document.documentElement.style.setProperty("--editor-height", `${next}px`);
}

function autoFitEditors() {
  [originalInput, modifiedInput].forEach((textarea) => {
    textarea.style.height = "auto";
  });
  const contentHeight = Math.max(originalInput.scrollHeight, modifiedInput.scrollHeight, 560);
  const nextHeight = Math.max(contentHeight + 2, manualEditorHeight);
  setEditorHeight(nextHeight);
  [originalInput, modifiedInput].forEach((textarea) => {
    textarea.style.height = "";
  });
}

function installEditorResize() {
  let startY = 0;
  let startHeight = 0;

  editorResizeHandle.addEventListener("pointerdown", (event) => {
    startY = event.clientY;
    startHeight = originalInput.getBoundingClientRect().height;
    editorResizeHandle.setPointerCapture(event.pointerId);
    document.body.classList.add("resizing-editors");
  });

  editorResizeHandle.addEventListener("pointermove", (event) => {
    if (!editorResizeHandle.hasPointerCapture(event.pointerId)) return;
    manualEditorHeight = Math.max(0, startHeight + event.clientY - startY);
    autoFitEditors();
  });

  editorResizeHandle.addEventListener("pointerup", (event) => {
    if (editorResizeHandle.hasPointerCapture(event.pointerId)) {
      editorResizeHandle.releasePointerCapture(event.pointerId);
    }
    document.body.classList.remove("resizing-editors");
  });
}

function lineIndexFromPointer(textarea, event) {
  const rect = textarea.getBoundingClientRect();
  const style = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(style.lineHeight);
  const paddingTop = Number.parseFloat(style.paddingTop);
  const y = event.clientY - rect.top + textarea.scrollTop - paddingTop;
  return Math.max(0, Math.floor(y / lineHeight));
}

function clearHoveredHighlights() {
  document.querySelectorAll(".highlight-line.hovered").forEach((line) => line.classList.remove("hovered"));
}

function markHoveredRow(rowId) {
  clearHoveredHighlights();
  document.querySelectorAll(`.highlight-line[data-row-id="${rowId}"]`).forEach((line) => line.classList.add("hovered"));
}

function handleEditorHover(textarea, side, event) {
  const row = rowForEditorLine(side, lineIndexFromPointer(textarea, event));
  if (!row) {
    clearHoveredHighlights();
    return;
  }
  markHoveredRow(row.id);
}

document.querySelector("#compareButton").addEventListener("click", compare);
document.querySelector("#mergeAllLeftButton").addEventListener("click", () => mergeAll("left"));
document.querySelector("#mergeAllRightButton").addEventListener("click", () => mergeAll("right"));
if (diffTable) {
  diffTable.addEventListener("click", (event) => {
    const button = event.target.closest("[data-merge]");
    if (button) {
      hidePopover();
      mergeRow(Number(button.dataset.rowId), button.dataset.merge);
      return;
    }

    const cell = event.target.closest(".diff-cell[data-row-id]");
    if (cell) {
      showPopover(cell);
      return;
    }

    hidePopover();
  });
}
linePopover.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  if (button.dataset.action === "merge") mergeRow(Number(button.dataset.rowId), button.dataset.target);
  if (button.dataset.action === "delete") deleteLine(Number(button.dataset.rowId), button.dataset.side);
  hidePopover();
});
document.addEventListener("click", (event) => {
  if (!linePopover.classList.contains("open")) return;
  if (event.target.closest("#linePopover") || event.target.closest(".diff-cell[data-row-id]") || event.target.closest("textarea")) return;
  hidePopover();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hidePopover();
});
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
[originalInput, modifiedInput].forEach((input) => {
  input.addEventListener("scroll", () => syncHighlightScroll(input));
});
originalInput.addEventListener("mousemove", (event) => handleEditorHover(originalInput, "left", event));
modifiedInput.addEventListener("mousemove", (event) => handleEditorHover(modifiedInput, "right", event));
originalInput.addEventListener("mouseleave", () => {
  if (!linePopover.classList.contains("open")) clearHoveredHighlights();
});
modifiedInput.addEventListener("mouseleave", () => {
  if (!linePopover.classList.contains("open")) clearHoveredHighlights();
});
originalInput.addEventListener("click", (event) => showEditorPopover(originalInput, "left", event));
modifiedInput.addEventListener("click", (event) => showEditorPopover(modifiedInput, "right", event));
installEditorResize();

originalInput.value = sampleOriginal;
modifiedInput.value = sampleModified;
compare();
