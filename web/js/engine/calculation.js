// ============================================================
//  QuillCalc — Calculation Engine
// ============================================================

class CalculationEngine {
  constructor(storage) {
    this.storage = storage;
    this.depGraph = new DependencyGraph();
    this.mode = CalculationMode.AUTOMATIC;
    this.isCalculating = false;
    this.queue = new Set();
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === CalculationMode.AUTOMATIC && this.queue.size > 0) {
      const q = new Set(this.queue); this.queue.clear();
      for (const ref of q) this.calculateDependents(ref);
    }
  }
  getMode() { return this.mode; }

  calculateCell(ref) {
    try {
      const cell = this.storage.getCellByRef(ref);
      if (!cell || cell.type === CellType.EMPTY) return { value: null };
      if (cell.type !== CellType.FORMULA) return { value: cell.value };
      const ctx = createDefaultContext((coord) => {
        const r = coordinateToReference(coord);
        const c = this.storage.getCellByRef(r);
        if (c && c.error) throw new Error(c.error);
        return c ? c.value : null;
      });
      try {
        const value = evaluateFormula(cell.formula, ctx);
        this.storage.setCellByRef(ref, Object.assign({}, cell, { value, error: undefined }));
        return { value };
      } catch (e) {
        const errType = this._errorType(e);
        this.storage.setCellByRef(ref, Object.assign({}, cell, { value: 0, error: errType }));
        return { value: null, error: errType };
      }
    } catch (_) {
      return { value: null, error: CellError.ERROR };
    }
  }

  calculateDependents(changed) {
    const results = new Map();
    if (this.mode === CalculationMode.MANUAL && !this.isCalculating) { this.queue.add(changed); return results; }
    if (this.isCalculating) return results;
    try {
      this.isCalculating = true;
      for (const ref of this.depGraph.getAffectedCells(new Set([changed]))) {
        results.set(ref, this.calculateCell(ref));
      }
      return results;
    } finally { this.isCalculating = false; }
  }

  calculateAll() {
    const results = new Map();
    try {
      this.isCalculating = true;
      const order = this.depGraph.getCalculationOrder();
      const all = new Set(order);
      for (const ref of this.storage.getAllReferences()) all.add(ref);
      for (const ref of all) results.set(ref, this.calculateCell(ref));
      this.queue.clear();
      return results;
    } finally { this.isCalculating = false; }
  }

  registerDependencies(cell, deps) {
    this.depGraph.clearDependencies(cell);
    for (const dep of deps) {
      if (this.depGraph.wouldCreateCycle(cell, dep)) throw new Error(CellError.CIRCULAR_REF);
      this.depGraph.addDependency(cell, dep);
    }
  }

  clearDependencies(cell) { this.depGraph.clearDependencies(cell); }

  processCellChange(ref) {
    const cell = this.storage.getCellByRef(ref);
    if (cell && cell.type === CellType.FORMULA) {
      try {
        const pr = parseFormula(cell.formula);
        if (pr.ast && !pr.error) this.registerDependencies(ref, pr.dependencies);
        else this.clearDependencies(ref);
      } catch (_) { this.clearDependencies(ref); }
    } else {
      this.clearDependencies(ref);
    }
    if (this.mode === CalculationMode.AUTOMATIC) this.calculateDependents(ref);
    else this.queue.add(ref);
  }

  _errorType(e) {
    if (!(e instanceof Error)) return CellError.ERROR;
    const m = e.message.toLowerCase();
    if (m.includes('division by zero') || m.includes('divide by zero')) return CellError.DIV_ZERO;
    if (m.includes('circular')) return CellError.CIRCULAR_REF;
    if (m.includes('invalid') && m.includes('reference')) return CellError.REF;
    if (m.includes('unknown') && (m.includes('function') || m.includes('name'))) return CellError.NAME;
    if (m.includes('value') || m.includes('type')) return CellError.VALUE;
    if (m.includes('number') || m.includes('numeric')) return CellError.NUM;
    if (m.includes('not available') || m.includes('n/a')) return CellError.NA;
    return CellError.ERROR;
  }
}
