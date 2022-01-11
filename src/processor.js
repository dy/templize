// expression processor
import parse from './lib/expressions.js'
import { sube, observable } from './lib/sube.js'

export const expressions = {
  createCallback(el, parts, state) {
    for (const part of parts) part.evaluate = parse(part.expression)
  },
  processCallback(el, parts, state) {
    for (const part of parts) part.value = part.evaluate(state)
  }
},

reactivity = {
  createCallback(el, parts, state, subs=[]) {
    // we have to convert reactive state values into real ones
    for (const k in state) if (observable(state[k])) subs.push(sube(state[k], v => state[k] = v)), state[k] = null
  }
},

combine = (...processors) => ({
  createCallback: (a,b,c) => processors.map(p => p.createCallback?.(a,b,c)),
  processCallback: (a,b,c) => processors.map(p => p.processCallback?.(a,b,c))
})
