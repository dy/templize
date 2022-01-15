// minimal Template Instance API surface
// https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md#32-template-parts-and-custom-template-process-callback
import updateNodes from '../node_modules/swapdom/swap-inflate.js'
import { parse } from './parse.js'

const values = {
  processCallback(instance, parts, state) {
    if (!state) return
    for (const part of parts) if (part.expression in state) part.value = state[part.expression]
  }
}

export class TemplateInstance extends DocumentFragment {
  #parts
  #processor
  constructor(template, params, processor=values) {
    super()
    this.appendChild(template.content.cloneNode(true))
    this.#parts = parse(this)
    this.#processor = processor
    params ||= {}
    processor.createCallback?.(this, this.#parts, params)
    processor.processCallback(this, this.#parts, params)
  }
  update(params) { this.#processor.processCallback(this, this.#parts, params) }
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
  // FIXME: not sure why do we need string serialization here
  get value() { return this.#nodes.map(node=>node.textContent).join(''); }
  set value(newValue) { this.replace(newValue) }
  replace(...nodes) { // replace current nodes with new nodes.
    nodes = nodes.length ? nodes.flatMap(node =>
      !node ? [new Text(node)] :
      node.forEach ? [...node] :
      node.nodeType ? [node] :
      [new Text(node)]
    ) : [new Text]
    this.#nodes = updateNodes(this.parentNode, this.#nodes, nodes, this.nextSibling)
  }
  replaceHTML(html) {
    const fragment = this.parentNode.cloneNode()
    fragment.innerHTML = html;
    this.replace(fragment.childNodes);
  }
}
