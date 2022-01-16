import updateNodes from 'swapdom';
import parseExpr from 'subscript';
import sube, { observable } from 'sube';
import { prop } from 'element-props';

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
    this.#nodes = updateNodes(this.parentNode, this.#nodes, nodes, this.nextSibling);
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

// extend default subscript
// ?:
parseExpr.set(':', 3.1, (a,b) => [a,b]);
parseExpr.set('?', 3, (a,b) => a ? b[0] : b[1]);

// literals
parseExpr.set('true', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>true });
parseExpr.set('false', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>false });

// a?.b - optional chain operator
parseExpr.set('?.',18, (a,b,aid,bid) => a?.[bid]);

// a | b - pipe overload
parseExpr.set('|', 6, (a,b) => b(a));

Symbol.dispose||=Symbol('dispose');

// expressions processor
const states = new WeakMap;
var processor = {
  createCallback(el, parts, init) {
    if (states.get(el)) return

    for (const part of parts) part.evaluate = parseExpr(part.expression);

    // we have to cover reactive state values with real ones
    let unsub = [], source, state = Object.create(init);

    // FIXME: make weakrefs here to avoid dispose?
    for (const k in init)
      if (observable(source = init[k])) {
        unsub.push(sube(source, v => (
            init ? state[k] = v : this.processCallback(el, parts, {[k]: v})
          )
        ));
      }

    init = null, states.set(el, state);
  },

  processCallback(el, parts, diff) {
    // reactive parts can update only fraction of state
    // we also allow modifying state during the init stage, but apply parts only after init
    let newValue, state = Object.assign(states.get(el), diff);
    for (const part of parts) {
      if ((newValue = part.evaluate(state)) !== part.value) {
        // apply functional or other setters
        if (part.attributeName && part.setter.parts.length === 1) prop(part.element, part.attributeName, part.value = newValue);
        else part.value = newValue;
      }
    }
  }
};

var index = (node, params, proc=processor) => {
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
