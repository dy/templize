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
    while (cur != end) (next = cur.nextSibling, remove(cur, parent), cur = next);
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
    this.#parts = parse(this);
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
const parse = (element, parts=[]) => {
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
    if (node.nodeType === ELEMENT) parse(node, parts);
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

let e,r,t,a,o,l,d,n=(a,o=(r=a,e=0,t=[],!(a=i())||r[e]?h():e=>a(e||{})))=>(o.args=t,o),f=e=>e>=48&&e<=57||e>=65&&e<=90||e>=97&&e<=122||36==e||95==e||e>=192&&215!=e&&247!=e,h=(t="Bad syntax",a=r[e])=>{throw SyntaxError(t+" `"+a+"` at "+e)},s=(t=1,a=e,o)=>{if("number"==typeof t)e+=t;else for(;t(r.charCodeAt(e));)e++;return r.slice(a,e)},i=(r=0,t,a,o,l,d)=>{for(;(a=c())&&(l=(d=u[a])&&d(o,r)||!o&&p());)o=l;return t&&(a==t?e++:h()),o},c=t=>{for(;(t=r.charCodeAt(e))<=32;)e++;return t},p=(e=s(f),r)=>e?(r=r=>r[e],t.push(e),r.id=()=>e,r):0,u=[],g=n.set=(t,a,o=32,l=t.charCodeAt(0),d=t.length,n=u[l],h=o.length||([o,a]=[a,o],0),s=t.toUpperCase()!==t,c=(h>1?(e,r)=>e&&(r=i(a))&&(e.length||r.length?t=>o(e(t),r(t),e.id?.(t),r.id?.(t)):(e=o(e(),r()),()=>e)):h?e=>!e&&(e=i(a-1))&&(r=>o(e(r))):o))=>u[l]=(o,l,h=e)=>l<a&&(d<2||r.substr(e,d)==t)&&(!s||!f(r.charCodeAt(e+d)))&&(e+=d,c(o,l))||(e=h,n&&n(o,l)),C=e=>e>=48&&e<=57,A=t=>(t&&h("Unexpected number"),t=s((e=>46==e||C(e))),(69==r.charCodeAt(e)||101==r.charCodeAt(e))&&(t+=s(2)+s(C)),(t=+t)!=t?h("Bad number"):()=>t),x=(e,r)=>t=>r(e.of?e.of(t):t,e.id(t));for(o=48;o<=57;)u[o++]=A;for(a=['"',e=>(e=e?h("Unexpected string"):s((e=>e-34)),s()||h("Bad string"),()=>e),,".",(e,r)=>(c(),r=s(f)||h(),d=t=>e(t)[r],d.id=()=>r,d.of=e,d),18,".",e=>!e&&A(s(-1)),,"[",(e,r,t)=>e&&(r=i(0,93)||h(),(t=t=>e(t)[r(t)]).id=r,t.of=e,t),18,"(",(e,r,t)=>(r=i(0,41),e?t=>e(t).apply(e.of?.(t),r?r.all?r.all(t):[r(t)]:[]):r||h()),18,",",(e,r,t=i(1))=>(t.all=e.all?r=>[...e.all(r),t(r)]:r=>[e(r),t(r)],t),1,"|",6,(e,r)=>e|r,"||",4,(e,r)=>e||r,"&",8,(e,r)=>e&r,"&&",5,(e,r)=>e&&r,"^",7,(e,r)=>e^r,"==",9,(e,r)=>e==r,"!=",9,(e,r)=>e!=r,">",10,(e,r)=>e>r,">=",10,(e,r)=>e>=r,">>",11,(e,r)=>e>>r,">>>",11,(e,r)=>e>>>r,"<",10,(e,r)=>e<r,"<=",10,(e,r)=>e<=r,"<<",11,(e,r)=>e<<r,"+",12,(e,r)=>e+r,"+",15,e=>+e,"++",e=>x(e||i(14),e?(e,r)=>e[r]++:(e,r)=>++e[r]),15,"-",12,(e,r)=>e-r,"-",15,e=>-e,"--",e=>x(e||i(14),e?(e,r)=>e[r]--:(e,r)=>--e[r]),15,"!",15,e=>!e,"*",13,(e,r)=>e*r,"/",13,(e,r)=>e/r,"%",13,(e,r)=>e%r];[o,l,d,...a]=a,o;)g(o,l,d);

Symbol.observable||=Symbol("observable");const observable=e=>e&&!!(e[Symbol.observable]||e[Symbol.asyncIterator]||e.call&&e.set||e.subscribe||e.then);var sube = (e,b,r,o,s)=>e&&(e.subscribe?.(b,r,o)||e[Symbol.observable]?.().subscribe?.(b,r,o)||e.set&&e.call?.(s,(e=>{try{b(e);}catch(e){r?.(e);}}))||(e.then?.((e=>(!s&&b(e),o?.())),r)||(async t=>{try{for await(e of e){if(s)return;b(e);}o?.();}catch(e){r?.(e);}})())&&(e=>s=1));

// extend default subscript
// ?:
n.set(':', 3.1, (a,b) => [a,b]);
n.set('?', 3, (a,b) => a ? b[0] : b[1]);

// literals
n.set('true', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>true });
n.set('false', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>false });

// a?.b - optional chain operator
n.set('?.',18, (a,b,aid,bid) => a?.[bid]);

// a | b - pipe overload
n.set('|', 6, (a,b) => b(a));

// expressions processor
const _state = Symbol('params'), _init = Symbol('init');

Symbol.dispose||=Symbol('dispose');

var processor = {
  createCallback(el, parts, state) {
    el[_state] = state;

    for (const part of parts) (part.evaluate = n(part.expression));

    // we have to convert reactive state values into real ones
    let unsub = [], source;

    for (const k in state) if (observable(source = state[k])) {
      state[k] = '',
      unsub.push(sube(source, v => (
          this.processCallback(el, parts, {[k]: v})
        )
      ));
    }

    // provide disposal
    const dispose = el[Symbol.dispose];
    el[Symbol.dispose] = () => (unsub.map(fn=>fn()), dispose?.());

    el[_init] = true;
  },

  processCallback(el, parts, state) {
    // reactive parts can update only fraction of state
    // we also allow modifying state during the init stage, but apply parts only after init
    Object.assign(el[_state], state);
    if (!el[_init]) return
    for (const part of parts) part.value = part.evaluate(el[_state]);
  }
};

var index = (node, params, proc=processor) => {
(params ||= {})[Symbol.dispose] = node[Symbol.dispose];

  let parts = parse(node),
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

  proc.createCallback?.(node, parts, params);
  proc.processCallback(node, parts, params);

  return new Proxy(params,  {
    set: (state, k, v) => (state[k] = v, update(), 1),
    deleteProperty: (state,k) => (delete state[k], update())
  })
};

export { AttributeTemplatePart, NodeTemplatePart, TemplateInstance, TemplatePart, index as default, processor };
