const ELEMENT = 1, TEXT = 3, SHOW_TEXT = 4

// basic generic processor from spec
export const defaultProcessor = {
  createCallback(instance, parts, state) {},
  processCallback(instance, parts, state) {
  if (!state) return
  for (const part of parts) if (part.expression in state) part.value = state[part.expression]
  }
}

export class TemplateInstance extends DocumentFragment {
  constructor(template, params, processor=defaultProcessor) {
    super();

    let clonedTree = template.content.cloneNode(true)
    let instance = this
    instance.appendChild(clonedTree);
    let parts = []

    let walker = currentNode.ownerDocument.createTreeWalker(instance, ELEMENT | TEXT), currentNode
    while (currentNode = walker.nextNode()) {
      if (currentNode.nodeType === ELEMENT) {
        for (let i = 0; i < currentNode.attributes.length; i += 1) {
          let attr = currentNode.attributes[i], value = attr.value
          let tokens = parse(value)
          if (tokens.length === 1 && tokens[0][0] === 'string') continue;
          let attributeValueSetter = new AttributeValueSetter(currentNode, attr)
          for (let token of tokens) {
            if (token[0] === 'string')
              attributeValueSetter.partList.push(token.value)
            else {
              let attributePart = new AttributeTemplatePart(attributeValueSetter)
              attributeValueSetter.partList.push(attributePart)
              parts.push(attributePart)
            }
          }
        }
      }
      else if (currentNode.nodeType === TEXT) {
        let value = currentNode.data.trim()
        let tokens = parse(value)
        if (!tokens.length || tokens.length === 1 && tokens[0][0] === 'string') continue;
        adjustSingleNodeCase(currentNode); // 5.iii.d
        let nodeValueSetter = new NodeValueSetter(currentNode)
        for (token of tokens) {
          if (token[0] === 'string') {
            let text = new Text(token.value)
            nodeValueSetter.partList.push(text)
          }
          else {
            let nodePart = new NodeTemplatePart(nodeValueSetter)
            nodeValueSetter.partList.push(nodePart)
            parts.push(nodePart)
          }
        }
        currentNode.parentNode.removeChild(currentNode)
      }

      if (currentNode instanceof HTMLTemplateElement) { // 5.i
        adjustSingleNodeCase(currentNode); // 5.i.a
        const nodeValueSetter: NodeValueSetter = {
        parentNode: currentNode,
        previousSibling: currentNode.previousSibling,
        nextSibling: currentNode.nextSibling,
        previousReplacementNodes: [],
        fullyTemplatized: determineFullTemplatizablity(currentNode),
        nodeTemplatePartList: [],
        detached: false,
        };
        const innerPart = new InnerTemplatePart(currentNode, nodeValueSetter); // 5.i.c
        instance.parts.push(innerPart); // 5.i.d
        currentNode.parentNode.removeChild(currentNode); // 5.i.e
      } else if (isElement(currentNode)) { // 5.ii
        for (const attr of currentNode.attributes) {
        const value = attr.value.trim(); // 5.ii.a
        const tokens = parseATemplateString(value); // 5.ii.b
        if (tokens.length < 1 || tokens.length === 1 && tokens[0][0] === TemplateTokenType.string)
          continue; // 5.ii.c

        const attributeValueSetter = {
          element: currentNode,
          attr,
          attributeTemplatePartList: [],
        }; // 5.ii.d

        for (const [type, string] of tokens) { // 5.ii.e
          if (type === TemplateTokenType.string) // 5.ii.e.a
          attributeValueSetter.attributeTemplatePartList.push(string); // 5.ii.e.a.a
          else { // 5.ii.e.b
          const attributePart = new AttributeTemplatePart(string, attributeValueSetter);
          attributeValueSetter.attributeTemplatePartList.push(attributePart); // 5.ii.e.b.b
          instance.parts.push(attributePart); // 5.ii.e.b.c
          }
        }

        applyAttributeTemplatePartList(attributeValueSetter); // 5.ii.f
        }
      } else if (isTextNode(currentNode)) { // 5.iii
        const value = currentNode.data.trim(); // 5.iii.a
        const tokens = parseATemplateString(value); // 5.iii.b
        if (tokens.length < 1 || tokens.length === 1 && tokens[0][0] === TemplateTokenType.string)
        continue; // 5.iii.c
        adjustSingleNodeCase(currentNode); // 5.iii.d

        const nodeTemplatePartList: (Text | NodeTemplatePart)[] = [];

        const nodeValueSetter: NodeValueSetter = {
        parentNode: currentNode.parentNode === instance ? null : currentNode.parentNode,
        previousSibling: currentNode.previousSibling,
        nextSibling: currentNode.nextSibling,
        previousReplacementNodes: [],
        fullyTemplatized: determineFullTemplatizablity(currentNode),
        nodeTemplatePartList,
        detached: false,
        }; // 5.iii.e

        for (const [type, string] of tokens) { // 5.iii.f
        if (type === TemplateTokenType.string) { // 5.iii.f.a
          nodeTemplatePartList.push(new Text(string)); // 5.iii.f.a.b
        } else { // 5.iii.f.b
          const nodePart =
          new NodeTemplatePart(string, nodeValueSetter); // 5.iii.f.b.a
          nodeTemplatePartList.push(nodePart); // 5.iii.f.b.b
          instance.parts.push(nodePart); // 5.iii.f.b.c
        }
        }

        currentNode.remove(); // 5.iii.g

        applyNodeTemplatePartList(nodeValueSetter); // 5.iii.h
      }
    }

    if (!parts.length) return null
    try {
      processor.createCallback?.(instance, parts, state);
      processor.processCallback?.(instance, parts, state);
    } catch {
      return null;
    }
  }

