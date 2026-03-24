// ============================================================
//  QuillCalc — Event Emitter
// ============================================================

class EventEmitter {
  constructor() { this.listeners = new Set(); }
  addListener(fn) { this.listeners.add(fn); }
  removeListener(fn) { this.listeners.delete(fn); }
  emit(event) { for (const fn of Array.from(this.listeners)) { try { fn(event); } catch (e) { console.error('Event listener error:', e); } } }
}
