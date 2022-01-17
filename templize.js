// inflate version of differ, ~260b
// + no sets / maps used
// + prepend/append/remove/clear short paths
// + a can be live childNodes/HTMLCollection

const swap = (parent, a, b, end = null) => {
  let i = 0, cur, next, bi, n = b.length, m = a.length, { remove, same, insert, replace } = swap;

  // skip head/tail
  while (i < n && i < m && same(a[i], b[i])) i++;
  while (i < n && i < m && same(b[n-1], a[m-1])) end = b[--m, --n];

  // append/prepend/trim shortcuts
  if (i == m) while (i < n) insert(end, b[i++], parent);
  // FIXME: can't use shortcut for childNodes as input
  // if (i == n) while (i < m) parent.removeChild(a[i++])

  else {
    cur = a[i];

    while (i < n) {
      bi = b[i++], next = cur ? cur.nextSibling : end;

      // skip
      if (same(cur, bi)) cur = next;

      // swap / replace
      else if (i < n && same(b[i], next)) (replace(cur, bi, parent), cur = next);

      // insert
      else insert(cur, bi, parent);
    }

    // remove tail
    while (!same(cur, end)) (next = cur.nextSibling, remove(cur, parent), cur = next);
  }

  return b
};

swap.same = (a,b) => a == b;
swap.replace = (a,b, parent) => parent.replaceChild(b, a);
swap.insert = (a,b, parent) => parent.insertBefore(b, a);
swap.remove = (a, parent) => parent.removeChild(a);

// minimal Template Instance API surface

const values = {
  processCallback(instance, parts, state) {
    if (!state) return
    for (const part of parts) if (part.expression in state) part.value = state[part.expression];
  }
};

