const originalInput = document.querySelector("#originalInput");
const modifiedInput = document.querySelector("#modifiedInput");
const editorGrid = document.querySelector("#editorGrid");
const alignedDiffShell = document.querySelector("#alignedDiffShell");
const alignedDiff = document.querySelector("#alignedDiff");
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
let currentPopover = null;
let viewMode = "edit";

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
    if (rows[index].type === "equal") {
      paired.push(rows[index]);
      continue;
    }

    const block = [];
    while (index < rows.length && rows[index].type !== "equal") {
      block.push(rows[index]);
      index += 1;
    }
    index -= 1;

    paired.push(...pairChangeBlock(block));
  }
  return paired;
}

function pairChangeBlock(block) {
  const deletes = block.filter((row) => row.type === "delete");
  const inserts = block.filter((row) => row.type === "insert");
  if (!deletes.length || !inserts.length) return block;

  const maxSize = Math.max(deletes.length, inserts.length);
  const sizeRatio = maxSize / Math.max(1, Math.min(deletes.length, inserts.length));
  const shouldPair = maxSize <= 4 && sizeRatio <= 1.5 && averageLineSimilarity(deletes, inserts) >= 0.18;
  if (!shouldPair) return [...deletes, ...inserts];

  const paired = [];
  const pairCount = Math.min(deletes.length, inserts.length);
  for (let offset = 0; offset < pairCount; offset += 1) {
    paired.push({
      type: "change",
      left: deletes[offset].left,
      right: inserts[offset].right,
      leftNo: deletes[offset].leftNo,
      rightNo: inserts[offset].rightNo,
      leftIndex: deletes[offset].leftIndex,
      rightIndex: inserts[offset].rightIndex
    });
  }
  return paired.concat(deletes.slice(pairCount), inserts.slice(pairCount));
}

function averageLineSimilarity(deletes, inserts) {
  const pairCount = Math.min(deletes.length, inserts.length);
  if (!pairCount) return 0;
  let total = 0;
  for (let index = 0; index < pairCount; index += 1) {
    total += lineSimilarity(deletes[index].left, inserts[index].right);
  }
  return total / pairCount;
}

function lineSimilarity(left, right) {
  const leftWords = new Set(normalize(left).match(/[^\s,.;:()[\]{}]+/g) || []);
  const rightWords = new Set(normalize(right).match(/[^\s,.;:()[\]{}]+/g) || []);
  if (!leftWords.size && !rightWords.size) return 1;
  if (!leftWords.size || !rightWords.size) return 0;
  let overlap = 0;
  leftWords.forEach((word) => {
    if (rightWords.has(word)) overlap += 1;
  });
  return overlap / Math.max(leftWords.size, rightWords.size);
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
  renderAlignedDiff(rows);
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

function showDiffView() {
  viewMode = "diff";
  editorGrid.hidden = true;
  alignedDiffShell.hidden = false;
  editorResizeHandle.hidden = true;
}

function showEditView() {
  viewMode = "edit";
  editorGrid.hidden = false;
  alignedDiffShell.hidden = true;
  editorResizeHandle.hidden = false;
  hidePopover();
  autoFitEditors();
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
    return `<span class="highlight-line ${className}" data-line-index="${index}"${rowAttr}>${content}</span>`;
  }).join("");
}

function renderEditorHighlights(rows) {
  renderHighlightLayer(originalHighlights, splitLines(originalInput.value), rows, "left");
  renderHighlightLayer(modifiedHighlights, splitLines(modifiedInput.value), rows, "right");
  syncHighlightScroll(originalInput);
  syncHighlightScroll(modifiedInput);
}

function renderAlignedDiff(rows) {
  const visibleRows = showOnlyChanges.checked ? rows.filter((row) => row.type !== "equal") : rows;
  if (!visibleRows.length) {
    alignedDiff.innerHTML = `<div class="empty-state">No differences found.</div>`;
    return;
  }

  alignedDiff.innerHTML = visibleRows.map((row) => {
    const leftType = row.type === "delete" || row.type === "change" ? "delete" : row.type === "insert" ? "empty" : "equal";
    const rightType = row.type === "insert" || row.type === "change" ? "insert" : row.type === "delete" ? "empty" : "equal";
    return `<div class="aligned-row" data-row-id="${row.id}">
      ${renderAlignedCell(row, "left", leftType)}
      ${renderAlignedCell(row, "right", rightType)}
    </div>`;
  }).join("");
}

