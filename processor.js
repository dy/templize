// we have to build custom expression parser
const SPACE=32;

// current string, index and collected ids
let idx, cur, args,

// no handling tagged literals since easily done on user side with cache, if needed
parse = (s, fn= !(cur=s, idx=0, args=[], s=expr()) || cur[idx] ? err() : ctx=>s(ctx||{})) => (fn.args = args, fn),

isId = c =>
  (c >= 48 && c <= 57) || // 0..9
  (c >= 65 && c <= 90) || // A...Z
  (c >= 97 && c <= 122) || // a...z
  c == 36 || c == 95 || // $, _,
  (c >= 192 && c != 215 && c != 247), // any non-ASCII

err = (msg='Bad syntax',c=cur[idx]) => { throw SyntaxError(msg + ' `' + c + '` at ' + idx) },

skip = (is=1, from=idx, l) => {
  if (typeof is == 'number') idx += is;
  else while (is(cur.charCodeAt(idx))) idx++;
  return cur.slice(from, idx)
},

// a + b - c
expr = (prec=0, end, cc, token, newNode, fn) => {
  // chunk/token parser
  while (
    ( cc=space() ) && // till not end
    // FIXME: extra work is happening here, when lookup bails out due to lower precedence -
    // it makes extra `space` call for parent exprs on the same character to check precedence again
    ( newNode =
      (fn=lookup[cc]) && fn(token, prec) || // if operator with higher precedence isn't found
      (!token && id()) // parse literal or quit. token seqs are forbidden: `a b`, `a "b"`, `1.32 a`
    )
  ) token = newNode;

  // check end character
  // FIXME: can't show "Unclose paren", because can be unknown operator within group as well
  if (end) cc==end?idx++:err();

  return token
},

// skip space chars, return first non-space character
space = cc => { while ((cc = cur.charCodeAt(idx)) <= SPACE) idx++; return cc },

// variable identifier
id = (name=skip(isId), fn) => name ? (fn=ctx => ctx[name], args.push(name), fn.id=()=>name, fn) : 0,

// operator/token lookup table
lookup = [],

// create operator checker/mapper (see examples)
set = parse.set = (
  op,
  opPrec, fn=SPACE, // if opPrec & fn come in reverse order - consider them raw parse fn case, still precedence possible
  c=op.charCodeAt(0),
  l=op.length,
  prev=lookup[c],
  arity=fn.length || ([fn,opPrec]=[opPrec,fn], 0),
  word=op.toUpperCase()!==op, // make sure word boundary comes after word operator
  map=
    // binary
    arity>1 ? (a,b) => a && (b=expr(opPrec)) && (
      !a.length && !b.length ? (a=fn(a(),b()), ()=>a) : // static pre-eval like `"a"+"b"`
      ctx => fn(a(ctx),b(ctx))
    ) :
    // unary prefix (0 args)
    arity ? a => !a && (a=expr(opPrec-1)) && (ctx => fn(a(ctx))) :
    fn // custom parser
) =>
lookup[c] = (a, curPrec, from=idx) => curPrec<opPrec && (l<2||cur.substr(idx,l)==op) && (!word||!isId(cur.charCodeAt(idx+l))) && (idx+=l, map(a, curPrec)) || (idx=from, prev&&prev(a, curPrec));

// custom expressions parser

const PERIOD=46, CPAREN=41, CBRACK=93, DQUOTE=34, QUOTE=39, _0=48, _9=57,
PREC_SEQ=1, PREC_SOME=4, PREC_EVERY=5, PREC_OR=6, PREC_XOR=7, PREC_AND=8,
PREC_EQ=9, PREC_COMP=10, PREC_SHIFT=11, PREC_SUM=12, PREC_MULT=13, PREC_UNARY=15, PREC_CALL=18, PREC_EXP=14;

let list, op, prec, fn,
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
      qc&&err('Unexpected string'); // must not follow another token
      while (c=cur.charCodeAt(idx), c-q) {
        if (c === BSLASH) skip(), c=skip(), str += escape[c] || c;
        else str += skip();
      }
      return skip()||err('Bad string'), () => str
    };

// numbers
for (op=_0;op<=_9;) lookup[op++] = num;


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
]; [op,prec,fn,...list]=list, op;) set(op,prec,fn);

if (!Symbol.observable) Symbol.observable=Symbol('observable');

// observable utils
// FIXME: make an external dependency, shareable with spect/tmpl-parts
const sube = (target, next, stop) => (
  next.next = next,
  target && (
    target.subscribe?.( next ) ||
    target[Symbol.observable]?.().subscribe?.( next ) ||
    target.set && target.call?.(stop, next) || // observ
    (
      target.then?.(v => !stop && next(v)) ||
      (async _ => { for await (target of target) { if (stop) return; next(target); } })()
    ) && (_ => stop=1)
  )
),

observable = (arg) => arg && !!(
  arg[Symbol.observable] || arg[Symbol.asyncIterator] ||
  (arg.call && arg.set) ||
  arg.subscribe || arg.then
  // || arg.mutation && arg._state != null
);

// expression processor

const expressions = {
  createCallback(el, parts, state) {
    for (const part of parts) part.evaluate = parse(part.expression);
  },
  processCallback(el, parts, state) {
    for (const part of parts) part.value = part.evaluate(state);
  }
},

reactivity = {
  createCallback(el, parts, state, subs=[]) {
    // we have to convert reactive state values into real ones
    for (const k in state) if (observable(state[k])) subs.push(sube(state[k], v => state[k] = v)), state[k] = null;
  }
},

combine = (...processors) => ({
  createCallback: (a,b,c) => processors.map(p => p.createCallback?.(a,b,c)),
  processCallback: (a,b,c) => processors.map(p => p.processCallback?.(a,b,c))
});

export { combine, expressions, reactivity };
