// ============================================================
//  QuillCalc — Formula Evaluator with @functions
// ============================================================

const builtInFunctions = new Map();

function _flat(args) {
  const out = [];
  for (const a of args) {
    if (Array.isArray(a)) for (const v of a) out.push(v);
    else out.push(a);
  }
  return out;
}

builtInFunctions.set('@SUM', (args) => _flat(args).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0));
builtInFunctions.set('@AVERAGE', (args) => {
  let s = 0, c = 0;
  for (const v of _flat(args)) if (typeof v === 'number') { s += v; c++; }
  return c > 0 ? s / c : 0;
});
builtInFunctions.set('@COUNT', (args) => { let c = 0; for (const v of _flat(args)) if (typeof v === 'number') c++; return c; });
builtInFunctions.set('@MIN', (args) => { const n = _flat(args).filter(v => typeof v === 'number'); return n.length ? Math.min(...n) : 0; });
builtInFunctions.set('@MAX', (args) => { const n = _flat(args).filter(v => typeof v === 'number'); return n.length ? Math.max(...n) : 0; });
builtInFunctions.set('@IF', (args) => {
  if (args.length !== 3) throw new Error('@IF requires exactly 3 arguments');
  return (typeof args[0] === 'number' ? args[0] !== 0 : !!args[0]) ? args[1] : args[2];
});
builtInFunctions.set('@SQRT', (args) => { if (args.length !== 1 || typeof args[0] !== 'number') throw new Error('@SQRT requires 1 numeric argument'); if (args[0] < 0) throw new Error('@SQRT: negative argument'); return Math.sqrt(args[0]); });
builtInFunctions.set('@ABS',  (args) => { if (args.length !== 1 || typeof args[0] !== 'number') throw new Error('@ABS requires 1 numeric argument'); return Math.abs(args[0]); });
builtInFunctions.set('@INT',  (args) => { if (args.length !== 1 || typeof args[0] !== 'number') throw new Error('@INT requires 1 numeric argument'); return Math.floor(args[0]); });
builtInFunctions.set('@SIN',  (args) => { if (args.length !== 1 || typeof args[0] !== 'number') throw new Error('@SIN requires 1 numeric argument'); return Math.sin(args[0]); });
builtInFunctions.set('@COS',  (args) => { if (args.length !== 1 || typeof args[0] !== 'number') throw new Error('@COS requires 1 numeric argument'); return Math.cos(args[0]); });
builtInFunctions.set('@TAN',  (args) => { if (args.length !== 1 || typeof args[0] !== 'number') throw new Error('@TAN requires 1 numeric argument'); return Math.tan(args[0]); });
builtInFunctions.set('@ATN',  (args) => { if (args.length !== 1 || typeof args[0] !== 'number') throw new Error('@ATN requires 1 numeric argument'); return Math.atan(args[0]); });
builtInFunctions.set('@EXP',  (args) => { if (args.length !== 1 || typeof args[0] !== 'number') throw new Error('@EXP requires 1 numeric argument'); return Math.exp(args[0]); });
builtInFunctions.set('@LN',   (args) => { if (args.length !== 1 || typeof args[0] !== 'number') throw new Error('@LN requires 1 numeric argument'); if (args[0] <= 0) throw new Error('@LN: non-positive'); return Math.log(args[0]); });
builtInFunctions.set('@LOG10',(args) => { if (args.length !== 1 || typeof args[0] !== 'number') throw new Error('@LOG10 requires 1 numeric argument'); if (args[0] <= 0) throw new Error('@LOG10: non-positive'); return Math.log10(args[0]); });
builtInFunctions.set('@PI',   (args) => Math.PI);
builtInFunctions.set('@NPV',  (args) => {
  if (args.length < 2) throw new Error('@NPV requires at least 2 arguments');
  const rate = args[0]; let npv = 0, period = 1;
  for (let i = 1; i < args.length; i++) {
    const v = args[i];
    if (Array.isArray(v)) { v.forEach(x => { if (typeof x === 'number') { npv += x / Math.pow(1 + rate, period); period++; } }); }
    else if (typeof v === 'number') { npv += v / Math.pow(1 + rate, period); period++; }
  }
  return npv;
});
builtInFunctions.set('@LOOKUP', (args) => {
  if (args.length !== 2) throw new Error('@LOOKUP requires 2 arguments');
  const lv = args[0], range = args[1];
  if (!Array.isArray(range)) throw new Error('@LOOKUP: second argument must be a range');
  let last = null;
  for (const v of range) { if (typeof v === 'number' && typeof lv === 'number') { if (v <= lv) last = v; else break; } }
  return last !== null ? last : 0;
});
builtInFunctions.set('@CHOOSE', (args) => {
  if (args.length < 2) throw new Error('@CHOOSE requires at least 2 arguments');
  const idx = Math.floor(args[0]);
  if (idx < 1 || idx >= args.length) throw new Error('@CHOOSE: index out of range');
  return args[idx];
});
builtInFunctions.set('@NA',    () => { throw new Error('#NA!'); });
builtInFunctions.set('@ERROR', () => { throw new Error('#ERROR!'); });
builtInFunctions.set('@TRUE',  () => 1);
builtInFunctions.set('@FALSE', () => 0);