function renderAlignedCell(row, side, type) {
  const lineNo = side === "left" ? row.leftNo : row.rightNo;
  const text = side === "left" ? row.left : row.right;
  const content = type === "empty" ? "&nbsp;" : escapeHtml(text) || "&nbsp;";
  return `<div class="aligned-cell ${type}" data-side="${side}">
    <div class="aligned-no">${lineNo || ""}</div>
    <div class="aligned-text">${content}</div>
  </div>`;
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

async function copyRowText(rowId, side) {
  const row = currentRows.find((item) => item.id === rowId);
  if (!row) return;
  const text = side === "left" ? row.left : row.right;
  await navigator.clipboard.writeText(text);
}

function hidePopover() {
  linePopover.classList.remove("open");
  linePopover.classList.remove("explaining");
  linePopover.setAttribute("aria-hidden", "true");
  linePopover.innerHTML = "";
  currentPopover = null;
  clearHoveredHighlights();
}

function changedRows() {
  return currentRows.filter((row) => row.type !== "equal");
}

function changeIndexForRow(rowId) {
  return changedRows().findIndex((row) => row.id === rowId);
}

function explainText(row) {
  if (row.type === "insert") return "This line exists only in Modified. Merge left to add it to Original, or merge right to remove it from Modified.";
  if (row.type === "delete") return "This line exists only in Original. Merge right to add it to Modified, or merge left to remove it from Original.";
  return "Both sides changed on this line. Pick the side that should become the source of truth.";
}

function showEditorPopover(textarea, side, event) {
  const row = rowForEditorPoint(side, event);
  if (!row) {
    hidePopover();
    return;
  }
  showChangePopover(row, side, event.clientX, event.clientY);
}

function showChangePopover(row, side, clientX, clientY) {
  const changes = changedRows();
  const changeIndex = changeIndexForRow(row.id);
  const previousDisabled = changeIndex <= 0 ? " disabled" : "";
  const nextDisabled = changeIndex >= changes.length - 1 ? " disabled" : "";

  markHoveredRow(row.id);
  currentPopover = { rowId: row.id, side, x: clientX, y: clientY };

  linePopover.innerHTML = `
    <header class="change-popover-header">
      <div class="change-popover-count"><strong>Change</strong><span>${changeIndex + 1} of ${changes.length}</span></div>
      <div class="change-popover-nav">
        <button class="button ghost" type="button" data-action="previous-change"${previousDisabled}>Previous change</button>
        <button class="button ghost" type="button" data-action="next-change"${nextDisabled}>Next change</button>
      </div>
      <button class="button copy-change" type="button" data-action="copy" data-side="${side}" data-row-id="${row.id}">Copy</button>
      <button class="button explain-change" type="button" data-action="explain">Explain</button>
    </header>
    <div class="change-popover-body">
      <div class="change-preview left">
        <div class="change-side-label">Original</div>
        <div class="change-line">
          <div class="change-line-no">${row.leftNo || ""}</div>
          <div class="change-line-text">${escapeHtml(row.left) || "&nbsp;"}</div>
        </div>
      </div>
      <div class="change-preview right">
        <div class="change-side-label">Modified</div>
        <div class="change-line">
          <div class="change-line-no">${row.rightNo || ""}</div>
          <div class="change-line-text">${escapeHtml(row.right) || "&nbsp;"}</div>
        </div>
      </div>
    </div>
    <div class="change-popover-actions">
      <button class="merge-popover left" type="button" data-action="merge" data-target="right" data-row-id="${row.id}">Use Original ›</button>
      <button class="close-popover" type="button" data-action="close" aria-label="Close">×</button>
      <button class="merge-popover right" type="button" data-action="merge" data-target="left" data-row-id="${row.id}">‹ Use Modified</button>
    </div>
    <div class="change-popover-footer">
      <button class="text-action" type="button" data-action="copy" data-side="left" data-row-id="${row.id}">Copy original</button>
      <button class="text-action" type="button" data-action="copy" data-side="right" data-row-id="${row.id}">Copy modified</button>
      <button class="text-action danger" type="button" data-action="delete" data-side="${side}" data-row-id="${row.id}">Delete selected side</button>
    </div>
    <p class="change-popover-explanation">${explainText(row)}</p>
  `;

  const left = Math.min(clientX + 10, window.innerWidth - Math.min(1180, window.innerWidth - 24));
  const top = Math.min(clientY + 12, window.innerHeight - 320);
  linePopover.style.left = `${Math.max(10, left)}px`;
  linePopover.style.top = `${Math.max(10, top)}px`;
  linePopover.classList.add("open");
  linePopover.setAttribute("aria-hidden", "false");
}

function showAdjacentChange(direction) {
  if (!currentPopover) return;
  const changes = changedRows();
  const currentIndex = changeIndexForRow(currentPopover.rowId);
  const nextIndex = Math.max(0, Math.min(changes.length - 1, currentIndex + direction));
  const row = changes[nextIndex];
  if (!row) return;
  showChangePopover(row, currentPopover.side, currentPopover.x, currentPopover.y);
}

function syncHighlightScroll(textarea) {
  const layer = textarea.id === "originalInput" ? originalHighlights : modifiedHighlights;
  layer.scrollTop = textarea.scrollTop;
  layer.scrollLeft = textarea.scrollLeft;
}

function setEditorHeight(height) {
  const next = Math.max(260, Math.round(height));
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

function rowForEditorPoint(side, event) {
  const layer = side === "left" ? originalHighlights : modifiedHighlights;
  const candidates = Array.from(layer.querySelectorAll(".highlight-line[data-row-id]"));
  const hit = candidates.find((line) => {
    return Array.from(line.getClientRects()).some((rect) => {
      const withinY = event.clientY >= rect.top - 3 && event.clientY <= rect.bottom + 3;
      const withinX = event.clientX >= rect.left - 6 && event.clientX <= rect.right + 6;
      return withinY && withinX;
    });
  });
  if (!hit) return null;
  return currentRows.find((row) => row.id === Number(hit.dataset.rowId)) || null;
}

function clearHoveredHighlights() {
  document.querySelectorAll(".highlight-line.hovered").forEach((line) => line.classList.remove("hovered"));
}

function markHoveredRow(rowId) {
  clearHoveredHighlights();
  document.querySelectorAll(`.highlight-line[data-row-id="${rowId}"]`).forEach((line) => line.classList.add("hovered"));
  document.querySelectorAll(".aligned-row.hovered").forEach((row) => row.classList.remove("hovered"));
  document.querySelector(`.aligned-row[data-row-id="${rowId}"]`)?.classList.add("hovered");
}

function handleEditorHover(textarea, side, event) {
  const row = rowForEditorPoint(side, event);
  if (!row) {
    clearHoveredHighlights();
    return;
  }
  markHoveredRow(row.id);
}

document.querySelector("#compareButton").addEventListener("click", () => {
  compare();
  showDiffView();
});
document.querySelector("#editButton").addEventListener("click", showEditView);
document.querySelector("#mergeAllLeftButton").addEventListener("click", () => mergeAll("left"));
document.querySelector("#mergeAllRightButton").addEventListener("click", () => mergeAll("right"));
alignedDiff.addEventListener("mousemove", (event) => {
  const rowEl = event.target.closest(".aligned-row[data-row-id]");
  if (!rowEl) {
    clearHoveredHighlights();
    return;
  }
  markHoveredRow(Number(rowEl.dataset.rowId));
});
alignedDiff.addEventListener("mouseleave", () => {
  if (!linePopover.classList.contains("open")) clearHoveredHighlights();
});
alignedDiff.addEventListener("click", (event) => {
  const rowEl = event.target.closest(".aligned-row[data-row-id]");
  if (!rowEl) return;
  const row = currentRows.find((item) => item.id === Number(rowEl.dataset.rowId));
  if (!row || row.type === "equal") return;
  const side = event.target.closest(".aligned-cell")?.dataset.side || "right";
  showChangePopover(row, side, event.clientX, event.clientY);
});
linePopover.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  if (button.dataset.action === "close") {
    hidePopover();
    return;
  }
  if (button.dataset.action === "previous-change") {
    showAdjacentChange(-1);
    return;
  }
  if (button.dataset.action === "next-change") {
    showAdjacentChange(1);
    return;
  }
  if (button.dataset.action === "explain") {
    linePopover.classList.toggle("explaining");
    return;
  }
  if (button.dataset.action === "merge") mergeRow(Number(button.dataset.rowId), button.dataset.target);
  if (button.dataset.action === "delete") deleteLine(Number(button.dataset.rowId), button.dataset.side);
  if (button.dataset.action === "copy") copyRowText(Number(button.dataset.rowId), button.dataset.side);
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
  showEditView();
});
document.querySelector("#swapButton").addEventListener("click", () => {
  [originalInput.value, modifiedInput.value] = [modifiedInput.value, originalInput.value];
  compare();
  showEditView();
});
document.querySelector("#clearButton").addEventListener("click", () => {
  originalInput.value = "";
  modifiedInput.value = "";
  compare();
  showEditView();
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
showEditView();
