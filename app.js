const originalInput = document.querySelector("#originalInput");
const modifiedInput = document.querySelector("#modifiedInput");
const editorGrid = document.querySelector("#editorGrid");
const alignedDiffShell = document.querySelector("#alignedDiffShell");
const alignedDiff = document.querySelector("#alignedDiff");
const stats = document.querySelector("#stats");
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
const compareButton = document.querySelector("#compareButton");
const fallbackSampleOriginal = `Invoice #4102
Customer: Atlas Market
Status: Pending

Items:
- Coffee beans, 12 bags
- Paper cups, 400 units
- Oat milk, 24 cartons

Delivery window: Friday 09:00-12:00
Notes: Call warehouse before arrival.`;

const fallbackSampleModified = `Invoice #4102
Customer: Atlas Market
Status: Approved

Items:
- Coffee beans, 14 bags
- Paper cups, 400 units
- Oat milk, 24 cartons
- Compostable lids, 400 units

Delivery window: Friday 10:00-13:00
Notes: Call warehouse gate before arrival.`;

const sampleOriginal = window.ubmk26Sample?.original || fallbackSampleOriginal;
const sampleModified = window.ubmk26Sample?.modified || fallbackSampleModified;

function normalize(value) {
  let next = value;
  if (ignoreWhitespace.checked) next = next.trim().replace(/\s+/g, " ");
  if (ignoreCase.checked) next = next.toLowerCase();
  return next;
}

