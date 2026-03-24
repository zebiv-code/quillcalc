// ============================================================
//  QuillCalc — Undo Manager
// ============================================================

class UndoManager {
  constructor(maxLevels) {
    this.maxLevels = maxLevels || 100;
    this.undoStack = [];
    this.redoStack = [];
  }
  pushOperation(op) {
    this.undoStack.push(op);
    if (this.undoStack.length > this.maxLevels) this.undoStack.shift();
    this.redoStack = [];
  }
  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }
  undo() { const op = this.undoStack.pop(); if (op) this.redoStack.push(op); return op || null; }
  redo() { const op = this.redoStack.pop(); if (op) this.undoStack.push(op); return op || null; }
  clear() { this.undoStack = []; this.redoStack = []; }
}
