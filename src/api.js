// minimal Template Instance API surface
import updateNodes from './diff.js'

export class Part {
  constructor(setter, expr) { this.setter = setter, this.expression = expr }
  toString() { return this.value; }
}

export class AttrPart extends Part {
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

export class NodePart extends Part {
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
