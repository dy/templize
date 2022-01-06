import parse from './parse.js'
import {NodePart, AttrPart} from './api.js'
import { defaultProcessor } from './processor.js'

const ELEMENT = 1, TEXT = 3,

Parts = (node, params, processor=defaultProcessor) => {
  let parts = collectParts(node),
      // throttled for batch update
      planned,
      update = () => !planned && ( planned = Promise.resolve().then(() => (planned = null, processor.processCallback?.(node, parts, params))) )

  processor.createCallback?.(node, parts, params)
  processor.processCallback?.(node, parts, params)

  return new Proxy(params,  {
    set: (state, k, v) => (state[k] = v, update()),
    deleteProperty: (state,k) => (delete state[k], update())
  })
},

collectParts = (element, parts=[]) => {
  for (let attr of element.attributes) {
    if (attr.value.includes('{{')) {
      let setter = { element, attr, parts: [] }
      for (let [type, value] of parse(attr.value))
        if (!type) setter.parts.push(value)
        else value = new AttrPart(setter, value), setter.parts.push(value), parts.push(value)
      attr.value = setter.parts.join('')
    }
  }

  for (let node of element.childNodes) {
    if (node.nodeType === ELEMENT) collectParts(node, parts)
    else if (node.nodeType === TEXT && node.data.includes('{{')) {
      let setter = { parentNode: element, parts: [] };
      for (const [type, value] of parse(node.data.trim()))
        if (!type) value = new Text(value), setter.parts.push(value)
        else value = new NodePart(setter, value), setter.parts.push(value), parts.push(value)
      node.replaceWith(...setter.parts)
    }
  }

  return parts
}

export default Parts
export * from './processor.js'
