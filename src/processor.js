import parse from 'subscript'
import sube, { observable } from 'sube'
import { prop } from 'element-props'

// extend default subscript
// ?:
parse.set(':', 3.1, (a,b) => [a,b])
parse.set('?', 3, (a,b) => a ? b[0] : b[1])

// literals
parse.set('true', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>true })
parse.set('false', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>false })

// a?.b - optional chain operator
parse.set('?.',18, (a,b,aid,bid) => a?.[bid])

// a | b - pipe overload
parse.set('|', 6, (a,b) => b(a))

Symbol.dispose||=Symbol('dispose')

// expressions processor
const states = new WeakMap
export default {
  createCallback(el, parts, init) {
    const state = {...init, _init: false}
    states.set(el, state)

    for (const part of parts) (part.evaluate = parse(part.expression))

    // we have to convert reactive state values into real ones
    let unsub = [], source

    // FIXME: make weakrefs here to avoid dispose?
    for (const k in state) if (observable(source = state[k])) {
      state[k] = '',
      unsub.push(sube(source, v => (
          this.processCallback(el, parts, {[k]: v})
        )
      ))
    }

    state._init = true
  },

  processCallback(el, parts, diff) {
    // reactive parts can update only fraction of state
    // we also allow modifying state during the init stage, but apply parts only after init
    let newValue, state = Object.assign(states.get(el), diff)
    if (!state._init) return
    for (const part of parts) {
      if ((newValue = part.evaluate(state)) !== part.value) {
        // apply functional or other setters
        if (part.attributeName && part.setter.parts.length === 1) prop(part.element, part.attributeName, part.value = newValue)
        else part.value = newValue
      }
    }
  }
}
