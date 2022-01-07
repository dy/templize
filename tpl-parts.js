// parse string with template fields
const mem = {}, STRING = 0, PART = 1;
var parse = (text) => {
  let value = '', open = 0, tokens = mem[text], i = 0, c;

  if (tokens) return tokens; else tokens = [];

  for (; c=text[i]; i++) {
    if (c === '{' && text[i+1] === '{' && text[i-1] !== '\\' && text[i+2]) {
      if (++open===1) {
        if (value) tokens.push([STRING, value ]);
        value = '';
        i += 2;
      }
    }
    else if (c === '}' && text[i+1] === '}' && text[i-1] !== '\\') {
      if (!--open) {
        open = false;
        tokens.push([PART, value.trim() ]);
        value = '';
        i += 2;
      }
    }

    value += text[i] || ''; // text[i] is undefined if i+=2 caught
  }
  if (value) tokens.push([STRING, value ]);

  return mem[text] = tokens
};

// spect node differ
// any differ from https://github.com/luwes/js-diff-benchmark/tree/master/libs can be used
// Algo from proposal is slower than spect implementation
// spec ref: https://github.com/bennypowers/template-instantiation-polyfill/blob/main/concepts/applyNodeTemplatePartList.ts
// spect ref: https://github.com/spectjs/spect/blob/master/test/libs/spect-inflate.js
// FIXME: make external
var updateNodes = (parent, a, b, end = null) => {
  let i = 0, cur, next, bi, n = b.length, m = a.length;

  // skip head/tail
  while (i < n && i < m && a[i] == b[i]) i++;
  while (i < n && i < m && b[n-1] == a[m-1]) end = b[--m, --n];

  // append/prepend/trim shortcuts
  if (i == m) while (i < n) parent.insertBefore(b[i++], end);
  else {
    cur = a[i];
    while (i < n) {
      bi = b[i++], next = cur ? cur.nextSibling : end;
      if (cur == bi) cur = next; // skip
      else if (i < n && b[i] == next) (parent.replaceChild(bi, cur), cur = next); // swap / replace
      else parent.insertBefore(bi, cur); // insert
    }
    while (cur != end) (next = cur.nextSibling, parent.removeChild(cur), cur = next); // remove tail
  }

  return b
};

// minimal Template Instance API surface

class TemplateInstance extends DocumentFragment {
  #params
  constructor(template, params, processor) {
    super();
    this.appendChild(template.content.cloneNode(true));
    this.#params = Parts(this, params, processor);
  }
  update(params) { Object.assign(this.#params, params); }
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
      if (parts[0].value === null) element.removeAttributeNS(attr.namespaceURI, attr.name);
      else element.setAttributeNS(attr.namespaceURI, attr.name, newValue);
    } else element.setAttributeNS(attr.namespaceURI, attr.name, parts.join(''));
  }
  get booleanValue() {
    this.setter.element.hasAttribute(this.setter.attr.name);
  }
  set booleanValue(value) {
    if (this.setter.parts.length === 1) this.value = '';
    else throw new DOMException('Value is not fully templatized');
  }
}

