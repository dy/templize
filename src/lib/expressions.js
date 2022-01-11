// custom expressions parser, extension of default subscript
// need it due to following:
// - literals
// - a,b in c for loops
// - ternary
// - overload pipe

import parse from './subscript.js'

// operators
for (let op, prec, fn, list=[
  // ?:
  ':', 3.1, (a,b) => [a,b],
  '?', 3, (a,b) => a ? b[0] : b[1],

  // operators
  // '===', PREC_EQ, (a,b) => a===b,
  // '!==', PREC_EQ, (a,b) => a!==b,
  // '~', PREC_UNARY, (a) => ~a,

  // literals
  'true', a => a ? Unexpected : ()=>true,,
  'false', a => a ? Unexpected : ()=>false,,
  // 'null', a => a ? Unexpected : ()=>null,,
  // 'undefined', a => a ? Unexpected : ()=>undefined,,

  // a?.b - optional chain operator
  '?.',18, (a,b,aid,bid) => a?.[bid],

  // FIXME: in operator
  // 'in', PREC_COMP, (a,b) => a in b,
]; [op,prec,fn,...list]=list, op;) parse.set(op,prec,fn)

export default parse
