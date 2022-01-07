import { NodeTemplatePart, AttributeTemplatePart } from './api.js'

const ELEMENT = 1, TEXT = 3,
      mem = {}, STRING = 0, PART = 1

// collect element parts
export const parse = (element, parts=[]) => {
  for (let attr of element.attributes || []) {
    if (attr.value.includes('{{')) {
      let setter = { element, attr, parts: [] }
      for (let [type, value] of tokenize(attr.value))
        if (!type) setter.parts.push(value)
        else value = new AttributeTemplatePart(setter, value), setter.parts.push(value), parts.push(value)
      attr.value = setter.parts.join('')
    }
  }

  for (let node of element.childNodes) {
    if (node.nodeType === ELEMENT) parse(node, parts)
    else if (node.nodeType === TEXT && node.data.includes('{{')) {
      let setter = { parentNode: element, parts: [] }
      for (let [type, value] of tokenize(node.data.trim()))
        if (!type) setter.parts.push(new Text(value))
        else value = new NodeTemplatePart(setter, value), setter.parts.push(value), parts.push(value)
      node.replaceWith(...setter.parts.flatMap(part => part.replacementNodes || [part]))
    }
  }

  return parts
},

// parse string with template fields
tokenize = (text) => {
  let value = '', open = 0, tokens = mem[text], i = 0, c

  if (tokens) return tokens; else tokens = []

  for (; c=text[i]; i++) {
    if (c === '{' && text[i+1] === '{' && text[i-1] !== '\\' && text[i+2]) {
      if (++open===1) {
        if (value) tokens.push([STRING, value ]);
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
  if (value) tokens.push([STRING, value ]);

  return mem[text] = tokens
}

