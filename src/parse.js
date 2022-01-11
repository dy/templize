import { NodeTemplatePart, AttributeTemplatePart } from './api.js'

const ELEMENT = 1, TEXT = 3, STRING = 0, PART = 1,
      mem = {},
      tabular = ['caption','colgroup','thead','tbody','tfoot','tr'].map(e=>e+':empty')+''

// collect element parts
export const parse = (element, parts=[]) => {
  let attr, node, setter, type, value, table, lastParts, slot, slots

  for (attr of element.attributes || []) {
    if (attr.value.includes('{{')) {
      setter = { element, attr, parts: [] }
      for ([type, value] of tokenize(attr.value))
        if (!type) setter.parts.push(value)
        else value = new AttributeTemplatePart(setter, value), setter.parts.push(value), parts.push(value)
      attr.value = setter.parts.join('')
    }
  }

  for (node of element.childNodes) {
    if (node.nodeType === ELEMENT) parse(node, parts)
    else if (node.nodeType === TEXT && node.data.includes('{{')) {
      setter = { parentNode: element, parts: [] }
      for ([type, value] of tokenize(node.data.trim()))
        if (!type) setter.parts.push(new Text(value))
        else value = new NodeTemplatePart(setter, value), setter.parts.push(value), parts.push(value)

      // AD-HOC: {{rows}}<table></table> → <table>{{ rows }}</table>
      // logic: for every empty node in a table there is meant to be part before the table.
      // NOTE: it doesn't cover all possible insertion cases, but the core ones.
      // TODO: it can be extended to detect on the moment of insertion, but it still won't be complete
      //
      if ((table = node.nextSibling)?.tagName === 'TABLE') {
        slots = table.matches(':empty') ? [table] : table.querySelectorAll(tabular)
        for (lastParts = []; lastParts.length < slots.length && setter.parts[setter.parts.length - 1] instanceof NodeTemplatePart;)
          lastParts.push(setter.parts.pop())
        for (slot of slots) if (lastParts.length)
          parts.pop(),
          setter.parts[setter.parts.length - 1] = new Text, // we have to stub removed field to keep children count
          slot.appendChild(new Text(`{{ ${ lastParts.pop().expression } }}`))
      }

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
}

