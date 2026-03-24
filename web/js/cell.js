// ============================================================
//  QuillCalc — Cell Functions and Storage
// ============================================================

function createEmptyCell() {
  return { type: CellType.EMPTY, raw: '', value: null, format: CellFormat.GENERAL, alignment: CellAlignment.DEFAULT };
}

function createLabelCell(text) {
  return { type: CellType.LABEL, raw: text, value: text, format: CellFormat.GENERAL, alignment: CellAlignment.LEFT };
}

function createValueCell(value, raw, format) {
  return {
    type: CellType.VALUE,
    raw: raw !== undefined ? raw : value.toString(),
    value: value,
    format: format || CellFormat.GENERAL,
    alignment: CellAlignment.RIGHT,
  };
}

function createFormulaCell(formula, value, dependencies) {
  return {
    type: CellType.FORMULA,
    raw: formula,
    formula: formula.startsWith('=') ? formula.substring(1) : formula,
    value: value !== undefined ? value : 0,
    format: CellFormat.GENERAL,
    alignment: CellAlignment.RIGHT,
    dependencies: dependencies || new Set(),
  };
}

function parseInput(input) {
  input = input.trim();
  if (!input) return createEmptyCell();
  const ch = input[0];
  if (ch === '"') return createLabelCell(input.substring(1));
  if (ch === '+' || ch === '-' || ch === '(' || ch === '@' ||
      (ch >= '0' && ch <= '9' && /[+\-*/^()]/.test(input))) {
    return createFormulaCell(input);
  }
  const num = parseFloat(input);
  if (!isNaN(num)) return createValueCell(num, input);
  return createLabelCell(input);
}

function formatCellValue(cell) {
  if (cell.type === CellType.EMPTY) return '';
  if (cell.error) return cell.error;
  if (cell.type === CellType.LABEL) return cell.value;
  const v = cell.value;
  if (typeof v === 'string') return v;
  if (typeof v !== 'number') return String(v);
  switch (cell.format) {
    case CellFormat.INTEGER:  return Math.round(v).toString();
    case CellFormat.CURRENCY: return '$' + v.toFixed(2);
    case CellFormat.GRAPH:    return '*'.repeat(Math.max(0, Math.round(v)));
    default:
      if (Number.isInteger(v)) return v.toString();
      return v.toPrecision(9).replace(/\.?0+$/, '');
  }
}

// ============================================================
//  Cell Storage
// ============================================================

class CellStorage {
  constructor() { this.cells = new Map(); }

  getCell(coord) {
    return this.cells.get(coordinateToReference(coord)) || createEmptyCell();
  }
  getCellByRef(ref) { return this.cells.get(ref.toUpperCase()) || createEmptyCell(); }

  setCell(coord, cell) {
    const ref = coordinateToReference(coord);
    if (cell.type === CellType.EMPTY) this.cells.delete(ref);
    else this.cells.set(ref, cell);
  }
  setCellByRef(ref, cell) {
    ref = ref.toUpperCase();
    if (cell.type === CellType.EMPTY) this.cells.delete(ref);
    else this.cells.set(ref, cell);
  }

  deleteCell(coord) { this.cells.delete(coordinateToReference(coord)); }
  hasCell(coord) { return this.cells.has(coordinateToReference(coord)); }

  getAllCells() { return new Map(this.cells); }
  getAllReferences() { return Array.from(this.cells.keys()); }
  clear() { this.cells.clear(); }
  get size() { return this.cells.size; }

  getUsedBounds() {
    if (this.cells.size === 0) return null;
    let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
    for (const ref of this.cells.keys()) {
      const c = parseReference(ref);
      minC = Math.min(minC, c.col); maxC = Math.max(maxC, c.col);
      minR = Math.min(minR, c.row); maxR = Math.max(maxR, c.row);
    }
    return { minCol: minC, maxCol: maxC, minRow: minR, maxRow: maxR };
  }

  *iterateRange(start, end) {
    const cMin = Math.min(start.col, end.col), cMax = Math.max(start.col, end.col);
    const rMin = Math.min(start.row, end.row), rMax = Math.max(start.row, end.row);
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        const coord = { col: c, row: r };
        yield [coord, this.getCell(coord)];
      }
    }
  }

  clearRange(start, end) {
    for (const [coord] of this.iterateRange(start, end)) this.deleteCell(coord);
  }

  copyRange(srcStart, srcEnd, dest) {
    const dx = dest.col - srcStart.col, dy = dest.row - srcStart.row;
    const buf = [];
    for (const [coord, cell] of this.iterateRange(srcStart, srcEnd)) {
      if (cell.type !== CellType.EMPTY) buf.push([coord, cell]);
    }
    for (const [sc, cell] of buf) {
      const dc = { col: sc.col + dx, row: sc.row + dy };
      if (isValidCoordinate(dc)) this.setCell(dc, Object.assign({}, cell));
    }
  }

  moveRange(srcStart, srcEnd, dest) {
    this.copyRange(srcStart, srcEnd, dest);
    const de = { col: dest.col + (srcEnd.col - srcStart.col), row: dest.row + (srcEnd.row - srcStart.row) };
    const noOverlap = de.col < srcStart.col || dest.col > srcEnd.col || de.row < srcStart.row || dest.row > srcEnd.row;
    if (noOverlap) this.clearRange(srcStart, srcEnd);
  }

  toJSON() { return Object.fromEntries(this.cells); }
  fromJSON(data) {
    this.clear();
    for (const [ref, cell] of Object.entries(data)) this.cells.set(ref, cell);
  }
}
