// ============================================================
//  QuillCalc — Formula Lexer
// ============================================================

class Lexer {
  constructor(input) {
    this.input = input.trim();
    this.pos = 0;
    this.cur = this.pos < this.input.length ? this.input[this.pos] : null;
  }
  advance() { this.pos++; this.cur = this.pos < this.input.length ? this.input[this.pos] : null; }
  peek()    { const n = this.pos + 1; return n < this.input.length ? this.input[n] : null; }
  skipWS()  { while (this.cur && /\s/.test(this.cur)) this.advance(); }

  readNumber() {
    const s = this.pos; let v = '';
    while (this.cur && /[0-9]/.test(this.cur)) { v += this.cur; this.advance(); }
    if (this.cur === '.') { v += this.cur; this.advance(); while (this.cur && /[0-9]/.test(this.cur)) { v += this.cur; this.advance(); } }
    return { type: TokenType.NUMBER, value: v, position: s };
  }

  readString() {
    const s = this.pos; const q = this.cur; let v = '';
    this.advance();
    while (this.cur && this.cur !== q) {
      if (this.cur === '\\' && this.peek() === q) { this.advance(); v += q; this.advance(); }
      else { v += this.cur; this.advance(); }
    }
    if (this.cur === q) this.advance();
    else throw new Error('Unclosed string at position ' + s);
    return { type: TokenType.STRING, value: v, position: s };
  }

  readIdentifier() {
    const s = this.pos; let v = '';
    while (this.cur && /[A-Z]/i.test(this.cur)) { v += this.cur.toUpperCase(); this.advance(); }
    if (this.cur && /[0-9]/.test(this.cur)) {
      while (this.cur && /[0-9]/.test(this.cur)) { v += this.cur; this.advance(); }
      if (this.cur === ':') {
        const cp = this.pos; this.advance();
        let er = '';
        while (this.cur && /[A-Z]/i.test(this.cur)) { er += this.cur.toUpperCase(); this.advance(); }
        while (this.cur && /[0-9]/.test(this.cur)) { er += this.cur; this.advance(); }
        if (er) return { type: TokenType.CELL_RANGE, value: v + ':' + er, position: s };
        this.pos = cp; this.cur = ':';
        return { type: TokenType.CELL_REF, value: v, position: s };
      }
      return { type: TokenType.CELL_REF, value: v, position: s };
    }
    return { type: TokenType.FUNCTION, value: v, position: s };
  }

  nextToken() {
    this.skipWS();
    if (!this.cur) return { type: TokenType.EOF, value: '', position: this.pos };
    const p = this.pos;
    if (/[0-9]/.test(this.cur)) return this.readNumber();
    if (this.cur === '"' || this.cur === "'") return this.readString();
    if (/[A-Z]/i.test(this.cur)) return this.readIdentifier();
    if (this.cur === '@') { const s = this.pos; this.advance(); const t = this.readIdentifier(); t.value = '@' + t.value; t.position = s; return t; }
    const ch = this.cur; this.advance();
    switch (ch) {
      case '+': return { type: TokenType.PLUS, value: ch, position: p };
      case '-': return { type: TokenType.MINUS, value: ch, position: p };
      case '*': return { type: TokenType.MULTIPLY, value: ch, position: p };
      case '/': return { type: TokenType.DIVIDE, value: ch, position: p };
      case '^': return { type: TokenType.POWER, value: ch, position: p };
      case '(': return { type: TokenType.LEFT_PAREN, value: ch, position: p };
      case ')': return { type: TokenType.RIGHT_PAREN, value: ch, position: p };
      case ',': return { type: TokenType.COMMA, value: ch, position: p };
      case ':': return { type: TokenType.COLON, value: ch, position: p };
      case '=': return { type: TokenType.EQUALS, value: ch, position: p };
      case '<':
        if (this.cur === '=') { this.advance(); return { type: TokenType.LESS_EQUAL, value: '<=', position: p }; }
        if (this.cur === '>') { this.advance(); return { type: TokenType.NOT_EQUALS, value: '<>', position: p }; }
        return { type: TokenType.LESS_THAN, value: ch, position: p };
      case '>':
        if (this.cur === '=') { this.advance(); return { type: TokenType.GREATER_EQUAL, value: '>=', position: p }; }
        return { type: TokenType.GREATER_THAN, value: ch, position: p };
      default: throw new Error('Unexpected character: ' + ch + ' at position ' + p);
    }
  }

  tokenize() {
    const tokens = [];
    let t = this.nextToken();
    while (t.type !== TokenType.EOF) { tokens.push(t); t = this.nextToken(); }
    tokens.push(t);
    return tokens;
  }
}
