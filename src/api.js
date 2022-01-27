// minimal Template Instance API surface
// https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md#32-template-parts-and-custom-template-process-callback
import updateNodes from 'swapdom'
import { parse } from './parse.js'

const FRAGMENT = 11

export const defaultProcessor = {
  processCallback(instance, parts, state) {
    if (!state) return
    for (const part of parts) if (part.expression in state) part.value = state[part.expression]
  }
},

// templize any element
templize = (node, state, proc=defaultProcessor) => {
  let parts = parse(node), params,
      update = diff => proc.processCallback(node, parts, diff)

  state ||= {}

  proc.createCallback?.(node, parts, state)
  proc.processCallback(node, parts, state)

  // return update via destructuring of result to allow batch-update
  state[Symbol.iterator] = function*(){ yield params; yield update;}

  return params = new Proxy(state,  {
    set: (s, k, v) => (state[k]=v, update(state), 1),
    deleteProperty: (s,k) => (delete state[k], update(), 1)
  })
}

// API
export class TemplateInstance extends DocumentFragment {
  constructor(template, params, processor=defaultProcessor) {
    super()
    this.appendChild(template.content.cloneNode(true))
    const [, update] = templize(this, params, processor)
    this.update = update
  }
}

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
    if (this.#value === newValue) return // save unnecessary call
    this.#value = newValue
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

export class NodeTemplatePart extends TemplatePart {
  #nodes = [new Text]
  get replacementNodes() { return this.#nodes }
  get parentNode() { return this.setter.parentNode; }
  get nextSibling() { return this.#nodes[this.#nodes.length-1].nextSibling; }
  get previousSibling() { return this.#nodes[0].previousSibling; }
  // FIXME: not sure why do we need string serialization here? Just because parent class has type DOMString?
  get value() { return this.#nodes.map(node=>node.textContent).join(''); }
  set value(newValue) { this.replace(newValue) }
  replace(...nodes) { // replace current nodes with new nodes.
    nodes = nodes.length ? nodes
      .flat()
      .flatMap(node =>
        node==null ? [new Text] :
        node.forEach ? [...node] :
        node.nodeType === FRAGMENT ? [...node.childNodes] :
        node.nodeType ? [node] :
        [new Text(node)]
      )
    : [new Text]
    this.#nodes = updateNodes(this.parentNode, this.#nodes, nodes, this.nextSibling)
  }
  replaceHTML(html) {
    const fragment = this.parentNode.cloneNode()
    fragment.innerHTML = html;
    this.replace(fragment.childNodes);
  }
}

export class InnerTemplatePart extends NodeTemplatePart {
  directive
  constructor(setter, template) {
    let directive = template.getAttribute('directive') || template.getAttribute('type'),
        expression = template.getAttribute('expression') || template.getAttribute(directive) || ''
    if (expression.startsWith('{{')) expression = expression.trim().slice(2,-2).trim()
    super(setter, expression)
    this.template = template
    this.directive = directive
  }
}
