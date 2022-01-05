const ELEMENT = 1, TEXT = 3, PART = 0

const parts = (node, state, processor=defaultProcessor) => {
  let parts = collectParts(node, []),
      create = processor.create || processor.createCallback,
      proc = processor.process || processor.processCallback

  create?.(instance, parts, state),
  proc?.(instance, parts, state)

  return { update: state => proc(instance, parts, state) }
}

// this is simplified template instance algo
// ref: https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md#43-creating-template-parts
const collectParts = (element, parts) => {
  for (let attr of element.attributes) {
    if (attr.value.includes('{{')) {
      let setter = { element, attr, parts: [] }
      for (let [type, value] of parse(attr.value))
        if (type) setter.parts.push(value)
        else value = new AttributeTemplatePart(setter, value), setter.parts.push(value), parts.push(value)
      attr.value = setter.parts.join('')
    }
  }

  for (let node of element.childNodes) {
    if (node.nodeType === ELEMENT) collectParts(node, parts)
    else if (node.nodeType === TEXT && node.data.includes('{{')) {
      let setter = {
        parentNode: element,
        previousSibling: node.previousSibling,
        nextSibling: node.nextSibling,
        parts: []
      };
      for (const [type, value] of parse(node.data.trim()))
        if (type) value = new Text(value), setter.parts.push(value)
        else value = new NodeTemplatePart(setter, value), setter.parts.push(value), parts.push(value)
      node.replaceWith(...setter.parts)
    }
  }
  return parts
}

const mem = {}
const parse = (text) => {
  let value = '', open = 0, tokens = mem[text], i = 0, c

  if (tokens) return tokens; else tokens = []

  for (; c=text[i]; i++) {
    if (c === '{' && text[i+1] === '{' && text[i-1] !== '\\' && text[i+2]) {
      if (++open===1) {
        if (value) tokens.push([TEXT, value ]);
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
  if (value) tokens.push([TEXT, value ]);

  return mem[text] = tokens
}


// minimal Template Instance API surface
export class TemplatePart {
  constructor(setter, expr) { this.setter = setter, this.expression = expr }
  toString() { return this.value; }
}

export class AttributeTemplatePart extends TemplatePart {
  #value = '';
  get attributeName() { return this.setter.attr.name; }
  get attributeNamespace() { return this.setter.attr.namespaceURI; }
  get element() { return this.setter.element; }
  get value() { return this.#value; }
  set value(newValue) {
    this.#value = newValue
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
    else throw new DOMException('Value is not fully templatized', 'NotSupportedError');
  }
}

export class NodeTemplatePart extends TemplatePart {
  nodes = []
  get parentNode() { return this.setter.parentNode; }
  get nextSibling() { return this.nodes[this.nodes.length-1].nextSibling; }
  get previousSibling() { return this.nodes[0].previousSibling; }
  get value() { return this.nodes.map(node=>node.textContent).join(''); }
  // FIXME: should we allow setting an array?
  set value(newValue) { this.replace(newValue) }
  replace(...nodes) { // replace current nodes with new nodes.
    nodes = (nodes||[new Text]).map(node => typeof node === 'string' ? new Text(node) : node);
    this.nodes = updateNodes(this.setter.parentNode, this.nodes, nodes, this.setter.nextSibling)
  }
}

// Algo from proposal is slower than spect implementation
// spec ref: https://github.com/bennypowers/template-instantiation-polyfill/blob/main/concepts/applyNodeTemplatePartList.ts
// spect ref: https://github.com/spectjs/spect/blob/master/test/libs/spect-inflate.js
const updateNodes = (parent, a, b, end = null) => {
  let i = 0, cur, next, bi, n = b.length, m = a.length

  // skip head/tail
  while (i < n && i < m && a[i] == b[i]) i++
  while (i < n && i < m && b[n-1] == a[m-1]) end = b[--m, --n]

  // append/prepend/trim shortcuts
  if (i == m) while (i < n) parent.insertBefore(b[i++], end)
  else {
    cur = a[i]
    while (i < n) {
      bi = b[i++], next = cur ? cur.nextSibling : end
      if (cur == bi) cur = next // skip
      else if (i < n && b[i] == next) (parent.replaceChild(bi, cur), cur = next) // swap / replace
      else parent.insertBefore(bi, cur) // insert
    }
    while (cur != end) (next = cur.nextSibling, parent.removeChild(cur), cur = next) // remove tail
  }

  return b
}

// generic processor from spec
export const defaultProcessor = {
  createCallback(instance, parts, state) {},
  processCallback(instance, parts, state) {
    if (!state) return
    for (const part of parts) if (part.expression in state) part.value = state[part.expression]
  }
}
