import parse from './parse.js'
import {NodePart, AttrPart} from './api.js'

const ELEMENT = 1, TEXT = 3, PART = 0,

defaultProcessor = {
  processCallback(instance, parts, state) {
    if (!state) return
    for (const part of parts) if (part.expression in state) part.value = state[part.expression]
  }
},

elParams = (node, params, processor=defaultProcessor) => {
  let parts = collectParts(node),
      create = processor.create || processor.createCallback,
      process = processor.call ? processor : processor.process || processor.processCallback

  create?.(node, parts, params),
  params && process?.(node, parts, params)

  return {
    parts,
    params,
    update: state => Object.assign(params, state) && process(node, parts, state)
  }
},

collectParts = (element, parts=[]) => {
  for (let attr of element.attributes) {
    if (attr.value.includes('{{')) {
      let setter = { element, attr, parts: [] }
      for (let [type, value] of parse(attr.value))
        if (type) setter.parts.push(value)
        else value = new AttrPart(setter, value), setter.parts.push(value), parts.push(value)
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
        else value = new NodePart(setter, value), setter.parts.push(value), parts.push(value)
      node.replaceWith(...setter.parts)
    }
  }

  return parts
}

export default elParams