class TemplateInstance extends DocumentFragment {
  #parts
  #processor
  constructor(template, params, processor=values) {
    super();
    this.appendChild(template.content.cloneNode(true));
    this.#parts = parse$1(this);
    this.#processor = processor;
    params ||= {};
    processor.createCallback?.(this, this.#parts, params);
    processor.processCallback(this, this.#parts, params);
  }
  update(params) { this.#processor.processCallback(this, this.#parts, params); }
}

class TemplatePart {
  constructor(setter, expr) { this.setter = setter, this.expression = expr; }
  toString() { return this.value; }
}

class AttributeTemplatePart extends TemplatePart {
  #value = '';
  get attributeName() { return this.setter.attr.name; }
  get attributeNamespace() { return this.setter.attr.namespaceURI; }
  get element() { return this.setter.element; }
  get value() { return this.#value; }
  set value(newValue) {
    if (this.#value === newValue) return // save unnecessary call
    this.#value = newValue;
    const { attr, element, parts } = this.setter;
    if (parts.length === 1) { // fully templatized
      if (newValue == null) element.removeAttributeNS(attr.namespaceURI, attr.name);
      else element.setAttributeNS(attr.namespaceURI, attr.name, newValue);
    } else element.setAttributeNS(attr.namespaceURI, attr.name, parts.join(''));
  }
  get booleanValue() {
    this.setter.element.hasAttribute(this.setter.attr.name);
  }
  set booleanValue(value) {
    if (this.setter.parts.length === 1) this.value = value ? '' : null;
    else throw new DOMException('Value is not fully templatized');
  }
}

class NodeTemplatePart extends TemplatePart {
  #nodes = [new Text]
  get replacementNodes() { return this.#nodes }
  get parentNode() { return this.setter.parentNode; }
  get nextSibling() { return this.#nodes[this.#nodes.length-1].nextSibling; }
  get previousSibling() { return this.#nodes[0].previousSibling; }
  // FIXME: not sure why do we need string serialization here
  get value() { return this.#nodes.map(node=>node.textContent).join(''); }
  set value(newValue) { this.replace(newValue); }
  replace(...nodes) { // replace current nodes with new nodes.
    nodes = nodes.length ? nodes.flatMap(node =>
      !node ? [new Text(node)] :
      node.forEach ? [...node] :
      node.nodeType ? [node] :
      [new Text(node)]
    ) : [new Text];
    this.#nodes = swap(this.parentNode, this.#nodes, nodes, this.nextSibling);
  }
  replaceHTML(html) {
    const fragment = this.parentNode.cloneNode();
    fragment.innerHTML = html;
    this.replace(fragment.childNodes);
  }
}

const ELEMENT = 1, TEXT = 3, COMMENT = 8, STRING = 0, PART = 1,
      mem = {};

// collect element parts
const parse$1 = (element, parts=[]) => {
  let attr, node, setter, type, value;

  for (attr of element.attributes || []) {
    if (attr.value.includes('{{')) {
      setter = { element, attr, parts: [] };
      for ([type, value] of tokenize(attr.value))
        if (!type) setter.parts.push(value);
        else value = new AttributeTemplatePart(setter, value), setter.parts.push(value), parts.push(value);
      attr.value = setter.parts.join('');
    }
  }

  for (node of element.childNodes) {
    if (node.nodeType === ELEMENT) parse$1(node, parts);
    else if (node.nodeType === TEXT || node.nodeType === COMMENT) if (node.data.includes('{{')) {
      setter = { parentNode: element, parts: [] };
      for ([type, value] of tokenize(node.data.trim()))
        if (!type) setter.parts.push(new Text(value));
        else value = new NodeTemplatePart(setter, value), setter.parts.push(value), parts.push(value);

      // AD-HOC: {{rows}}<table></table> → <table>{{ rows }}</table>
      // logic: for every empty node in a table there is meant to be part before the table.
      // NOTE: it doesn't cover all possible insertion cases, but the core ones.
      // TODO: it can be extended to detect on the moment of insertion, but it still won't be complete
      // removing for now
      // if ((table = node.nextSibling)?.tagName === 'TABLE') {
      //   slots = table.matches(':empty') ? [table] : table.querySelectorAll(tabular)
      //   for (lastParts = []; lastParts.length < slots.length && setter.parts[setter.parts.length - 1] instanceof NodeTemplatePart;)
      //     lastParts.push(setter.parts.pop())

      //   for (slot of slots) {
      //     if (lastParts.length)
      //       parts.pop(), setter.parts.pop(),
      //       slot.appendChild(new Text(`{{ ${ lastParts.pop().expression } }}`)),
      //       setter.parts.push(new Text) // we have to stub removed field to keep children count
      //   }
      // }

      node.replaceWith(...setter.parts.flatMap(part => part.replacementNodes || [part]));
    }
  }

  return parts
},

// parse string with template fields
tokenize = (text) => {
  let value = '', open = 0, tokens = mem[text], i = 0, c;

  if (tokens) return tokens; else tokens = [];

  for (; c=text[i]; i++) {
    if (c === '{' && text[i+1] === '{' && text[i-1] !== '\\' && text[i+2] && ++open==1) {
      if (value) tokens.push([STRING, value ]);
      value = '';
      i ++;
    }
    else if (c === '}' && text[i+1] === '}' && text[i-1] !== '\\' && !--open) {
      tokens.push([PART, value.trim() ]);
      value = '';
      i ++;
    }
    else value += text[i] || ''; // text[i] is undefined if i+=2 caught
  }
  if (value) tokens.push([STRING, value ]);

  return mem[text] = tokens
};

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
      ctx => fn(a(ctx),b(ctx),a.id?.(ctx),b.id?.(ctx))
    ) :
    // unary prefix (0 args)
    arity ? a => !a && (a=expr(opPrec-1)) && (ctx => fn(a(ctx))) :
    fn // custom parser
) =>
lookup[c] = (a, curPrec, from=idx) => curPrec<opPrec && (l<2||cur.substr(idx,l)==op) && (!word||!isId(cur.charCodeAt(idx+l))) && (idx+=l, map(a, curPrec)) || (idx=from, prev&&prev(a, curPrec));

const PERIOD=46, CPAREN=41, CBRACK=93, DQUOTE=34, _0=48, _9=57,
PREC_SEQ=1, PREC_SOME=4, PREC_EVERY=5, PREC_OR=6, PREC_XOR=7, PREC_AND=8,
PREC_EQ=9, PREC_COMP=10, PREC_SHIFT=11, PREC_SUM=12, PREC_MULT=13, PREC_UNARY=15, PREC_CALL=18;

let list, op, prec, fn,
    isNum = c => c>=_0 && c<=_9,
    // 1.2e+3, .5
    num = n => (
      n&&err('Unexpected number'),
      n = skip(c=>c == PERIOD || isNum(c)),
      (cur.charCodeAt(idx) == 69 || cur.charCodeAt(idx) == 101) && (n += skip(2) + skip(isNum)),
      n=+n, n!=n ? err('Bad number') : () => n // 0 args means token is static
    ),

    inc = (a,fn) => ctx => fn(a.of?a.of(ctx):ctx, a.id(ctx));

// numbers
for (op=_0;op<=_9;) lookup[op++] = num;

// operators
for (list=[
  // "a"
  '"', a => (a=a?err('Unexpected string'):skip(c => c-DQUOTE), skip()||err('Bad string'), ()=>a),,

  // a.b
  '.', (a,id) => (space(), id=skip(isId)||err(), fn=ctx=>a(ctx)[id], fn.id=()=>id, fn.of=a, fn), PREC_CALL,

  // .2
  // FIXME: .123 is not operator, so we skip back, but mb reorganizing num would be better
  '.', a => !a && num(skip(-1)),,

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
  ',', (a,prec,b=expr(PREC_SEQ),fn=ctx => (a(ctx), b(ctx))) => (
    b ? (fn.all = a.all ? ctx => [...a.all(ctx),b(ctx)] : ctx => [a(ctx),b(ctx)]) : err('Skipped argument',),
    fn
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
  '%', PREC_MULT, (a,b)=>a%b
]; [op,prec,fn,...list]=list, op;) set(op,prec,fn);

Symbol.observable||=Symbol('observable');

// is target observable
const observable = arg => arg && !!(
  arg[Symbol.observable] || arg[Symbol.asyncIterator] ||
  arg.call && arg.set ||
  arg.subscribe || arg.then
  // || arg.mutation && arg._state != null
);

// cleanup subscriptions
// ref: https://v8.dev/features/weak-references
// FIXME: maybe there's smarter way to unsubscribe in weakref
const registry$1 = new FinalizationRegistry(unsub => unsub.call?.()),

// create weak wrapped handler
weak = (fn, ref=new WeakRef(fn)) => e => ref.deref()?.(e);

// lil subscriby (v-less)
var sube = (target, next, error, complete, stop, unsub) => target && (
  next &&= weak(next), error &&= weak(error), complete &&= weak(complete),

  unsub = target.subscribe?.( next, error, complete ) ||
  target[Symbol.observable]?.().subscribe?.( next, error, complete ) ||
  target.set && target.call?.(stop, next) || // observ
  (
    target.then?.(v => (!stop && next(v), complete?.()), error) ||
    (async _ => {
      try {
        // FIXME: possible drawback: it will catch error happened in next, not only in iterator
        for await (target of target) { if (stop) return; next(target); }
        complete?.();
      } catch (err) { error?.(err); }
    })()
  ) && (_ => stop=1),

  // register autocleanup
  registry$1.register(next||error||complete, unsub),
  unsub
);

// auto-parse pkg in 2 lines (no object/array detection)
const prop = (el, k, v, desc) => (
  k = k.slice(0,2)==='on' ? k.toLowerCase() : k, // onClick → onclick
  // avoid readonly props https://jsperf.com/element-own-props-set/1
  el[k] !== v && (
    !(k in el.constructor.prototype) || !(desc = Object.getOwnPropertyDescriptor(el.constructor.prototype, k)) || desc.set
  ) && (el[k] = v),
  v === false || v == null ? el.removeAttribute(k) :
  typeof v !== 'function' && el.setAttribute(k,
    v === true ? '' :
    typeof v === 'number' || typeof v === 'string' ? v :
    k === 'class' && Array.isArray(v) ? v.filter(Boolean).join(' ') :
    k === 'style' && v.constructor === Object && (
      k=v, v=Object.values(v), Object.keys(k).map((k,i) => `${k}: ${v[i]};`).join(' ')
    )
  )
);

// TODO: extend subscript strings
// const escape = {n:'\n', r:'\r', t:'\t', b:'\b', f:'\f', v:'\v'},
//   string = q => (qc, c, str='') => {
//     qc && err('Unexpected string') // must not follow another token
//     while (c=cur.charCodeAt(idx), c-q) {
//       if (c === BSLASH) skip(), c=skip(), str += escape[c] || c
//       else str += skip()
//     }
//     return skip()||err('Bad string'), () => str
//   }
// parseExpr.set('"', string(34))
// parseExpr.set("'", string(39))

// extend default subscript
// ?:
parse.set(':', 3.1, (a,b) => [a,b]);
parse.set('?', 3, (a,b) => a ? b[0] : b[1]);

// literals
parse.set('true', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>true });
parse.set('false', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>false });

// a?.b - optional chain operator
parse.set('?.',18, (a,b,aid,bid) => a?.[bid]);

// a | b - pipe overload
parse.set('|', 6, (a,b) => b(a));

// expressions processor
const states = new WeakMap,
  registry = new FinalizationRegistry(([obs, k]) => (obs[k]?.(), delete obs[k]));

var processor = {
  createCallback(el, allParts, init) {
    if (states.get(el)) return

    let parts = {}, // parts by ids used in parts
        values = {}, // template values state
        observers = {}, // observable properties in state
        part, ready, value;

    // detect prop → part
    for (part of allParts) (part.evaluate = parse(part.expression)).args.map(arg => (parts[arg]||=[]).push(part));

    // hook up observables
    Object.keys(init).map((k, next) => {
      if (observable(value = init[k])) observers[k] = sube(
        value,
        next = v => (values[k] = v, ready && this.processCallback(el, parts[k], {[k]: v}))
      ),
      registry.register(next, [observers, k]);
      else values[k] = value;
    });

    // initial state inits all parts
    ready = true, states.set(el, [values, observers]);
  },

  // updates diff parts from current state
  processCallback(el, parts, state) {
    let [values, observers] = states.get(el), k, part, v;

    for (k in state) if (!observers[k]) values[k] = state[k]; // extend state ignoring reactive vals

    for (part of parts)
      if ((v = part.evaluate(values)) !== part.value) {
        // apply functional or other setters
        if (part.attributeName && part.setter.parts.length === 1) prop(part.element, part.attributeName, part.value = v);
        else part.value = v;
      }
  }
};

var index = (node, params, proc=processor) => {
  let parts = parse$1(node),
      planned,
      // throttled for batch update
      update = () => {
        if (!planned) {
          proc.processCallback(node, parts, params); // first set is immediate
          planned = Promise.resolve().then(() => (
            planned = null, proc.processCallback(node, parts, params)
          )); // rest is throttled
        }
      };

  params ||= {};

  proc.createCallback?.(node, parts, params);
  proc.processCallback(node, parts, params);

  return new Proxy(params,  {
    set: (state, k, v) => (state[k] = v, update(), 1),
    deleteProperty: (state,k) => (delete state[k], update())
  })
};

export { AttributeTemplatePart, NodeTemplatePart, TemplateInstance, TemplatePart, index as default, processor };
