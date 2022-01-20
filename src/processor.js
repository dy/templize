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

// expressions processor
export const states = new WeakMap,
  registry = new FinalizationRegistry(([obs, k]) => (obs[k]?.(), delete obs[k]))

export default {
  createCallback(el, allParts, init) {
    if (states.get(el)) return

    let parts = {}, // parts by ids used in parts
        values = {}, // template values state
        observers = {}, // observable properties in state
        part, ready, value

    // detect prop → part
    for (part of allParts) (part.evaluate = parseExpr(part.expression)).args.map(arg => (parts[arg]||=[]).push(part))

    // hook up observables
    for (let k in init) {
      if (observable(value = init[k]))
        observers[k] = sube(value, v => (values[k] = v, ready && this.processCallback(el, parts[k], {[k]: v}))),
      registry.register(value, [observers, k])
      else values[k] = value
    }

    // initial state inits all parts
    ready = true, states.set(el, [values, observers])
  },

  // updates diff parts from current state
  processCallback(el, parts, state) {
    let [values, observers] = states.get(el), k, part, v

    for (k in state) if (!observers[k]) values[k] = state[k] // extend state ignoring reactive vals
    // Object.assign(values, state)

    for (part of parts)
      if ((v = part.evaluate(values)) !== part.value) {
        // apply functional or other setters
        if (part.attributeName && part.setter.parts.length === 1) prop(part.element, part.attributeName, part.value = v)
        else part.value = v
      }
  }
}



