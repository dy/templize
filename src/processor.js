import parseExpr from 'subscript'
import sube, { observable } from 'sube'
import { prop } from 'element-props'

// TODO: extend subscript strings
// const escape = {n:'\n', r:'\r', t:'\t', b:'\b', f:'\f', v:'\v'},
//   string = q => (qc, c, str='') => {
//     qc && err('Unexpected string') // must not follow another token
//     while (c=cur.charCodeAt(idx), c-q) {
//       if (c === BSLASH) skip(), c=skip(), str += escape[c] || c
//       else str += skip()
//     }
//     return skip()||err('Bad string'), () => str
//   }
// parseExpr.set('"', string(34))
// parseExpr.set("'", string(39))

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
export default {
  createCallback(el, allParts, init) {
    if (states.get(el)) return

    let parts = {}, // parts by ids used in parts
        values = {}, // template values state
        observers = {}, // observable properties in state
        part, k, value, ready

    // detect prop → part
    for (part of allParts) (part.evaluate = parseExpr(part.expression)).args.map(arg => (parts[arg]||=[]).push(part))

    // hook up observables
    Object.keys(init).map(k => {
      if (observable(value = init[k])) observers[k] = sube(value,
        v => (values[k] = v, ready && this.processCallback(el, parts[k], {[k]: v}))
      )
      else values[k] = value
    })

    // initial state inits all parts
    ready = true, states.set(el, [values, observers])
  },

  // updates diff parts from current state
  processCallback(el, parts, state) {
    let [values, obs] = states.get(el), k, part
    for (k in state) if (!obs[k]) values[k] = state[k] // extend state ignoring reactive vals
    for (part of parts) updatePart(part, values)
  }
}

const states = new WeakMap,

updatePart = (part, state, newValue) => {
  if ((newValue = part.evaluate(state)) !== part.value) {
    // apply functional or other setters
    if (part.attributeName && part.setter.parts.length === 1) prop(part.element, part.attributeName, part.value = newValue)
    else part.value = newValue
  }
}


