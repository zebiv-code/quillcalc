// ============================================================
//  QuillCalc — Dependency Graph
// ============================================================

class DependencyGraph {
  constructor() { this.deps = new Map(); }

  _get(cell) {
    let d = this.deps.get(cell);
    if (!d) { d = { cell, dependsOn: new Set(), dependents: new Set() }; this.deps.set(cell, d); }
    return d;
  }

  addDependency(cell, dependsOn) {
    this._get(cell).dependsOn.add(dependsOn);
    this._get(dependsOn).dependents.add(cell);
  }

  clearDependencies(cell) {
    const d = this.deps.get(cell);
    if (!d) return;
    for (const dep of d.dependsOn) {
      const dd = this.deps.get(dep);
      if (dd) { dd.dependents.delete(cell); if (dd.dependsOn.size === 0 && dd.dependents.size === 0) this.deps.delete(dep); }
    }
    d.dependsOn.clear();
    if (d.dependents.size === 0) this.deps.delete(cell);
  }

  getDependents(cell) { const d = this.deps.get(cell); return d ? new Set(d.dependents) : new Set(); }
  getDependencies(cell) { const d = this.deps.get(cell); return d ? new Set(d.dependsOn) : new Set(); }

  wouldCreateCycle(cell, dependsOn) {
    if (cell === dependsOn) return true;
    const visited = new Set();
    const stack = new Set();
    const dfs = (cur, target) => {
      if (cur === target) return true;
      if (visited.has(cur)) return false;
      visited.add(cur); stack.add(cur);
      const d = this.deps.get(cur);
      if (d) for (const dep of d.dependsOn) { if (stack.has(dep) || dfs(dep, target)) return true; }
      stack.delete(cur);
      return false;
    };
    return dfs(dependsOn, cell);
  }

  getCalculationOrder() {
    const order = [], visited = new Set(), temp = new Set();
    const visit = (cell) => {
      temp.add(cell);
      const d = this.deps.get(cell);
      if (d) for (const dep of d.dependsOn) { if (!visited.has(dep)) { if (temp.has(dep)) continue; visit(dep); } }
      temp.delete(cell); visited.add(cell); order.push(cell);
    };
    for (const [cell] of this.deps) if (!visited.has(cell)) visit(cell);
    return order;
  }

  getAffectedCells(changed) {
    const affected = new Set(), queue = [...changed];
    while (queue.length) {
      const cell = queue.shift();
      if (affected.has(cell)) continue;
      affected.add(cell);
      for (const dep of this.getDependents(cell)) if (!affected.has(dep)) queue.push(dep);
    }
    return this.getCalculationOrder().filter(c => affected.has(c));
  }
}
