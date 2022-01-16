import parseExpr from 'subscript'
import sube, { observable } from 'sube'
import { prop } from 'element-props'

// extend default subscript
// ?:
parseExpr.set(':', 3.1, (a,b) => [a,b])
parseExpr.set('?', 3, (a,b) => a ? b[0] : b[1])

// literals
parseExpr.set('true', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>true })
parseExpr.set('false', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>false })

// a?.b - optional chain operator
parseExpr.set('?.',18, (a,b,aid,bid) => a?.[bid])

// a | b - pipe overload
parseExpr.set('|', 6, (a,b) => b(a))

Symbol.dispose||=Symbol('dispose')

// expressions processor
const states = new WeakMap
export default {
  createCallback(el, parts, init) {
    if (states.get(el)) return

    for (const part of parts) part.evaluate = parseExpr(part.expression)

    // we have to cover reactive state values with real ones
    let unsub = [], source, state = Object.create(init)

    // FIXME: make weakrefs here to avoid dispose?
    for (const k in init)
      if (observable(source = init[k])) {
        unsub.push(sube(source, v => (
            init ? state[k] = v : this.processCallback(el, parts, {[k]: v})
          )
        ))
      }

    init = null, states.set(el, state)
  },

  processCallback(el, parts, diff) {
    // reactive parts can update only fraction of state
    // we also allow modifying state during the init stage, but apply parts only after init
    let newValue, state = Object.assign(states.get(el), diff)
    for (const part of parts) {
      if ((newValue = part.evaluate(state)) !== part.value) {
        // apply functional or other setters
        if (part.attributeName && part.setter.parts.length === 1) prop(part.element, part.attributeName, part.value = newValue)
        else part.value = newValue
      }
    }
  }
}
