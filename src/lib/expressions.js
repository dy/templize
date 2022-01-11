// custom expressions parser
// need it due to following:
// - literals
// - safe-path a.b.c
// - a,b in c for loops
// - ternary
// - ?? operator?
// - custom pipe operator

import {parse, set, lookup, skip, cur, idx, err, expr, isId, args, space} from './subscript.js'

const PERIOD=46, OPAREN=40, CPAREN=41, OBRACK=91, CBRACK=93, SPACE=32, DQUOTE=34, QUOTE=39, _0=48, _9=57,
PREC_SEQ=1, PREC_SOME=4, PREC_EVERY=5, PREC_OR=6, PREC_XOR=7, PREC_AND=8,
PREC_EQ=9, PREC_COMP=10, PREC_SHIFT=11, PREC_SUM=12, PREC_MULT=13, PREC_UNARY=15, PREC_POSTFIX=16, PREC_CALL=18, PREC_GROUP=19, PREC_EXP=14

let u, list, op, prec, fn,
    isNum = c => c>=_0 && c<=_9,
    // 1.2e+3, .5
    num = n => (
      n&&err('Unexpected number'),
      n = skip(c=>c == PERIOD || isNum(c)),
      (cur.charCodeAt(idx) == 69 || cur.charCodeAt(idx) == 101) && (n += skip(2) + skip(isNum)),
      n=+n, n!=n ? err('Bad number') : () => n // 0 args means token is static
    ),

    inc = (a,fn,c=a.of) => ctx => fn(c?c(ctx):ctx, a.id()),

    escape = {n:'\n', r:'\r', t:'\t', b:'\b', f:'\f', v:'\v'},
    string = q => (qc, c, str='') => {
      qc&&err('Unexpected string') // must not follow another token
      while (c=cur.charCodeAt(idx), c-q) {
        if (c === BSLASH) skip(), c=skip(), str += escape[c] || c
        else str += skip()
      }
      return skip()||err('Bad string'), () => str
    }

// numbers
for (op=_0;op<=_9;) lookup[op++] = num


// operators
for (list=[
  // "' with /
  '"', string(DQUOTE),,
  "'", string(QUOTE),,

  // a.b, .2, 1.2 parser in one
  '.', (a,id,fn) => !a ? num(skip(-1)) : // FIXME: .123 is not operator, so we skip back, but mb reorganizing num would be better
    (space(), id=skip(isId)||err(), fn=ctx=>a(ctx)?.[id], fn.id=()=>id, fn.of=a, fn), PREC_CALL,

  // a[b]
  '[', (a,b,fn) => a && (b=expr(0,CBRACK)||err(), fn=ctx=>a(ctx)[b(ctx)], fn.id=b, fn.of=a, fn), PREC_CALL,

  // a(), a(b), (a,b), (a+b)
  '(', (a,b,fn) => (
    b=expr(0,CPAREN),
    // a(), a(b), a(b,c,d)
    a ? ctx => a(ctx).apply(a.of?.(ctx), b ? b.all ? b.all(ctx) : [b(ctx)] : []) :
    // (a+b)
    b || err()
  ), PREC_CALL,

  // [a,b,c] or (a,b,c)
  ',', (a,prec,b=expr(PREC_SEQ)) => (
    b.all = a.all ? ctx => [...a.all(ctx), b(ctx)] : ctx => [a(ctx),b(ctx)],
    b
  ), PREC_SEQ,

  '|', PREC_OR, (a,b)=>a|b,
  '||', PREC_SOME, (a,b)=>a||b,

  '&', PREC_AND, (a,b)=>a&b,
  '&&', PREC_EVERY, (a,b)=>a&&b,

  '^', PREC_XOR, (a,b)=>a^b,

  // ==, !=
  '==', PREC_EQ, (a,b)=>a==b,
  '!=', PREC_EQ, (a,b)=>a!=b,

  // > >= >> >>>, < <= <<
  '>', PREC_COMP, (a,b)=>a>b,
  '>=', PREC_COMP, (a,b)=>a>=b,
  '>>', PREC_SHIFT, (a,b)=>a>>b,
  '>>>', PREC_SHIFT, (a,b)=>a>>>b,
  '<', PREC_COMP, (a,b)=>a<b,
  '<=', PREC_COMP, (a,b)=>a<=b,
  '<<', PREC_SHIFT, (a,b)=>a<<b,

  // + ++ - --
  '+', PREC_SUM, (a,b)=>a+b,
  '+', PREC_UNARY, (a)=>+a,
  '++', a => inc(a||expr(PREC_UNARY-1), a ? (a,b)=>a[b]++ : (a,b)=>++a[b]), PREC_UNARY,

  '-', PREC_SUM, (a,b)=>a-b,
  '-', PREC_UNARY, (a)=>-a,
  '--', a => inc(a||expr(PREC_UNARY-1), a ? (a,b)=>a[b]-- : (a,b)=>--a[b]), PREC_UNARY,

  // ! ~
  '!', PREC_UNARY, (a)=>!a,

  // * / %
  '*', PREC_MULT, (a,b)=>a*b,
  '/', PREC_MULT, (a,b)=>a/b,
  '%', PREC_MULT, (a,b)=>a%b,

  // ?:
  ':', 3.1, (a,b) => [a,b],
  '?', 3, (a,b) => a ? b[0] : b[1],

  // operators
  '===', PREC_EQ, (a,b) => a===b,
  '!==', PREC_EQ, (a,b) => a!==b,
  '~', PREC_UNARY, (a) => ~a,

  // right order
  '**', (a,prec,b=expr(PREC_EXP-1)) => ctx=>a(ctx)**b(ctx), PREC_EXP,

  // literals
  'null', a => a ? err('Unexpected literal') : ()=>null,,
  'true', a => a ? err('Unexpected literal') : ()=>true,,
  'false', a => a ? err('Unexpected literal') : ()=>false,,
  'undefined', a => a ? err('Unexpected literal') : ()=>undefined,,

  // FIXME: in operator
  'in', PREC_COMP, (a,b) => a in b,
]; [op,prec,fn,...list]=list, op;) set(op,prec,fn)

export default parse
