// ============================================================
//  QuillCalc — Sheet Class (integrates all components)
// ============================================================

class Sheet {
  constructor(config) {
    const def = { maxColumns: MAX_COLS, maxRows: MAX_ROWS, defaultColumnWidth: COL_WIDTH, calculationMode: CalculationMode.AUTOMATIC };
    this.config = Object.assign({}, def, config);
    this.metadata = { created: new Date(), modified: new Date() };
    this.storage = new CellStorage();
    this.calcEngine = new CalculationEngine(this.storage);
    this.undoMgr = new UndoManager();
    this.events = new EventEmitter();
    this.fileMgr = new FileManager(this);
    this.columnWidths = new Map();
    this.rowHeights = new Map();
    this.cellFormats = new Map();
    this.calcEngine.setMode(this.config.calculationMode);
  }

  getCell(coord) {
    const cell = this.storage.getCell(coord);
    const fk = coord.row + ',' + coord.col;
    const fmt = this.cellFormats.get(fk);
    return (fmt && cell.type === CellType.VALUE) ? Object.assign({}, cell, { format: fmt }) : cell;
  }

  setCellFormat(coord, format) {
    const fk = coord.row + ',' + coord.col;
    if (format === CellFormat.GENERAL) this.cellFormats.delete(fk);
    else this.cellFormats.set(fk, format);
    this.events.emit({ type: SheetEventType.CELL_CHANGED, timestamp: Date.now(), coordinate: coord });
  }

  setCell(coord, value) {
    const oldCell = this.storage.getCell(coord);
    let newCell;
    if (value === '') {
      newCell = createEmptyCell();
    } else if (value.startsWith('=')) {
      newCell = this._makeFormulaCell(coord, value.substring(1));
    } else if (value.startsWith('"') && value.endsWith('"') && value.length > 1) {
      newCell = createLabelCell(value.slice(1, -1));
    } else {
      const n = parseFloat(value);
      if (!isNaN(n) && isFinite(n)) newCell = createValueCell(n, value);
      else newCell = parseInput(value);
    }

    this.storage.setCell(coord, newCell);
    const ref = coordinateToReference(coord);

    if (newCell.type !== CellType.FORMULA || !newCell.error) {
      this.calcEngine.processCellChange(ref);
    }
    if (newCell.type === CellType.FORMULA && this.calcEngine.getMode() === CalculationMode.AUTOMATIC && !newCell.error) {
      const res = this.calcEngine.calculateCell(ref);
      if (res.value !== undefined || res.error) {
        this.storage.setCellByRef(ref, Object.assign({}, newCell, { value: res.error ? 0 : res.value, error: res.error }));
      }
    }

    this.undoMgr.pushOperation({ type: OperationType.SET_CELL, timestamp: Date.now(), coordinate: coord, oldCell: oldCell.type !== CellType.EMPTY ? oldCell : null, newCell: newCell.type !== CellType.EMPTY ? newCell : null });
    this.metadata.modified = new Date();
    this.events.emit({ type: SheetEventType.CELL_CHANGED, timestamp: Date.now(), coordinate: coord, oldCell, newCell });
  }

  deleteCell(coord) {
    const old = this.storage.getCell(coord);
    if (old.type === CellType.EMPTY) return;
    this.storage.deleteCell(coord);
    const ref = coordinateToReference(coord);
    this.calcEngine.processCellChange(ref);
    this.undoMgr.pushOperation({ type: OperationType.DELETE_CELL, timestamp: Date.now(), coordinate: coord, oldCell: old, newCell: null });
    this.metadata.modified = new Date();
    this.events.emit({ type: SheetEventType.CELL_CHANGED, timestamp: Date.now(), coordinate: coord, oldCell: old, newCell: null });
  }

  clearRange(range) {
    const cells = new Map();
    for (const [coord, cell] of this.storage.iterateRange(range.start, range.end)) {
      if (cell.type !== CellType.EMPTY) cells.set(coordinateToReference(coord), cell);
    }
    if (cells.size === 0) return;
    this.storage.clearRange(range.start, range.end);
    for (const ref of cells.keys()) this.calcEngine.processCellChange(ref);
    this.undoMgr.pushOperation({ type: OperationType.CLEAR_RANGE, timestamp: Date.now(), sourceRange: range, cells });
    this.metadata.modified = new Date();
    this.events.emit({ type: SheetEventType.RANGE_CHANGED, timestamp: Date.now(), range, operation: 'clear' });
  }

