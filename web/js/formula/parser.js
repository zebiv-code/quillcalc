// ============================================================
//  QuillCalc — Formula Parser
// ============================================================

class Parser {
  constructor(input) {
    this.lexerError = null;
    try {
      const lex = new Lexer(input);
      this.tokens = lex.tokenize();
    } catch (e) {
      this.tokens = [{ type: TokenType.EOF, value: '', position: 0 }];
      this.lexerError = e.message || String(e);
    }
    this.pos = 0;
    this.cur = this.tokens[0];
    this.deps = new Set();
  }

  parse() {
    if (this.lexerError) return { ast: null, error: this.lexerError, dependencies: this.deps };
    try {
      const ast = this.expression();
      if (this.cur.type !== TokenType.EOF) throw new Error('Unexpected token: ' + this.cur.value);
      return { ast, error: null, dependencies: this.deps };
    } catch (e) {
      return { ast: null, error: e.message || String(e), dependencies: this.deps };
    }
  }

  advance() { if (this.pos < this.tokens.length - 1) { this.pos++; this.cur = this.tokens[this.pos]; } }
  match(t) { return this.cur.type === t; }
  consume(t, msg) {
    if (!this.match(t)) throw new Error(msg);
    const tok = this.cur; this.advance(); return tok;
  }

  expression() { return this.comparison(); }

  comparison() {
    let left = this.additive();
    while (this.match(TokenType.LESS_THAN) || this.match(TokenType.GREATER_THAN) || this.match(TokenType.EQUALS) ||
           this.match(TokenType.LESS_EQUAL) || this.match(TokenType.GREATER_EQUAL) || this.match(TokenType.NOT_EQUALS)) {
      const op = this.cur.type; this.advance();
      left = { type: ASTNodeType.BINARY_OP, operator: op, left, right: this.additive() };
    }
    return left;
  }

  additive() {
    let left = this.multiplicative();
    while (this.match(TokenType.PLUS) || this.match(TokenType.MINUS)) {
      const op = this.cur.type; this.advance();
      left = { type: ASTNodeType.BINARY_OP, operator: op, left, right: this.multiplicative() };
    }
    return left;
  }

  multiplicative() {
    let left = this.power();
    while (this.match(TokenType.MULTIPLY) || this.match(TokenType.DIVIDE)) {
      const op = this.cur.type; this.advance();
      left = { type: ASTNodeType.BINARY_OP, operator: op, left, right: this.power() };
    }
    return left;
  }

  power() {
    let left = this.unary();
    if (this.match(TokenType.POWER)) {
      const op = this.cur.type; this.advance();
      left = { type: ASTNodeType.BINARY_OP, operator: op, left, right: this.power() };
    }
    return left;
  }

  unary() {
    if (this.match(TokenType.MINUS) || this.match(TokenType.PLUS)) {
      const op = this.cur.type; this.advance();
      return { type: ASTNodeType.UNARY_OP, operator: op, operand: this.unary() };
    }
    return this.primary();
  }

  primary() {
    if (this.match(TokenType.NUMBER)) {
      const v = parseFloat(this.cur.value); this.advance();
      return { type: ASTNodeType.NUMBER, value: v };
    }
    if (this.match(TokenType.STRING)) {
      const v = this.cur.value; this.advance();
      return { type: ASTNodeType.STRING, value: v };
    }
    if (this.match(TokenType.CELL_REF)) {
      const ref = this.cur.value; this.deps.add(ref);
      const coord = parseReference(ref); this.advance();
      return { type: ASTNodeType.CELL_REF, reference: ref, coordinate: coord };
    }
    if (this.match(TokenType.CELL_RANGE)) {
      const rs = this.cur.value;
      const parts = rs.split(':');
      this.deps.add(parts[0]); this.deps.add(parts[1]);
      const range = parseRange(rs); this.advance();
      return { type: ASTNodeType.CELL_RANGE, range };
    }
    if (this.match(TokenType.FUNCTION)) return this.functionCall();
    if (this.match(TokenType.LEFT_PAREN)) {
      this.advance();
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, 'Expected closing parenthesis');
      return expr;
    }
    throw new Error('Unexpected token: ' + this.cur.value);
  }

  functionCall() {
    const name = this.cur.value; this.advance();
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after function name '" + name + "'");
    const args = [];
    if (!this.match(TokenType.RIGHT_PAREN)) {
      do { args.push(this.expression()); } while (this.match(TokenType.COMMA) && (this.advance(), true));
    }
    this.consume(TokenType.RIGHT_PAREN, 'Expected closing parenthesis after function arguments');
    return { type: ASTNodeType.FUNCTION_CALL, name, arguments: args };
  }
}

function parseFormula(formula) {
  return new Parser(formula).parse();
}
