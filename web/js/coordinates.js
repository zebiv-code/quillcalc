// ============================================================
//  QuillCalc — Coordinate Utilities
// ============================================================

function columnToLetter(col) {
  if (col < 26) return String.fromCharCode(65 + col);
  const first = Math.floor((col - 26) / 26);
  const second = (col - 26) % 26;
  return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
}

function letterToColumn(letter) {
  letter = letter.toUpperCase();
  if (letter.length === 1) {
    return letter.charCodeAt(0) - 65;
  }
  if (letter.length === 2) {
    const first = letter.charCodeAt(0) - 65;
    const second = letter.charCodeAt(1) - 65;
    return 26 + first * 26 + second;
  }
  throw new Error('Invalid column: ' + letter);
}

function coordinateToReference(coord) {
  return columnToLetter(coord.col) + (coord.row + 1);
}

function parseReference(ref) {
  ref = ref.toUpperCase().trim();
  const m = ref.match(/^([A-Z]{1,2})(\d+)$/);
  if (!m) throw new Error('Invalid cell reference: ' + ref);
  const col = letterToColumn(m[1]);
  const row = parseInt(m[2], 10) - 1;
  if (row < 0 || row >= MAX_ROWS || col < 0 || col >= MAX_COLS) {
    throw new Error('Invalid cell reference: ' + ref);
  }
  return { col, row };
}

function isValidCoordinate(coord) {
  return coord.col >= 0 && coord.col < MAX_COLS && coord.row >= 0 && coord.row < MAX_ROWS;
}

function parseRange(rangeStr) {
  try {
    const parts = rangeStr.split(':');
    if (parts.length === 1) {
      const c = parseReference(parts[0]);
      return { start: c, end: c };
    }
    if (parts.length === 2) {
      const s = parseReference(parts[0]);
      const e = parseReference(parts[1]);
      return {
        start: { col: Math.min(s.col, e.col), row: Math.min(s.row, e.row) },
        end:   { col: Math.max(s.col, e.col), row: Math.max(s.row, e.row) },
      };
    }
    return null;
  } catch (_) {
    return null;
  }
}

function getCellsInRange(range) {
  const cells = [];
  for (let r = range.start.row; r <= range.end.row; r++) {
    for (let c = range.start.col; c <= range.end.col; c++) {
      cells.push({ col: c, row: r });
    }
  }
  return cells;
}