  copyRange(source, target) {
    const te = { col: target.col + (source.end.col - source.start.col), row: target.row + (source.end.row - source.start.row) };
    if (te.col >= this.config.maxColumns || te.row >= this.config.maxRows) throw new Error('Copy exceeds bounds');
    this.storage.copyRange(source.start, source.end, target);
    const dx = target.col - source.start.col, dy = target.row - source.start.row;
    for (const [coord] of this.storage.iterateRange(source.start, source.end)) {
      const ref = coordinateToReference({ col: coord.col + dx, row: coord.row + dy });
      this.calcEngine.processCellChange(ref);
    }
    this.metadata.modified = new Date();
    this.events.emit({ type: SheetEventType.RANGE_CHANGED, timestamp: Date.now(), range: { start: target, end: te }, operation: 'copy' });
  }

  moveRange(source, target) {
    const te = { col: target.col + (source.end.col - source.start.col), row: target.row + (source.end.row - source.start.row) };
    if (te.col >= this.config.maxColumns || te.row >= this.config.maxRows) throw new Error('Move exceeds bounds');
    const srcRefs = [];
    for (const [coord, cell] of this.storage.iterateRange(source.start, source.end)) {
      if (cell.type !== CellType.EMPTY) srcRefs.push(coordinateToReference(coord));
    }
    this.storage.moveRange(source.start, source.end, target);
    for (const ref of srcRefs) this.calcEngine.processCellChange(ref);
    const dx = target.col - source.start.col, dy = target.row - source.start.row;
    for (const [coord] of this.storage.iterateRange(source.start, source.end)) {
      const ref = coordinateToReference({ col: coord.col + dx, row: coord.row + dy });
      this.calcEngine.processCellChange(ref);
    }
    this.metadata.modified = new Date();
    this.events.emit({ type: SheetEventType.RANGE_CHANGED, timestamp: Date.now(), range: { start: target, end: te }, operation: 'move' });
  }

  recalculate() { this.calcEngine.calculateAll(); }

  getColumnWidth(col) { return this.columnWidths.get(col) || this.config.defaultColumnWidth; }
  setColumnWidth(col, w) {
    const old = this.getColumnWidth(col);
    this.columnWidths.set(col, w);
    this.undoMgr.pushOperation({ type: OperationType.SET_COLUMN_WIDTH, timestamp: Date.now(), column: col, oldWidth: old, newWidth: w });
    this.events.emit({ type: SheetEventType.COLUMN_WIDTH_CHANGED, timestamp: Date.now(), column: col, oldWidth: old, newWidth: w });
  }

  canUndo() { return this.undoMgr.canUndo(); }
  canRedo() { return this.undoMgr.canRedo(); }
  undo() {
    const op = this.undoMgr.undo();
    if (!op) return;
    this._applyReverse(op);
    this.events.emit({ type: SheetEventType.UNDO_PERFORMED, timestamp: Date.now() });
  }
  redo() {
    const op = this.undoMgr.redo();
    if (!op) return;
    this._applyForward(op);
    this.events.emit({ type: SheetEventType.REDO_PERFORMED, timestamp: Date.now() });
  }

  save() {
    return {
      cells: this.storage.toJSON(),
      columnWidths: Object.fromEntries(this.columnWidths),
      rowHeights: Object.fromEntries(this.rowHeights),
      cellFormats: Object.fromEntries(this.cellFormats),
      metadata: Object.assign({}, this.metadata),
    };
  }

  load(state) {
    this.clear();
    this.storage.fromJSON(state.cells || {});
    if (state.columnWidths) for (const [k, v] of Object.entries(state.columnWidths)) this.columnWidths.set(parseInt(k), v);
    if (state.cellFormats) for (const [k, v] of Object.entries(state.cellFormats)) this.cellFormats.set(k, v);
    for (const [ref, cell] of Object.entries(state.cells || {})) {
      if (cell.type === CellType.FORMULA) this.calcEngine.processCellChange(ref);
    }
    this.undoMgr.clear();
    this.events.emit({ type: SheetEventType.SHEET_CLEARED, timestamp: Date.now() });
  }

