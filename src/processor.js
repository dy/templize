// expression processor
import parse from './lib/subscript.js'
import { sube, observable } from './lib/sube.js'

export const defaultProcessor = {
  processCallback(instance, parts, state) {
    if (!state) return
    for (const part of parts) if (part.expression in state) part.value = state[part.expression]
  }
},

combineProcessor = (...processors) => ({
  createCallback: (a,b,c) => processors.map(p => p.createCallback?.(a,b,c)),
  processCallback: (a,b,c) => processors.map(p => p.processCallback?.(a,b,c))
}),

expressionProcessor = {
  createCallback(el, parts, state) {
    for (const part of parts) part.evaluate = parse(part.expression)
  },
  processCallback(el, parts, state) {
    for (const part of parts) part.value = part.evaluate(state)
  }
},

reactiveProcessor = {
  createCallback(el, parts, state, subs=[]) {
    // we have to convert reactive state values into real ones
    for (const k in state) if (observable(state[k])) subs.push(sube(state[k], v => state[k] = v)), state[k] = null
  }
}