class NodeTemplatePart extends TemplatePart {
  #nodes = [new Text]
  get replacementNodes() { return this.#nodes }
  get parentNode() { return this.setter.parentNode; }
  get nextSibling() { return this.#nodes[this.#nodes.length-1].nextSibling; }
  get previousSibling() { return this.#nodes[0].previousSibling; }
  get value() { return this.#nodes.map(node=>node.textContent).join(''); }
  set value(newValue) { this.replace(newValue); }
  replace(...nodes) { // replace current nodes with new nodes.
    nodes = nodes.length ? nodes.flatMap(node => node.forEach ? [...node] : node.trim ? [new Text(node)] : [node]) : [new Text];
    this.#nodes = updateNodes(this.parentNode, this.#nodes, nodes, this.nextSibling);
  }
  replaceHTML(html) {
    const fragment = this.parentNode.cloneNode();
    fragment.innerHTML = html;
    this.replace(fragment.childNodes);
  }
}

// common expression language
let e,r,t,a,o,l,d,n=(a,o=(r=a,e=0,t=[],!(a=c())||r[e]?h():e=>a(e||{})))=>(o.args=t,o),f=e=>e>=48&&e<=57||e>=65&&e<=90||e>=97&&e<=122||36==e||95==e||e>=192&&215!=e&&247!=e,h=(t="Bad syntax",a=r[e])=>{throw SyntaxError(t+" `"+a+"` at "+e)},s=(t=1,a=e,o)=>{if("number"==typeof t)e+=t;else for(;t(r.charCodeAt(e));)e++;return r.slice(a,e)},c=(r=0,t,a,o,l,d)=>{for(;(a=p())&&(l=(d=i[a])&&d(o,r)||!o&&u());)o=l;return t&&(a==t?e++:h()),o},p=t=>{for(;(t=r.charCodeAt(e))<=32;)e++;return t},u=(e=s(f),r)=>e?(r=r=>r[e],t.push(e),r.id=()=>e,r):0,i=[],g=n.set=(t,a,o=32,l=t.charCodeAt(0),d=t.length,n=i[l],h=o.length||([o,a]=[a,o],0),s=t.toUpperCase()!==t,p=(h>1?(e,r)=>e&&(r=c(a))&&(e.length||r.length?t=>o(e(t),r(t)):(e=o(e(),r()),()=>e)):h?e=>!e&&(e=c(a-1))&&(r=>o(e(r))):o))=>i[l]=(o,l,h=e)=>l<a&&(d<2||r.substr(e,d)==t)&&(!s||!f(r.charCodeAt(e+d)))&&(e+=d,p(o,l))||(e=h,n&&n(o,l)),C=e=>e>=48&&e<=57,A=t=>(t&&h("Unexpected number"),t=s((e=>46==e||C(e))),(69==r.charCodeAt(e)||101==r.charCodeAt(e))&&(t+=s(2)+s(C)),(t=+t)!=t?h("Bad number"):()=>t),x=(e,r,t=e.of)=>a=>r(t?t(a):a,e.id());for(o=48;o<=57;)i[o++]=A;for(a=['"',e=>(e=e?h("Unexpected string"):s((e=>e-34)),s()||h("Bad string"),()=>e),,".",(e,r,t)=>e?(p(),r=s(f)||h(),(t=t=>e(t)[r]).id=()=>r,t.of=e,t):A(s(-1)),18,"[",(e,r,t)=>e&&(r=c(0,93)||h(),(t=t=>e(t)[r(t)]).id=r,t.of=e,t),18,"(",(e,r,t)=>(r=c(0,41),e?t=>e(t).apply(e.of?.(t),r?r.all?r.all(t):[r(t)]:[]):r||h()),18,",",(e,r,t=c(1))=>(t.all=e.all?r=>[...e.all(r),t(r)]:r=>[e(r),t(r)],t),1,"|",6,(e,r)=>e|r,"||",4,(e,r)=>e||r,"&",8,(e,r)=>e&r,"&&",5,(e,r)=>e&&r,"^",7,(e,r)=>e^r,"==",9,(e,r)=>e==r,"!=",9,(e,r)=>e!=r,">",10,(e,r)=>e>r,">=",10,(e,r)=>e>=r,">>",11,(e,r)=>e>>r,">>>",11,(e,r)=>e>>>r,"<",10,(e,r)=>e<r,"<=",10,(e,r)=>e<=r,"<<",11,(e,r)=>e<<r,"+",12,(e,r)=>e+r,"+",15,e=>+e,"++",e=>x(e||c(14),e?(e,r)=>e[r]++:(e,r)=>++e[r]),15,"-",12,(e,r)=>e-r,"-",15,e=>-e,"--",e=>x(e||c(14),e?(e,r)=>e[r]--:(e,r)=>--e[r]),15,"!",15,e=>!e,"*",13,(e,r)=>e*r,"/",13,(e,r)=>e/r,"%",13,(e,r)=>e%r];[o,l,d,...a]=a,o;)g(o,l,d);

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

const direct = {
  processCallback(instance, parts, state) {
    if (!state) return
    for (const part of parts) if (part.expression in state) part.value = state[part.expression];
  }
},

combine = (...processors) => ({
  createCallback: (a,b,c) => processors.map(p => p.createCallback?.(a,b,c)),
  processCallback: (a,b,c) => processors.map(p => p.processCallback?.(a,b,c))
}),

expressions = {
  createCallback(el, parts, state) {
    for (const part of parts) part.evaluate = n(part.expression);
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
};

const ELEMENT = 1, TEXT = 3,

Parts = (node, params={}, processor=direct) => {
  let parts = collectParts(node),
      // throttled for batch update
      planned,
      update = () => !planned && ( planned = Promise.resolve().then(() => (planned = null, processor.processCallback?.(node, parts, params))) );

  processor.createCallback?.(node, parts, params);
  processor.processCallback?.(node, parts, params);

  return new Proxy(params,  {
    set: (state, k, v) => (state[k] = v, update()),
    deleteProperty: (state,k) => (delete state[k], update())
  })
},

collectParts = (element, parts=[]) => {
  for (let attr of element.attributes || []) {
    if (attr.value.includes('{{')) {
      let setter = { element, attr, parts: [] };
      for (let [type, value] of parse(attr.value))
        if (!type) setter.parts.push(value);
        else value = new AttributeTemplatePart(setter, value), setter.parts.push(value), parts.push(value);
      attr.value = setter.parts.join('');
    }
  }

  for (let node of element.childNodes) {
    if (node.nodeType === ELEMENT) collectParts(node, parts);
    else if (node.nodeType === TEXT && node.data.includes('{{')) {
      let setter = { parentNode: element, parts: [] };
      for (let [type, value] of parse(node.data.trim()))
        if (!type) setter.parts.push(new Text(value));
        else value = new NodeTemplatePart(setter, value), setter.parts.push(value), parts.push(value);
      node.replaceWith(...setter.parts.flatMap(part => part.replacementNodes || [part]));
    }
  }

  return parts
};

export { AttributeTemplatePart, NodeTemplatePart, TemplateInstance, TemplatePart, combine, Parts as default, direct, expressions, reactivity };