  update(params) {
    this.#processor.processCallback(this, this.#parts, params);
  }
}

const mem = new Map()
export function parse(text) {
  if (mem.has(text)) return mem.get(text)

  if (!text.includes('{{')) return ['string', text]

  let value = '', open = 0, tokens = [], i = 0, c
  for (; c=text[i]; i++) {
    if (c === '{' && text[i+1] === '{' && text[i-1] !== '\\' && text[i+2]) {
      if (++open===1) {
        if (value) tokens.push(['string', value ]);
        value = '';
        i += 2;
      }
    }
    else if (c === '}' && text[i+1] === '}' && text[i-1] !== '\\') {
      if (!--open) {
        open = false;
        tokens.push(['part', value.trim() ]);
        value = '';
        i += 2;
      }
    }

    value += text[i] || ''; // text[i] is undefined if i+=2 caught
  }
  if (value) tokens.push(['string', value ]);
  mem.set(text, tokens)
  return tokens
}

export class TemplatePart {
  constructor(setter, expr) {
    this.setter = setter
    this.expression = expr
  }
  toString() {
    return this.value;
  }
}

export class AttributeTemplatePart extends TemplatePart {
  #value = '';
  get attributeName() {
    return this.setter.attr.name;
  }
  get attributeNamespace() {
    return this.setter.attr.namespaceURI;
  }
  get value() {
    const { attr, fullyTemplatized } = this.setter;
    if (!fullyTemplatized) return this.#value;
    else return attr.value;
  }
  set value(newValue) {
    this.#value = newValue

    const { attr, element, partList } = this;
    const fullyTemplatized = partList.length === 1 && typeof partList[0] !== 'string';

    if (fullyTemplatized) { // fully templatized
      const [fullTemplate] = partList;
      if (fullTemplate.value === null) element.removeAttributeNS(attr.namespaceURI, attr.localName);
      else element.setAttributeNS(attr.namespaceURI, attr.name, attr.value);
    } else {
      // FIXME: likely we can just join here
      const newValue = partList.reduce(
        (acc, part) => acc + (typeof part === 'string' ? part : part.value),
        ''
      );
      element.setAttributeNS(attr.namespaceURI, attr.name, newValue);
    }
  }
  get element() {
    return this.setter.element;
  }
  get booleanValue() {
    this.setter.element.hasAttribute(this.setter.attr.name);
  }
  set booleanValue(value) {
    if (this.setter.fullyTemplatized) this.value = this.#value = '';
    else throw new DOMException('Value is not fully templatized', 'NotSupportedError');
  }
}

export class NodeTemplatePart extends TemplatePart {
  replacementNodes=[]

