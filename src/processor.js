import parse from '../node_modules/subscript/subscript.js'
import sube, { observable } from '../node_modules/sube/sube.js'
import { prop } from '../node_modules/element-props/element-props.js'

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

// expressions processor
const _state = Symbol('params'), _init = Symbol('init')

Symbol.dispose||=Symbol('dispose')

export default {
  createCallback(el, parts, state) {
    el[_state] = state

    for (const part of parts) (part.evaluate = parse(part.expression))

    // we have to convert reactive state values into real ones
    let unsub = [], source

    for (const k in state) if (observable(source = state[k])) {
      state[k] = '',
      unsub.push(sube(source, v => (
          this.processCallback(el, parts, {[k]: v})
        )
      ))
    }

    // provide disposal
    const dispose = el[Symbol.dispose]
    el[Symbol.dispose] = () => (unsub.map(fn=>fn()), dispose?.())

    el[_init] = true
  },

  processCallback(el, parts, state, newValue) {
    // reactive parts can update only fraction of state
    // we also allow modifying state during the init stage, but apply parts only after init
    Object.assign(el[_state], state)
    if (!el[_init]) return
    for (const part of parts) {
      if ((newValue = part.evaluate(el[_state])) !== part.value) {
        // apply functional or other setters
        if (part.attributeName && part.setter.parts.length === 1) prop(part.element, part.attributeName, part.value = newValue)
        else part.value = newValue
      }
    }
  }
}
