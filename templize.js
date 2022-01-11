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
    this.#nodes = updateNodes(this.parentNode, this.#nodes, nodes, this.nextSibling);
  }
  replaceHTML(html) {
    const fragment = this.parentNode.cloneNode();
    fragment.innerHTML = html;
    this.replace(fragment.childNodes);
  }
}

const ELEMENT = 1, TEXT = 3, STRING = 0, PART = 1,
      mem = {},
      tabular = ['caption','colgroup','thead','tbody','tfoot','tr'].map(e=>e+':empty')+'';

// collect element parts
const parse = (element, parts=[]) => {
  let attr, node, setter, type, value, table, lastParts, slot, slots;

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
    else if (node.nodeType === TEXT && node.data.includes('{{')) {
      setter = { parentNode: element, parts: [] };
      for ([type, value] of tokenize(node.data.trim()))
        if (!type) setter.parts.push(new Text(value));
        else value = new NodeTemplatePart(setter, value), setter.parts.push(value), parts.push(value);

      // AD-HOC: {{rows}}<table></table> → <table>{{ rows }}</table>
      // logic: for every empty node in a table there is meant to be part before the table.
      // NOTE: it doesn't cover all possible insertion cases, but the core ones.
      // TODO: it can be extended to detect on the moment of insertion, but it still won't be complete
      //
      if ((table = node.nextSibling)?.tagName === 'TABLE') {
        slots = table.matches(':empty') ? [table] : table.querySelectorAll(tabular);
        for (lastParts = []; lastParts.length < slots.length && setter.parts[setter.parts.length - 1] instanceof NodeTemplatePart;)
          lastParts.push(setter.parts.pop());

        for (slot of slots) {
          if (lastParts.length)
            parts.pop(), setter.parts.pop(),
            slot.appendChild(new Text(`{{ ${ lastParts.pop().expression } }}`)),
            setter.parts.push(new Text); // we have to stub removed field to keep children count
        }
      }

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

var index = (node, params, processor=values) => {
  let parts = parse(node),
      planned,
      // throttled for batch update
      update = () => {
        if (!planned) {
          processor.processCallback(node, parts, params); // first set is immediate
          planned = Promise.resolve().then(() => (
            planned = null, processor.processCallback(node, parts, params)
          )); // rest is throttled
        }
      };

  params ||= {};

  processor.createCallback?.(node, parts, params);
  processor.processCallback(node, parts, params);

  return new Proxy(params,  {
    set: (state, k, v) => (state[k] = v, update(), 1),
    deleteProperty: (state,k) => (delete state[k], update())
  })
};

export { AttributeTemplatePart, NodeTemplatePart, TemplateInstance, TemplatePart, index as default, values };
