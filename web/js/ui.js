// ============================================================
//  QuillCalc — UI / Application (keyboard, rendering, state)
// ============================================================

(function () {
  // --- State ---
  const sheet = createSheet();
  let cursor = { row: 0, col: 0 };
  let viewport = { row: 0, col: 0 };
  let editMode = false;
  let editValue = '';
  let editCursorPos = 0;
  let insertMode = true;
  let commandMode = false;
  let commandInput = '';
  let directionMode = 'horizontal';
  let statusMessage = '';
  let gridSize = { cols: 7, rows: 20 };

  // --- DOM refs ---
  const elGrid = document.getElementById('grid');
  const elEntry = document.getElementById('entry-line');
  const elPrompt = document.getElementById('prompt-line');
  const elEdit = document.getElementById('edit-line');

  // --- Event: sheet changes trigger render ---
  sheet.addEventListener(() => render());

  // --- Helpers ---
  function getColName(i) { return columnToLetter(i); }
  function getCellCoord(r, c) { return getColName(c) + (r + 1); }
  function getCellValue(r, c) { const cell = sheet.getCell({ row: r, col: c }); return cell ? cell.raw || '' : ''; }
  function getFormattedCellValue(r, c) { const cell = sheet.getCell({ row: r, col: c }); return cell ? formatCellValue(cell) : ''; }

  // --- Calculate grid size based on viewport ---
  function recalcGridSize() {
    const rect = elGrid.getBoundingClientRect();
    const style = getComputedStyle(elGrid);
    const fs = parseFloat(style.fontSize);
    const cw = fs * 0.6;
    const lh = fs * 1.2;
    const availW = rect.width - 5 * cw;
    const cols = Math.ceil(availW / (COL_WIDTH * cw));
    const rows = Math.ceil(rect.height / lh);
    gridSize.cols = Math.max(4, Math.min(MAX_COLS, cols));
    gridSize.rows = Math.max(10, Math.min(MAX_ROWS, rows));
  }

  // --- Viewport management ---
  function updateViewport(row, col) {
    if (col < viewport.col) viewport.col = col;
    else if (col >= viewport.col + gridSize.cols) viewport.col = col - gridSize.cols + 1;
    if (row < viewport.row) viewport.row = row;
    else if (row >= viewport.row + gridSize.rows) viewport.row = row - gridSize.rows + 1;
  }

  function moveCursor(dx, dy) {
    const nc = Math.max(0, Math.min(MAX_COLS - 1, cursor.col + dx));
    const nr = Math.max(0, Math.min(MAX_ROWS - 1, cursor.row + dy));
    cursor = { row: nr, col: nc };
    updateViewport(nr, nc);
    render();
  }

  // --- Slash-command helpers ---
  function handleCommand(cmd) {
    executeCommand(cmd, {
      sheet,
      cursor,
      setCursor(coord) { cursor = { row: coord.row, col: coord.col }; updateViewport(coord.row, coord.col); render(); },
      setStatusMessage(msg) { statusMessage = msg; render(); },
      promptUser(prompt) { return window.prompt(prompt); },
    });
    render();
  }

  // --- Keyboard handler ---
  function onKeyDown(e) {
    // Command mode
    if (commandMode) {
      if (e.key === 'Escape') { commandMode = false; commandInput = ''; }
      else if (e.key === 'Enter') { handleCommand(commandInput); commandMode = false; commandInput = ''; }
      else if (e.key === 'Backspace') { commandInput = commandInput.slice(0, -1); }
      else if (e.key.length === 1) { commandInput += e.key.toUpperCase(); }
      e.preventDefault(); render(); return;
    }

    // Edit mode
    if (editMode) {
      if (e.key === 'Escape') { editMode = false; editValue = ''; editCursorPos = 0; }
      else if (e.key === 'Enter') {
        sheet.setCell(cursor, editValue);
        editMode = false; editValue = ''; editCursorPos = 0;
        if (directionMode === 'vertical') moveCursor(0, 1);
        else moveCursor(1, 0);
      }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); editCursorPos = Math.max(0, editCursorPos - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); editCursorPos = Math.min(editValue.length, editCursorPos + 1); }
      else if (e.key === 'Home')       { e.preventDefault(); editCursorPos = 0; }
      else if (e.key === 'End')        { e.preventDefault(); editCursorPos = editValue.length; }
      else if (e.key === 'Insert')     { e.preventDefault(); insertMode = !insertMode; }
      else if (e.key === 'Backspace')  {
        e.preventDefault();
        if (editCursorPos > 0) { editValue = editValue.slice(0, editCursorPos - 1) + editValue.slice(editCursorPos); editCursorPos--; }
      }
      else if (e.key === 'Delete') {
        e.preventDefault();
        if (editCursorPos < editValue.length) editValue = editValue.slice(0, editCursorPos) + editValue.slice(editCursorPos + 1);
      }
      else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        if (insertMode) { editValue = editValue.slice(0, editCursorPos) + e.key + editValue.slice(editCursorPos); editCursorPos++; }
        else {
          if (editCursorPos < editValue.length) editValue = editValue.slice(0, editCursorPos) + e.key + editValue.slice(editCursorPos + 1);
          else editValue += e.key;
          editCursorPos++;
        }
      }
      render(); return;
    }

    // Navigation / normal mode
    switch (e.key) {
      case '/':
        commandMode = true; commandInput = ''; e.preventDefault(); break;
      case ' ':
        directionMode = directionMode === 'horizontal' ? 'vertical' : 'horizontal'; e.preventDefault(); break;
      case 'ArrowRight': moveCursor(1, 0); e.preventDefault(); break;
      case 'ArrowLeft':  moveCursor(-1, 0); e.preventDefault(); break;
      case 'ArrowUp':    moveCursor(0, -1); e.preventDefault(); break;
      case 'ArrowDown':  moveCursor(0, 1);  e.preventDefault(); break;
      case '>':
        if (e.shiftKey) {
          const coordStr = prompt('GO TO: COORD');
          if (coordStr) {
            try { const c = parseReference(coordStr); cursor = c; updateViewport(c.row, c.col); render(); }
            catch (_) {}
          }
          e.preventDefault();
        }
        break;
      case 'Enter':
        editMode = true;
        editValue = getCellValue(cursor.row, cursor.col);
        editCursorPos = editValue.length;
        e.preventDefault();
        break;
      default:
        if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
          editMode = true; editValue = e.key; editCursorPos = 1; insertMode = true; e.preventDefault();
        }
    }
    render();
  }

  // --- Render ---
  function render() {
    renderControlPanel();
    renderGrid();
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderControlPanel() {
    const coord = getCellCoord(cursor.row, cursor.col);
    const cellVal = getCellValue(cursor.row, cursor.col);
    const cell = sheet.getCell({ row: cursor.row, col: cursor.col });
    const typeChar = cell.type === CellType.FORMULA ? 'F' : cell.type === CellType.VALUE ? 'V' : cell.type === CellType.LABEL ? 'L' : ' ';

    const modeStr = (editMode && !insertMode ? 'R' : ' ') + ' C' + (directionMode === 'horizontal' ? '-' : '!');

    elEntry.innerHTML =
      `<span class="coord">${esc(coord)}:</span>` +
      `<span class="type-ind">[${typeChar}]</span>` +
      `<span class="cell-contents">${esc(cellVal)}</span>` +
      `<span class="mode-ind">${esc(modeStr)}</span>`;

    elPrompt.textContent = commandMode ? 'COMMAND: ' + commandInput : statusMessage;

    if (editMode) {
      const before = esc(editValue.slice(0, editCursorPos));
      const at = editCursorPos < editValue.length ? esc(editValue[editCursorPos]) : '';
      const after = esc(editValue.slice(editCursorPos + 1));
      elEdit.innerHTML = `<span>&gt;</span><span>${before}</span><span class="cursor-blink">` +
        (insertMode ? (at || '_') : (at || '_')) + `</span><span>${after}</span>`;
    } else {
      elEdit.innerHTML = '';
    }
  }

  function renderGrid() {
    let html = '';

    // Column headers row
    html += '<div class="row"><span class="corner">     </span>';
    for (let c = 0; c < gridSize.cols; c++) {
      const ci = viewport.col + c;
      if (ci >= MAX_COLS) break;
      const active = ci === cursor.col ? ' active' : '';
      const name = getColName(ci);
      const w = COL_WIDTH;
      html += `<span class="col-header${active}" style="width:${w}ch">${name.padStart(Math.floor((w + name.length) / 2)).padEnd(w)}</span>`;
    }
    html += '</div>';

    // Data rows
    for (let r = 0; r < gridSize.rows; r++) {
      const ri = viewport.row + r;
      if (ri >= MAX_ROWS) break;
      const activeRow = ri === cursor.row ? ' active' : '';
      html += `<div class="row"><span class="row-num${activeRow}">${String(ri + 1).padStart(4)} </span>`;

      for (let c = 0; c < gridSize.cols; c++) {
        const ci = viewport.col + c;
        if (ci >= MAX_COLS) break;
        const isCursor = ri === cursor.row && ci === cursor.col;
        const cls = isCursor ? ' cursor' : '';
        const raw = getFormattedCellValue(ri, ci) || '';
        const cell = sheet.getCell({ row: ri, col: ci });
        const w = COL_WIDTH;

        // Alignment: labels left, values/formulas right
        let display;
        if (cell.alignment === CellAlignment.LEFT || cell.type === CellType.LABEL) {
          display = raw.slice(0, w - 1).padEnd(w - 1);
        } else if (cell.alignment === CellAlignment.RIGHT || cell.type === CellType.VALUE || cell.type === CellType.FORMULA) {
          display = raw.slice(0, w - 1).padStart(w - 1);
        } else {
          display = raw.slice(0, w - 1).padEnd(w - 1);
        }

        // Add space separator
        display += ' ';

        if (isCursor && !editMode) {
          html += `<span class="cell${cls}" style="width:${w}ch">${esc(display.slice(0, -1))}<span class="cursor-blink">_</span></span>`;
        } else {
          html += `<span class="cell${cls}" style="width:${w}ch">${esc(display)}</span>`;
        }
      }
      html += '</div>';
    }

    elGrid.innerHTML = html;
  }

  // --- Init ---
  function init() {
    recalcGridSize();
    window.addEventListener('resize', () => { recalcGridSize(); render(); });
    window.addEventListener('keydown', onKeyDown);
    render();
  }

  // Wait for DOM + fonts
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
  } else {
    setTimeout(init, 100);
  }
})();
