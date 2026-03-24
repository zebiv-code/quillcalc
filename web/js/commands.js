// ============================================================
//  QuillCalc — Slash Commands
// ============================================================

const slashCommands = {
  'B': (ctx) => { ctx.sheet.deleteCell(ctx.cursor); },

  'C': (ctx) => {
    if (confirm('Clear entire sheet?')) { ctx.sheet.clear(); ctx.setStatusMessage('Sheet cleared'); }
  },

  'D': (ctx) => {
    const ch = ctx.promptUser('Delete: Row, Column');
    if (ch) ctx.setStatusMessage('Delete not yet implemented');
  },

  'E': (ctx) => { ctx.setStatusMessage('Press Enter or type to edit'); },

  'F': (ctx) => {
    const f = ctx.promptUser('Format: (G)eneral, (I)nteger, ($)Currency, G(R)aph');
    if (!f) return;
    const ch = f.toUpperCase()[0];
    const map = { G: CellFormat.GENERAL, I: CellFormat.INTEGER, '$': CellFormat.CURRENCY, C: CellFormat.CURRENCY, R: CellFormat.GRAPH };
    const fmt = map[ch];
    if (fmt) { ctx.sheet.setCellFormat(ctx.cursor, fmt); ctx.setStatusMessage('Format: ' + fmt); }
    else ctx.setStatusMessage('Unknown format');
  },

  'G': (ctx) => {
    const cmd = ctx.promptUser('Global: (C)olumn-width, (R)ecalculation');
    if (!cmd) return;
    const ch = cmd.toUpperCase()[0];
    if (ch === 'C') {
      const w = ctx.promptUser('Column width (3-127):');
      if (w) { const n = parseInt(w); if (n >= 3 && n <= 127) ctx.setStatusMessage('Column width set to ' + n); }
    } else if (ch === 'R') {
      const m = ctx.promptUser('Recalculation: (A)utomatic, (M)anual');
      if (m) {
        const auto = m.toUpperCase()[0] === 'A';
        ctx.sheet.setCalculationMode(auto ? CalculationMode.AUTOMATIC : CalculationMode.MANUAL);
        ctx.setStatusMessage('Recalculation: ' + (auto ? 'Automatic' : 'Manual'));
      }
    }
  },

  'I': (ctx) => { ctx.setStatusMessage('Insert not yet implemented'); },

  'M': (ctx) => {
    const from = ctx.promptUser('Move from (range):');
    const to = ctx.promptUser('Move to (cell):');
    if (from && to) {
      try {
        const fr = parseRange(from);
        const tc = parseReference(to);
        if (fr && tc) { ctx.sheet.moveRange(fr, tc); ctx.setStatusMessage('Move complete'); }
        else ctx.setStatusMessage('Invalid range or coordinate');
      } catch (_) { ctx.setStatusMessage('Invalid range or coordinate'); }
    }
  },

  'P': (ctx) => { ctx.setStatusMessage('Print not yet implemented'); },

  'R': (ctx) => {
    const src = ctx.promptUser('Replicate source (cell):');
    const tgt = ctx.promptUser('Target range:');
    if (src && tgt) {
      try {
        const sc = parseReference(src);
        const tr = parseRange(tgt);
        if (sc && tr) {
          const srcCell = ctx.sheet.getCell(sc);
          if (srcCell.type !== CellType.EMPTY) {
            for (let r = tr.start.row; r <= tr.end.row; r++)
              for (let c = tr.start.col; c <= tr.end.col; c++)
                ctx.sheet.setCell({ row: r, col: c }, srcCell.raw || '');
            ctx.setStatusMessage('Replicate complete');
          }
        } else ctx.setStatusMessage('Invalid source or target');
      } catch (_) { ctx.setStatusMessage('Invalid source or target'); }
    }
  },

  'S': (ctx) => {
    const cmd = ctx.promptUser('Storage: (S)ave, (L)oad, (Q)uit');
    if (!cmd) return;
    const ch = cmd.toUpperCase()[0];
    if (ch === 'S') {
      const fn = ctx.promptUser('Save filename:') || 'spreadsheet';
      const data = ctx.sheet.export({ format: FileFormat.QUILLCALC });
      localStorage.setItem('quillcalc_' + fn, data);
      ctx.setStatusMessage('Saved as ' + fn);
    } else if (ch === 'L') {
      const fn = ctx.promptUser('Load filename:');
      if (fn) {
        const data = localStorage.getItem('quillcalc_' + fn);
        if (data) { ctx.sheet.import(data, { format: FileFormat.QUILLCALC }); ctx.setStatusMessage('Loaded ' + fn); }
        else ctx.setStatusMessage('File not found');
      }
    }
  },

  'T': (ctx) => { ctx.setStatusMessage('Titles not yet implemented'); },
  'V': (ctx) => { ctx.setStatusMessage('QuillCalc v1.0.0 — heyman.ai'); },
  'W': (ctx) => { ctx.setStatusMessage('Window not yet implemented'); },

  '-': (ctx) => { ctx.sheet.setCell(ctx.cursor, '"-'); ctx.setStatusMessage('Repeating label'); },

  '!': (ctx) => {
    if (ctx.sheet.getConfig().calculationMode === CalculationMode.MANUAL) {
      ctx.sheet.recalculate(); ctx.setStatusMessage('Calculated');
    } else ctx.setStatusMessage('Already in automatic mode');
  },
};

function executeCommand(cmdChar, ctx) {
  const handler = slashCommands[cmdChar.toUpperCase()];
  if (handler) handler(ctx);
  else ctx.setStatusMessage('Unknown command: ' + cmdChar);
}