function evaluate(node, ctx) {
  switch (node.type) {
    case ASTNodeType.NUMBER: return node.value;
    case ASTNodeType.STRING: return node.value;
    case ASTNodeType.CELL_REF: return ctx.getCellValue(node.coordinate);
    case ASTNodeType.CELL_RANGE: return getCellsInRange(node.range).map(c => ctx.getCellValue(c));
    case ASTNodeType.BINARY_OP: {
      const L = evaluate(node.left, ctx);
      const R = evaluate(node.right, ctx);
      if (node.operator === TokenType.PLUS && (typeof L === 'string' || typeof R === 'string')) return String(L) + String(R);
      const l = typeof L === 'number' ? L : parseFloat(L) || 0;
      const r = typeof R === 'number' ? R : parseFloat(R) || 0;
      switch (node.operator) {
        case TokenType.PLUS:          return l + r;
        case TokenType.MINUS:         return l - r;
        case TokenType.MULTIPLY:      return l * r;
        case TokenType.DIVIDE:        if (r === 0) throw new Error('Division by zero'); return l / r;
        case TokenType.POWER:         return Math.pow(l, r);
        case TokenType.LESS_THAN:     return l < r ? 1 : 0;
        case TokenType.GREATER_THAN:  return l > r ? 1 : 0;
        case TokenType.EQUALS:        return l === r ? 1 : 0;
        case TokenType.LESS_EQUAL:    return l <= r ? 1 : 0;
        case TokenType.GREATER_EQUAL: return l >= r ? 1 : 0;
        case TokenType.NOT_EQUALS:    return l !== r ? 1 : 0;
        default: throw new Error('Unknown operator: ' + node.operator);
      }
    }
    case ASTNodeType.UNARY_OP: {
      const operand = evaluate(node.operand, ctx);
      const n = typeof operand === 'number' ? operand : parseFloat(operand) || 0;
      return node.operator === TokenType.MINUS ? -n : n;
    }
    case ASTNodeType.FUNCTION_CALL: {
      const name = node.name.toUpperCase();
      const handler = ctx.functions.get(name) || builtInFunctions.get(name);
      if (!handler) throw new Error('Unknown function: ' + name);
      const args = node.arguments.map(a => evaluate(a, ctx));
      return handler(args, ctx);
    }
    default: throw new Error('Unknown node type: ' + node.type);
  }
}

function evaluateFormula(formula, ctx) {
  const result = parseFormula(formula);
  if (result.error) throw new Error(result.error);
  if (!result.ast) throw new Error('Failed to parse formula');
  return evaluate(result.ast, ctx);
}

function createDefaultContext(getCellValue) {
  return { getCellValue, functions: new Map(builtInFunctions) };
}