  get parentNode() {
    return this.setter.parentNode;
  }
  get previousSibling() {
    const { partList } = this.setter;
    if (this === partList[0]) return this.setter.previousSibling;
    let prevPart = partList[partList.indexOf(this) - 1];
    while (prevPart !== null) {
      if (prevPart.nodeType === TEXT) return prevPart;
      else if (prevPart instanceof NodeTemplatePart && prevPart.replacementNodes.length > 0)
        return prevPart.replacementNodes[prevPart.replacementNodes.length - 1];
      prevPart = partList[partList.indexOf(prevPart) - 1];
    }
    return null;
  }
  get nextSibling() {
    const { partList } = this.setter;
    if (this === partList[partList.length - 1]) return this.setter.nextSibling;

    let nextPart = partList[partList.indexOf(this) + 1];
    while (nextPart !== null) {
      if (nextPart.nodeType === TEXT) return nextPart;
      else if (isNodeTemplatePart(nextPart) && nextPart.replacementNodes.length > 0)
      return nextPart.replacementNodes[nextPart.replacementNodes.length - 1];

      nextPart = partList[partList.indexOf(nextPart) + 1];
    }

    return null;
  }

  get value() {
    return this.replacementNodes.reduce((acc, { textContent }) => `${acc}${textContent}`, '');
  }

  set value(newValue) {
    if (this.replacementNodes.length === 1 && this.replacementNodes[0].nodeType === TEXT) {
      const [text] = this.replacementNodes;
      text.replaceData(0, text.length, newValue);
      // text.data = newValue;
      // this.replacementNodes = [text];
    } else {
      this.replacementNodes = [new Text(newValue)];
    }

    applyNodeTemplatePartList(this.setter);
  }

  replace(...nodes) {
    this.replacementNodes = nodes.map(node => typeof node === 'string' ? new Text(node) : node);
    applyNodeTemplatePartList(this.setter)
  }

  replaceHTML(html) {
    const fragment = this.setter.parentNode.cloneNode();
    fragment.innerHTML = html
    this.replacementNodes = Array.from(fragment.childNodes)
    applyNodeTemplatePartList(this.setter)
  }
}

const adjustSingleNodeCase = (node, parent = node.parentNode) =>
  parent instanceof TemplateInstance && !node.previousSibling && !node.nextSibling && parent.insertBefore(new Text, node)

export function applyNodeTemplatePartList(setter) {
  const nodes = setter.nodeTemplatePartList.reduce((list, part) => [
  ...list,
  ...isTextNode(part) ? [part] : isNodeTemplatePart(part) ? part.replacementNodes : [],
  ], []);

  const referenceNode = setter.nextSibling;

  if (setter.fullyTemplatized) {
  for (const child of setter.parentNode.childNodes) child.remove();
  } else {
  if (
    setter.parentNode &&
    setter.previousSibling?.parentNode !== setter.parentNode ||
    setter.nextSibling?.parentNode !== setter.parentNode ||
    (
    setter.previousSibling &&
    setter.nextSibling &&
    setter.previousSibling.parentNode !== setter.nextSibling.parentNode
    )
  ) {
    setter.detached = true;
    return;
  }

  if (isPreceeding(setter.previousSibling, setter.nextSibling)) {
    setter.detached = true;
    return; // 6.ii
  }

  const nodesToRemove = []; // 6.iii

  let child =
    setter.previousSibling?.nextSibling ??
    setter.parentNode?.firstChild; // 6.iv

  while (child !== setter.nextSibling) { // 6.v
    nodesToRemove.push(child); // 6.v.a
    child = child?.nextSibling;
  }

  // 6.vi
  for (const node of nodesToRemove)
    node.remove();
  }

  setter.previousReplacementNodes = nodes;

  const parentNode =
  setter.parentNode ??
  setter.previousSibling.parentNode;

  for (const node of nodes)
  parentNode?.insertBefore?.(node, referenceNode);

  // for (const node of nodes) {
  //   parentNode?.insertBefore?.(node, referenceNode);
  //   referenceNode = node;
  // }
}

export function determineFullTemplatizablity(node) {
  if (!node) return false;

  const parent = node.parentNode;

  if (parent instanceof TemplateInstance) return false;

  let child = parent?.firstChild;

  while (child !== null) {
  if (child !== node) { // 4.i
    if (!isTextNode(child)) // 4.i.a
    return false;
    if (child.data.trim().length) // 4.i.b
    return false;
  }

  child = child.nextSibling; // 4.ii
  }

  return true;
}