function normalizeLineAnchor(value) {
  let next = value.trim();
  if (ignoreWhitespace.checked) next = next.replace(/\s+/g, " ");
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

function nearestLineMatch(lines, start, needle, limit = 120) {
  const normalizedNeedle = normalizeLineAnchor(needle);
  const end = Math.min(lines.length, start + limit);
  for (let index = start; index < end; index += 1) {
    if (normalizeLineAnchor(lines[index]) === normalizedNeedle) return index - start;
  }
  return Number.POSITIVE_INFINITY;
}

function lineDiff(leftLines, rightLines) {
  const matrix = lcsMatrix(leftLines, rightLines, (a, b) => normalizeLineAnchor(a) === normalizeLineAnchor(b));
  const rows = [];
  let i = 0;
  let j = 0;

  while (i < leftLines.length || j < rightLines.length) {
    if (i < leftLines.length && j < rightLines.length && normalizeLineAnchor(leftLines[i]) === normalizeLineAnchor(rightLines[j])) {
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
    } else if (shouldTakeInsert(leftLines, rightLines, matrix, i, j)) {
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

  return pairMovedBlocks(pairDeleteInsertRows(rows));
}

function shouldTakeInsert(leftLines, rightLines, matrix, i, j) {
  if (j >= rightLines.length) return false;
  if (i >= leftLines.length) return true;

  const insertScore = matrix[i][j + 1];
  const deleteScore = matrix[i + 1][j];
  if (insertScore !== deleteScore) return insertScore > deleteScore;

  const leftLineAppearsInRight = nearestLineMatch(rightLines, j + 1, leftLines[i]);
  const rightLineAppearsInLeft = nearestLineMatch(leftLines, i + 1, rightLines[j]);
  if (leftLineAppearsInRight !== rightLineAppearsInLeft) {
    return leftLineAppearsInRight < rightLineAppearsInLeft;
  }

  return false;
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

  const paired = [];
  const rowCount = Math.max(deletes.length, inserts.length);
  for (let offset = 0; offset < rowCount; offset += 1) {
    const deleted = deletes[offset];
    const inserted = inserts[offset];
    if (deleted && inserted) {
      paired.push({
        type: "change",
        left: deleted.left,
        right: inserted.right,
        leftNo: deleted.leftNo,
        rightNo: inserted.rightNo,
        leftIndex: deleted.leftIndex,
        rightIndex: inserted.rightIndex
      });
    } else if (deleted) {
      paired.push(deleted);
    } else {
      paired.push(inserted);
    }
  }
  return paired;
}

function pairMovedBlocks(rows) {
  const blocks = collectSingleSideBlocks(rows);
  const deletes = blocks.filter((block) => block.type === "delete");
  const inserts = blocks.filter((block) => block.type === "insert");
  const candidates = [];
  const matchedDeletes = new Set();
  const matchedInserts = new Set();
  const insertReplacements = new Map();

  inserts.forEach((insertBlock) => {
    deletes.forEach((deleteBlock) => {
      const score = blockSimilarity(deleteBlock.rows, insertBlock.rows);
      if (score >= 0.72) {
        candidates.push({ deleteBlock, insertBlock, score });
      }
    });
  });

  candidates
    .sort((a, b) => b.score - a.score)
    .forEach(({ deleteBlock, insertBlock }) => {
      if (matchedDeletes.has(deleteBlock.start) || matchedInserts.has(insertBlock.start)) return;
      matchedDeletes.add(deleteBlock.start);
      matchedInserts.add(insertBlock.start);
      insertReplacements.set(insertBlock.start, {
        end: insertBlock.end,
        rows: pairMovedBlockRows(deleteBlock.rows, insertBlock.rows)
      });
  });

  const result = [];
  for (let index = 0; index < rows.length; index += 1) {
    const replacement = insertReplacements.get(index);
    if (replacement) {
      result.push(...replacement.rows);
      index = replacement.end;
      continue;
    }

    const movedDelete = deletes.find((block) => block.start === index && matchedDeletes.has(block.start));
    if (movedDelete) {
      index = movedDelete.end;
      continue;
    }

    result.push(rows[index]);
  }
  return result;
}

function collectSingleSideBlocks(rows) {
  const blocks = [];
  for (let index = 0; index < rows.length; index += 1) {
    const type = rows[index].type;
    if (type !== "delete" && type !== "insert") continue;
    const start = index;
    const blockRows = [];
    while (index < rows.length && rows[index].type === type) {
      blockRows.push(rows[index]);
      index += 1;
    }
    index -= 1;
    if (blockRows.length >= 3) {
      blocks.push({ type, start, end: index, rows: blockRows });
    }
  }
  return blocks;
}

function blockSimilarity(leftRows, rightRows) {
  const left = leftRows.map((row) => normalizeLineAnchor(row.left));
  const right = rightRows.map((row) => normalizeLineAnchor(row.right));
  const matrix = lcsMatrix(left, right, (a, b) => a === b);
  return matrix[0][0] / Math.max(1, Math.min(left.length, right.length));
}

function pairMovedBlockRows(deleteRows, insertRows) {
  const paired = [];
  const rowCount = Math.max(deleteRows.length, insertRows.length);
  for (let offset = 0; offset < rowCount; offset += 1) {
    const deleted = deleteRows[offset];
    const inserted = insertRows[offset];
    if (deleted && inserted) {
      const sameAnchor = normalizeLineAnchor(deleted.left) === normalizeLineAnchor(inserted.right);
      paired.push({
        type: sameAnchor ? "equal" : "change",
        left: deleted.left,
        right: inserted.right,
        leftNo: deleted.leftNo,
        rightNo: inserted.rightNo,
        leftIndex: deleted.leftIndex,
        rightIndex: inserted.rightIndex
      });
    } else if (deleted) {
      paired.push(deleted);
    } else {
      paired.push(inserted);
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
  if (viewMode === "edit") renderEditorHighlights(rows);
  renderAlignedDiff(rows);
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
  stats.textContent = `${counts.insert} added, ${counts.delete} deleted, ${counts.change} changed, ${counts.equal} unchanged`;
}

function showDiffView() {
  viewMode = "diff";
  hidePopover();
  editorGrid.hidden = true;
  alignedDiffShell.hidden = false;
  editorResizeHandle.hidden = true;
  compareButton.textContent = "Edit text";
  renderAlignedDiff(currentRows);
}

function showEditView() {
  viewMode = "edit";
  editorGrid.hidden = false;
  alignedDiffShell.hidden = true;
  editorResizeHandle.hidden = false;
  compareButton.textContent = "Compare";
  hidePopover();
  autoFitEditors();
}

function renderHighlightLayer(layer, lines, rows, side) {
  const rowMap = new Map();
  for (const row of rows) {
    const index = side === "left" ? row.leftIndex : row.rightIndex;
    const no = side === "left" ? row.leftNo : row.rightNo;
    if (index !== undefined && no !== "") rowMap.set(index, row);
  }

  layer.innerHTML = lines.map((line, index) => {
    const row = rowMap.get(index);
    let className = "";
    if (row && row.type !== "equal") {
      className = row.type === "change" ? (side === "left" ? "delete" : "insert") : row.type;
    }
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
      ${renderMergeControls(row)}
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
  showChangePopover(row, side, event.pageX, event.pageY);
}

function showChangePopover(row, side, pageX, pageY) {
  const changes = changedRows();
  const changeIndex = changeIndexForRow(row.id);
  const previousDisabled = changeIndex <= 0 ? " disabled" : "";
  const nextDisabled = changeIndex >= changes.length - 1 ? " disabled" : "";

  markHoveredRow(row.id);
  currentPopover = { rowId: row.id, side, x: pageX, y: pageY };

  linePopover.innerHTML = `
    <header class="change-popover-header">
      <span class="change-popover-count"><strong>${changeIndex + 1}</strong> / ${changes.length}</span>
      <div class="change-popover-nav">
        <button class="nav-btn" type="button" data-action="previous-change"${previousDisabled}>&#8592; Prev</button>
        <button class="nav-btn" type="button" data-action="next-change"${nextDisabled}>Next &#8594;</button>
      </div>
      <button class="close-popover" type="button" data-action="close" aria-label="Close">&#x2715;</button>
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
      <button class="merge-popover left" type="button" data-action="merge" data-target="right" data-row-id="${row.id}">Use Original</button>
      <button class="merge-popover right" type="button" data-action="merge" data-target="left" data-row-id="${row.id}">Use Modified</button>
    </div>
  `;


  linePopover.classList.add("open");
  linePopover.setAttribute("aria-hidden", "false");
}

function showAdjacentChange(direction) {
  if (!currentPopover) return;
  const changes = changedRows();
  const currentIndex = changeIndexForRow(currentPopover.rowId);
  const nextIndex = Math.max(0, Math.min(changes.length - 1, currentIndex + direction));
  if (nextIndex === currentIndex) return;
  const row = changes[nextIndex];
  if (!row) return;
  showChangePopover(row, currentPopover.side, currentPopover.x, currentPopover.y);
  // Scroll the corresponding aligned-row into view (center so it aligns with popup)
  const rowEl = document.querySelector(`.aligned-row[data-row-id="${row.id}"]`);
  if (rowEl) rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
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
  if (viewMode !== "edit") return;
  const row = rowForEditorPoint(side, event);
  if (!row) {
    clearHoveredHighlights();
    return;
  }
  markHoveredRow(row.id);
}

compareButton.addEventListener("click", () => {
  if (viewMode === "edit") {
    compare();
    showDiffView();
  } else {
    showEditView();
  }
});
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
  const mergeButton = event.target.closest("[data-merge][data-row-id]");
  if (mergeButton) {
    mergeRow(Number(mergeButton.dataset.rowId), mergeButton.dataset.merge);
    showDiffView();
    return;
  }

  const rowEl = event.target.closest(".aligned-row[data-row-id]");
  if (!rowEl) return;
  const row = currentRows.find((item) => item.id === Number(rowEl.dataset.rowId));
  if (!row || row.type === "equal") return;
  const side = event.target.closest(".aligned-cell")?.dataset.side || "right";
  showChangePopover(row, side, event.pageX, event.pageY);
});
linePopover.addEventListener("click", (event) => {
  event.stopPropagation();
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
  if (
    event.target.closest("#linePopover") ||
    event.target.closest(".diff-cell[data-row-id]") ||
    event.target.closest(".aligned-row[data-row-id]") ||
    event.target.closest("textarea")
  ) return;
  hidePopover();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hidePopover();
});
document.querySelector("#sampleButton").addEventListener("click", () => {
  if (Object.keys(window.ubmk26Sample || {}).length > 0) {
    originalInput.value = window.ubmk26Sample.original;
    modifiedInput.value = window.ubmk26Sample.modified;
    compare();
    showDiffView();
  } else {
    originalInput.value = fallbackSampleOriginal;
    modifiedInput.value = fallbackSampleModified;
    compare();
    showDiffView();
  }
});
document.querySelector("#swapButton").addEventListener("click", () => {
  [originalInput.value, modifiedInput.value] = [modifiedInput.value, originalInput.value];
  compare();
});
document.querySelector("#clearButton").addEventListener("click", () => {
  originalInput.value = "";
  modifiedInput.value = "";
  compare();
  showEditView();
  originalInput.focus();
});

ignoreWhitespace.addEventListener("change", compare);
ignoreCase.addEventListener("change", compare);
showOnlyChanges.addEventListener("change", () => {
  renderAlignedDiff(currentRows);
  if (viewMode === "diff") showDiffView();
});
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

if (Object.keys(window.ubmk26Sample || {}).length > 0) {
  originalInput.value = window.ubmk26Sample.original;
  modifiedInput.value = window.ubmk26Sample.modified;
} else {
  originalInput.value = fallbackSampleOriginal;
  modifiedInput.value = fallbackSampleModified;
}
compare();
showEditView();
