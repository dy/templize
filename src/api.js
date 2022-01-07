// minimal Template Instance API surface
// https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md#32-template-parts-and-custom-template-process-callback
import updateNodes from './lib/diff.js'
import { parse } from './parse.js'
import { direct } from './processor.js'

export class TemplateInstance extends DocumentFragment {
  #parts
  #processor
  constructor(template, params, processor=direct) {
    super()
    this.appendChild(template.content.cloneNode(true))
    this.#parts = parse(this)
    this.#processor = processor
    processor.createCallback?.(this, this.#parts, params)
    processor.processCallback?.(this, this.#parts, params)
  }
  update(params) { this.#processor.processCallback?.(this, this.#parts, params) }
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
  get value() { return this.#nodes.map(node=>node.textContent).join(''); }
  set value(newValue) { this.replace(newValue) }
  replace(...nodes) { // replace current nodes with new nodes.
    nodes = nodes.length ? nodes.flatMap(node => node.forEach ? [...node] : node.trim ? [new Text(node)] : [node]) : [new Text]
    this.#nodes = updateNodes(this.parentNode, this.#nodes, nodes, this.nextSibling)
  }
  replaceHTML(html) {
    const fragment = this.parentNode.cloneNode()
    fragment.innerHTML = html;
    this.replace(fragment.childNodes);
  }
}
