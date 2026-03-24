// ============================================================
//  QuillCalc — Constants and Enums
// ============================================================

'use strict';

const MAX_COLS = 63;   // A–BK
const MAX_ROWS = 254;  // 1–254
const COL_WIDTH = 9;   // default column width in characters

const CellType = {
  EMPTY:   'EMPTY',
  LABEL:   'LABEL',
  VALUE:   'VALUE',
  FORMULA: 'FORMULA',
};

const CellFormat = {
  GENERAL:  'GENERAL',
  INTEGER:  'INTEGER',
  CURRENCY: 'CURRENCY',
  GRAPH:    'GRAPH',
};

const CellAlignment = {
  DEFAULT: 'DEFAULT',
  LEFT:    'LEFT',
  RIGHT:   'RIGHT',
  CENTER:  'CENTER',
};

const TokenType = {
  NUMBER:        'NUMBER',
  STRING:        'STRING',
  CELL_REF:      'CELL_REF',
  CELL_RANGE:    'CELL_RANGE',
  PLUS:          'PLUS',
  MINUS:         'MINUS',
  MULTIPLY:      'MULTIPLY',
  DIVIDE:        'DIVIDE',
  POWER:         'POWER',
  LESS_THAN:     'LESS_THAN',
  GREATER_THAN:  'GREATER_THAN',
  EQUALS:        'EQUALS',
  LESS_EQUAL:    'LESS_EQUAL',
  GREATER_EQUAL: 'GREATER_EQUAL',
  NOT_EQUALS:    'NOT_EQUALS',
  FUNCTION:      'FUNCTION',
  LEFT_PAREN:    'LEFT_PAREN',
  RIGHT_PAREN:   'RIGHT_PAREN',
  COMMA:         'COMMA',
  COLON:         'COLON',
  EOF:           'EOF',
};

const ASTNodeType = {
  NUMBER:        'NUMBER',
  STRING:        'STRING',
  CELL_REF:      'CELL_REF',
  CELL_RANGE:    'CELL_RANGE',
  BINARY_OP:     'BINARY_OP',
  UNARY_OP:      'UNARY_OP',
  FUNCTION_CALL: 'FUNCTION_CALL',
};

const CalculationMode = {
  AUTOMATIC: 'AUTOMATIC',
  MANUAL:    'MANUAL',
};

const CellError = {
  CIRCULAR_REF: '#CIRCULAR!',
  DIV_ZERO:     '#DIV/0!',
  VALUE:        '#VALUE!',
  REF:          '#REF!',
  NAME:         '#NAME?',
  NUM:          '#NUM!',
  NA:           '#N/A',
  ERROR:        '#ERROR!',
};

const SheetEventType = {
  CELL_CHANGED:          'CELL_CHANGED',
  RANGE_CHANGED:         'RANGE_CHANGED',
  COLUMN_WIDTH_CHANGED:  'COLUMN_WIDTH_CHANGED',
  CALCULATION_STARTED:   'CALCULATION_STARTED',
  CALCULATION_COMPLETED: 'CALCULATION_COMPLETED',
  SHEET_CLEARED:         'SHEET_CLEARED',
  UNDO_PERFORMED:        'UNDO_PERFORMED',
  REDO_PERFORMED:        'REDO_PERFORMED',
};

const OperationType = {
  SET_CELL:          'SET_CELL',
  DELETE_CELL:       'DELETE_CELL',
  CLEAR_RANGE:       'CLEAR_RANGE',
  COPY_RANGE:        'COPY_RANGE',
  MOVE_RANGE:        'MOVE_RANGE',
  SET_COLUMN_WIDTH:  'SET_COLUMN_WIDTH',
  SET_FORMAT:        'SET_FORMAT',
  BATCH:             'BATCH',
};

const FileFormat = {
  QUILLCALC: 'QUILLCALC',
  CSV:       'CSV',
  TSV:       'TSV',
  DIF:       'DIF',
};
