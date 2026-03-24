// ============================================================
//  QuillCalc — File Manager
// ============================================================

class FileManager {
  constructor(sheet) { this.sheet = sheet; }

  export(options) {
    switch (options.format) {
      case FileFormat.QUILLCALC: return this._exportQC(options);
      case FileFormat.CSV: return this._exportDelim(',', options);
      case FileFormat.TSV: return this._exportDelim('\t', options);
      case FileFormat.DIF: return this._exportDIF(options);
      default: throw new Error('Unsupported format');
    }
  }

  import(data, options) {
    switch (options.format) {
      case FileFormat.QUILLCALC: this._importQC(data); break;
      case FileFormat.CSV: this._importDelim(data, ',', options); break;
      case FileFormat.TSV: this._importDelim(data, '\t', options); break;
      default: throw new Error('Unsupported format');
    }
  }

  _exportQC(options) { return JSON.stringify(this.sheet.save(), null, 2); }

  _importQC(data) {
    try { this.sheet.load(JSON.parse(data)); }
    catch (_) { throw new Error('Invalid QuillCalc file format'); }
  }

  _exportDelim(delim, options) {
    const range = options.range || this.sheet.getUsedRange();
    if (!range) return '';
    const rows = [];
    for (let r = range.start.row; r <= range.end.row; r++) {
      const vals = [];
      for (let c = range.start.col; c <= range.end.col; c++) {
        const cell = this.sheet.getCell({ col: c, row: r });
        let v = '';
        if (cell.type !== CellType.EMPTY) {
          if (options.includeFormulas && cell.type === CellType.FORMULA) v = '=' + cell.formula;
          else {
            v = cell.value !== null ? String(cell.value) : '';
            if (v.includes(delim) || v.includes('"') || v.includes('\n')) v = '"' + v.replace(/"/g, '""') + '"';
          }
        }
        vals.push(v);
      }
      rows.push(vals.join(delim));
    }
    return rows.join('\n');
  }

  _importDelim(data, delim, options) {
    const lines = data.split(/\r?\n/);
    const sc = options.startCell || { col: 0, row: 0 };
    const cfg = this.sheet.getConfig();
    for (let li = 0; li < lines.length; li++) {
      if (!lines[li].trim()) continue;
      const vals = this._parseLine(lines[li], delim);
      for (let ci = 0; ci < vals.length; ci++) {
        const coord = { col: sc.col + ci, row: sc.row + li };
        if (coord.col >= cfg.maxColumns || coord.row >= cfg.maxRows) continue;
        let v = options.trimWhitespace !== false ? vals[ci].trim() : vals[ci];
        if (v) this.sheet.setCell(coord, v);
      }
    }
  }

  _parseLine(line, delim) {
    const vals = []; let cur = '', inQ = false, i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i += 2; } else { inQ = !inQ; i++; } }
      else if (ch === delim && !inQ) { vals.push(cur); cur = ''; i++; }
      else { cur += ch; i++; }
    }
    vals.push(cur);
    return vals;
  }

  _exportDIF(options) {
    const range = options.range || this.sheet.getUsedRange();
    if (!range) return 'TABLE\n0,1\n""\nTUPLES\n0,0\n""\nDATA\n0,0\n""\nEOD\n';
    const nc = range.end.col - range.start.col + 1;
    const nr = range.end.row - range.start.row + 1;
    let s = `TABLE\n0,1\n"QUILLCALC"\nVECTORS\n0,${nc}\n""\nTUPLES\n0,${nr}\n""\nDATA\n0,0\n""\n`;
    for (let r = range.start.row; r <= range.end.row; r++) {
      s += '-1,0\nBOT\n';
      for (let c = range.start.col; c <= range.end.col; c++) {
        const cell = this.sheet.getCell({ col: c, row: r });
        if (cell.type === CellType.EMPTY) s += '1,0\n""\n';
        else if (typeof cell.value === 'number') s += `0,${cell.value}\nV\n`;
        else s += `1,0\n"${cell.value || ''}"\n`;
      }
    }
    return s + '-1,0\nEOD\n';
  }
}