  export(options) { return this.fileMgr.export(options); }
  import(data, options) { this.fileMgr.import(data, options); }

  addEventListener(fn) { this.events.addListener(fn); }
  removeEventListener(fn) { this.events.removeListener(fn); }
  getConfig() { return Object.assign({}, this.config); }
  setCalculationMode(mode) { this.config.calculationMode = mode; this.calcEngine.setMode(mode); }
  getMetadata() { return Object.assign({}, this.metadata); }
  setMetadata(md) { Object.assign(this.metadata, md); this.metadata.modified = new Date(); }

  getUsedRange() {
    const b = this.storage.getUsedBounds();
    if (!b) return null;
    return { start: { col: b.minCol, row: b.minRow }, end: { col: b.maxCol, row: b.maxRow } };
  }
  getCellCount() { return this.storage.size; }

  clear() {
    for (const ref of this.storage.getAllReferences()) this.calcEngine.clearDependencies(ref);
    this.storage.clear();
    this.columnWidths.clear();
    this.rowHeights.clear();
    this.cellFormats.clear();
    this.undoMgr.clear();
    this.metadata = { created: new Date(), modified: new Date() };
    this.events.emit({ type: SheetEventType.SHEET_CLEARED, timestamp: Date.now() });
  }

  _makeFormulaCell(coord, formula) {
    const pr = parseFormula(formula);
    if (pr.error) {
      return { type: CellType.FORMULA, raw: '=' + formula, formula, value: 0, format: CellFormat.GENERAL, alignment: CellAlignment.DEFAULT, dependencies: new Set(), error: pr.error };
    }
    const ref = coordinateToReference(coord);
    try { this.calcEngine.registerDependencies(ref, pr.dependencies); }
    catch (_) {
      return { type: CellType.FORMULA, raw: '=' + formula, formula, value: 0, format: CellFormat.GENERAL, alignment: CellAlignment.DEFAULT, dependencies: pr.dependencies, error: CellError.CIRCULAR_REF };
    }
    return { type: CellType.FORMULA, raw: '=' + formula, formula, value: 0, format: CellFormat.GENERAL, alignment: CellAlignment.DEFAULT, dependencies: pr.dependencies };
  }

  _applyForward(op) {
    if (op.type === OperationType.SET_CELL || op.type === OperationType.DELETE_CELL) {
      if (op.newCell) this.storage.setCell(op.coordinate, op.newCell);
      else this.storage.deleteCell(op.coordinate);
      this.calcEngine.processCellChange(coordinateToReference(op.coordinate));
    } else if (op.type === OperationType.CLEAR_RANGE) {
      this.storage.clearRange(op.sourceRange.start, op.sourceRange.end);
      for (const ref of op.cells.keys()) this.calcEngine.processCellChange(ref);
    } else if (op.type === OperationType.SET_COLUMN_WIDTH) {
      this.columnWidths.set(op.column, op.newWidth);
    } else if (op.type === OperationType.BATCH) {
      for (const sub of op.operations) this._applyForward(sub);
    }
  }

  _applyReverse(op) {
    if (op.type === OperationType.SET_CELL || op.type === OperationType.DELETE_CELL) {
      if (op.oldCell) this.storage.setCell(op.coordinate, op.oldCell);
      else this.storage.deleteCell(op.coordinate);
      this.calcEngine.processCellChange(coordinateToReference(op.coordinate));
    } else if (op.type === OperationType.CLEAR_RANGE) {
      for (const [ref, cell] of op.cells) { this.storage.setCellByRef(ref, cell); this.calcEngine.processCellChange(ref); }
    } else if (op.type === OperationType.SET_COLUMN_WIDTH) {
      this.columnWidths.set(op.column, op.oldWidth);
    } else if (op.type === OperationType.BATCH) {
      for (let i = op.operations.length - 1; i >= 0; i--) this._applyReverse(op.operations[i]);
    }
  }
}

function createSheet(config) { return new Sheet(config); }
